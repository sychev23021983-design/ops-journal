from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import sqlite3, os, jwt, shutil
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel

DB_PATH      = os.getenv("DB_PATH",      "/app/data/ops.db")
SECRET_KEY   = os.getenv("SECRET_KEY",   "changeme-secret-key-2026")
ADMIN_PASSWORD  = os.getenv("ADMIN_PASSWORD",  "admin123")
UPLOAD_DIR   = "/app/data/uploads"

def get_conn():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    conn = get_conn()
    c = conn.cursor()
    c.executescript("""
        CREATE TABLE IF NOT EXISTS incidents (
            id                      INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at              TEXT NOT NULL,
            event_at                TEXT NOT NULL,
            incident_type           TEXT NOT NULL,
            description             TEXT,
            discovered_by           TEXT,
            employee_actions        TEXT,
            repair_request_filed    INTEGER DEFAULT 0,
            object_left_before_fix  INTEGER DEFAULT 0,
            object_under_guard      INTEGER DEFAULT 1,
            guard_response          TEXT,
            master_arrived_at       TEXT,
            response_time_min       INTEGER,
            guilty_party            TEXT NOT NULL,
            root_cause              TEXT,
            resolution              TEXT,
            resolved_at             TEXT,
            status                  TEXT NOT NULL DEFAULT 'new',
            priority                TEXT NOT NULL DEFAULT 'medium',
            notes                   TEXT
        );
        CREATE TABLE IF NOT EXISTS settings (
            key   TEXT PRIMARY KEY,
            value TEXT
        );
    """)
    existing = [row[1] for row in c.execute("PRAGMA table_info(incidents)").fetchall()]
    new_cols = {
        "employee_actions":       "TEXT",
        "repair_request_filed":   "INTEGER DEFAULT 0",
        "object_left_before_fix": "INTEGER DEFAULT 0",
        "object_under_guard":     "INTEGER DEFAULT 1",
        "master_arrived_at":      "TEXT",
    }
    for col, typedef in new_cols.items():
        if col not in existing:
            c.execute(f"ALTER TABLE incidents ADD COLUMN {col} {typedef}")
    # Default viewer password
    c.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('viewer_password', 'viewer123')")
    conn.commit()
    conn.close()

security = HTTPBearer()

def create_token(role: str):
    payload = {"exp": datetime.utcnow() + timedelta(days=30), "sub": role}
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def get_role(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    try:
        data = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        return data.get("sub", "viewer")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_admin(role: str = Depends(get_role)):
    if role != "admin":
        raise HTTPException(status_code=403, detail="Требуются права администратора")
    return role

class LoginRequest(BaseModel):
    password: str

class IncidentCreate(BaseModel):
    event_at: str
    incident_type: str
    description: Optional[str] = None
    discovered_by: Optional[str] = None
    employee_actions: Optional[str] = None
    repair_request_filed: Optional[bool] = False
    object_left_before_fix: Optional[bool] = False
    object_under_guard: Optional[bool] = True
    guard_response: Optional[str] = None
    master_arrived_at: Optional[str] = None
    response_time_min: Optional[int] = None
    guilty_party: str
    root_cause: Optional[str] = None
    resolution: Optional[str] = None
    resolved_at: Optional[str] = None
    status: str = "new"
    priority: str = "medium"
    notes: Optional[str] = None

class IncidentUpdate(IncidentCreate):
    pass

class SettingsUpdate(BaseModel):
    viewer_password: Optional[str] = None
    logo_size: Optional[str] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="OPS Journal", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static uploads
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ── Auth ──────────────────────────────────────────────────────────────────────

@app.post("/api/auth/login")
def login(req: LoginRequest):
    conn = get_conn()
    try:
        viewer_pwd = conn.execute("SELECT value FROM settings WHERE key='viewer_password'").fetchone()
        viewer_password = viewer_pwd["value"] if viewer_pwd else "viewer123"
    finally:
        conn.close()

    if req.password == ADMIN_PASSWORD:
        return {"token": create_token("admin"), "role": "admin"}
    elif req.password == viewer_password:
        return {"token": create_token("viewer"), "role": "viewer"}
    else:
        raise HTTPException(status_code=401, detail="Неверный пароль")

@app.get("/api/auth/me")
def me(role: str = Depends(get_role)):
    return {"role": role}

# ── Settings ─────────────────────────────────────────────────────────────────

@app.get("/api/settings")
def get_settings(_=Depends(require_admin)):
    conn = get_conn()
    try:
        rows = conn.execute("SELECT key, value FROM settings").fetchall()
        result = {r["key"]: r["value"] for r in rows}
        # Не отдаём пароли в открытом виде — только факт наличия
        if "viewer_password" in result:
            result["viewer_password_set"] = bool(result["viewer_password"])
            del result["viewer_password"]
        return result
    finally:
        conn.close()

@app.put("/api/settings")
def update_settings(data: SettingsUpdate, _=Depends(require_admin)):
    conn = get_conn()
    try:
        if data.viewer_password:
            conn.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('viewer_password', ?)",
                        (data.viewer_password,))
        if data.logo_size:
            conn.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('logo_size', ?)",
                        (data.logo_size,))
        conn.commit()
        return {"ok": True}
    finally:
        conn.close()

@app.post("/api/settings/upload/{file_type}")
async def upload_file(file_type: str, file: UploadFile = File(...), _=Depends(require_admin)):
    if file_type not in ("logo", "favicon"):
        raise HTTPException(400, "Тип файла должен быть logo или favicon")
    if not file.filename.lower().endswith(".png"):
        raise HTTPException(400, "Только PNG файлы")
    ext = "png"
    filename = f"{file_type}.{ext}"
    path = os.path.join(UPLOAD_DIR, filename)
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    conn = get_conn()
    try:
        conn.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
                    (f"{file_type}_url", f"/uploads/{filename}"))
        conn.commit()
    finally:
        conn.close()
    return {"url": f"/uploads/{filename}"}

@app.get("/api/settings/public")
def get_public_settings():
    """Публичные настройки — доступны без авторизации"""
    conn = get_conn()
    try:
        logo    = conn.execute("SELECT value FROM settings WHERE key='logo_url'").fetchone()
        favicon = conn.execute("SELECT value FROM settings WHERE key='favicon_url'").fetchone()
        size    = conn.execute("SELECT value FROM settings WHERE key='logo_size'").fetchone()
        return {
            "logo_url":    logo["value"]    if logo    else None,
            "favicon_url": favicon["value"] if favicon else None,
            "logo_size":   size["value"]    if size    else "32",
        }
    finally:
        conn.close()

# ── Incidents ─────────────────────────────────────────────────────────────────

@app.get("/api/incidents")
def list_incidents(
    month: Optional[str] = None,
    guilty_party: Optional[str] = None,
    incident_type: Optional[str] = None,
    status: Optional[str] = None,
    role: str = Depends(get_role)
):
    conn = get_conn()
    try:
        query = "SELECT * FROM incidents WHERE 1=1"
        params = []
        if month:
            query += " AND strftime('%Y-%m', event_at) = ?"
            params.append(month)
        if guilty_party:
            query += " AND guilty_party = ?"
            params.append(guilty_party)
        if incident_type:
            query += " AND incident_type = ?"
            params.append(incident_type)
        if status:
            query += " AND status = ?"
            params.append(status)
        query += " ORDER BY event_at DESC"
        return [dict(r) for r in conn.execute(query, params).fetchall()]
    finally:
        conn.close()

@app.post("/api/incidents", status_code=201)
def create_incident(data: IncidentCreate, role: str = Depends(get_role)):
    conn = get_conn()
    try:
        now = datetime.utcnow().isoformat()
        cur = conn.execute("""
            INSERT INTO incidents
            (created_at, event_at, incident_type, description, discovered_by,
             employee_actions, repair_request_filed, object_left_before_fix, object_under_guard,
             guard_response, master_arrived_at, response_time_min, guilty_party,
             root_cause, resolution, resolved_at, status, priority, notes)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (now, data.event_at, data.incident_type, data.description, data.discovered_by,
              data.employee_actions,
              1 if data.repair_request_filed else 0,
              1 if data.object_left_before_fix else 0,
              1 if data.object_under_guard else 0,
              data.guard_response, data.master_arrived_at, data.response_time_min,
              data.guilty_party, data.root_cause, data.resolution, data.resolved_at,
              data.status, data.priority, data.notes))
        conn.commit()
        return dict(conn.execute("SELECT * FROM incidents WHERE id=?", (cur.lastrowid,)).fetchone())
    finally:
        conn.close()

@app.get("/api/incidents/{id}")
def get_incident(id: int, role: str = Depends(get_role)):
    conn = get_conn()
    try:
        row = conn.execute("SELECT * FROM incidents WHERE id=?", (id,)).fetchone()
        if not row:
            raise HTTPException(404, "Не найдено")
        return dict(row)
    finally:
        conn.close()

@app.put("/api/incidents/{id}")
def update_incident(id: int, data: IncidentUpdate, role: str = Depends(get_role)):
    conn = get_conn()
    try:
        row = conn.execute("SELECT id FROM incidents WHERE id=?", (id,)).fetchone()
        if not row:
            raise HTTPException(404, "Не найдено")
        conn.execute("""
            UPDATE incidents SET
            event_at=?, incident_type=?, description=?, discovered_by=?,
            employee_actions=?, repair_request_filed=?, object_left_before_fix=?, object_under_guard=?,
            guard_response=?, master_arrived_at=?, response_time_min=?, guilty_party=?,
            root_cause=?, resolution=?, resolved_at=?, status=?, priority=?, notes=?
            WHERE id=?
        """, (data.event_at, data.incident_type, data.description, data.discovered_by,
              data.employee_actions,
              1 if data.repair_request_filed else 0,
              1 if data.object_left_before_fix else 0,
              1 if data.object_under_guard else 0,
              data.guard_response, data.master_arrived_at, data.response_time_min,
              data.guilty_party, data.root_cause, data.resolution, data.resolved_at,
              data.status, data.priority, data.notes, id))
        conn.commit()
        return dict(conn.execute("SELECT * FROM incidents WHERE id=?", (id,)).fetchone())
    finally:
        conn.close()

@app.delete("/api/incidents/{id}", status_code=204)
def delete_incident(id: int, _=Depends(require_admin)):
    conn = get_conn()
    try:
        conn.execute("DELETE FROM incidents WHERE id=?", (id,))
        conn.commit()
    finally:
        conn.close()

# ── Stats ─────────────────────────────────────────────────────────────────────

@app.get("/api/stats")
def get_stats(month: Optional[str] = None, role: str = Depends(get_role)):
    conn = get_conn()
    try:
        where = "WHERE strftime('%Y-%m', event_at) = ?" if month else "WHERE 1=1"
        params = [month] if month else []
        total        = conn.execute(f"SELECT COUNT(*) FROM incidents {where}", params).fetchone()[0]
        by_guilty    = conn.execute(f"SELECT guilty_party, COUNT(*) as cnt FROM incidents {where} GROUP BY guilty_party", params).fetchall()
        by_type      = conn.execute(f"SELECT incident_type, COUNT(*) as cnt FROM incidents {where} GROUP BY incident_type", params).fetchall()
        by_status    = conn.execute(f"SELECT status, COUNT(*) as cnt FROM incidents {where} GROUP BY status", params).fetchall()
        avg_response = conn.execute(f"SELECT AVG(response_time_min) FROM incidents {where} AND response_time_min IS NOT NULL", params).fetchone()[0]
        violations_no_master = conn.execute(f"SELECT COUNT(*) FROM incidents {where} AND repair_request_filed=1 AND master_arrived_at IS NULL AND status NOT IN ('new')", params).fetchone()[0]
        not_under_guard      = conn.execute(f"SELECT COUNT(*) FROM incidents {where} AND object_under_guard=0", params).fetchone()[0]
        return {
            "total": total,
            "by_guilty":   [dict(r) for r in by_guilty],
            "by_type":     [dict(r) for r in by_type],
            "by_status":   [dict(r) for r in by_status],
            "avg_response_min":    round(avg_response, 1) if avg_response else None,
            "violations_no_master": violations_no_master,
            "not_under_guard":      not_under_guard,
        }
    finally:
        conn.close()

@app.get("/api/months")
def get_months(role: str = Depends(get_role)):
    conn = get_conn()
    try:
        rows = conn.execute("SELECT DISTINCT strftime('%Y-%m', event_at) as month FROM incidents ORDER BY month DESC").fetchall()
        return [r["month"] for r in rows]
    finally:
        conn.close()

@app.get("/health")
def health():
    return {"status": "ok"}
