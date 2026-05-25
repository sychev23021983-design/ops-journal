from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from contextlib import asynccontextmanager
import sqlite3, os, jwt, shutil, json, io, zipfile, tempfile
from datetime import datetime, timedelta
from typing import Optional, List
from pydantic import BaseModel

DB_PATH         = os.getenv("DB_PATH",         "/app/data/ops.db")
SECRET_KEY      = os.getenv("SECRET_KEY",      "changeme-secret-key-2026")
ADMIN_PASSWORD  = os.getenv("ADMIN_PASSWORD",  "admin123")
UPLOAD_DIR      = "/app/data/uploads"

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
            notified_person         TEXT,
            called_electrician_at   TEXT,
            called_duty_at          TEXT,
            employee_actions        TEXT,
            repair_request_filed    INTEGER DEFAULT 0,
            object_left_before_fix  INTEGER DEFAULT 0,
            object_under_guard      INTEGER DEFAULT 1,
            guard_response          TEXT,
            guard_response_type     TEXT,
            master_arrived_at       TEXT,
            response_time_min       INTEGER,
            master_actions          TEXT,
            outcome                 TEXT,
            additional_investigation INTEGER DEFAULT 0,
            guilty_party            TEXT NOT NULL DEFAULT 'unknown',
            contract_clause         TEXT,
            root_cause              TEXT,
            resolution              TEXT,
            resolved_at             TEXT,
            related_incident_id     INTEGER,
            status                  TEXT NOT NULL DEFAULT 'new',
            notes                   TEXT
        );
        CREATE TABLE IF NOT EXISTS employees (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name  TEXT NOT NULL,
            position   TEXT,
            phone      TEXT,
            is_active  INTEGER DEFAULT 1,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS settings (
            key   TEXT PRIMARY KEY,
            value TEXT
        );
    """)
    # Migrations: add new columns if they don't exist
    existing = [row[1] for row in c.execute("PRAGMA table_info(incidents)").fetchall()]
    new_cols = {
        "notified_person":          "TEXT",
        "called_electrician_at":    "TEXT",
        "called_duty_at":           "TEXT",
        "guard_response_type":      "TEXT",
        "master_actions":           "TEXT",
        "outcome":                  "TEXT",
        "additional_investigation": "INTEGER DEFAULT 0",
        "contract_clause":          "TEXT",
        "related_incident_id":      "INTEGER",
        "employee_actions":         "TEXT",
        "repair_request_filed":     "INTEGER DEFAULT 0",
        "object_left_before_fix":   "INTEGER DEFAULT 0",
        "object_under_guard":       "INTEGER DEFAULT 1",
        "master_arrived_at":        "TEXT",
        "response_time_min":        "INTEGER",
    }
    for col, typedef in new_cols.items():
        if col not in existing:
            c.execute(f"ALTER TABLE incidents ADD COLUMN {col} {typedef}")

    # Remove old priority column is fine to keep (just not used)
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

# ── Models ────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    password: str

class IncidentCreate(BaseModel):
    event_at: str
    incident_type: str
    description: Optional[str] = None
    discovered_by: Optional[str] = None
    notified_person: Optional[str] = None
    called_electrician_at: Optional[str] = None
    called_duty_at: Optional[str] = None
    employee_actions: Optional[str] = None
    repair_request_filed: Optional[bool] = False
    object_left_before_fix: Optional[bool] = False
    object_under_guard: Optional[bool] = True
    guard_response: Optional[str] = None
    guard_response_type: Optional[str] = None
    master_arrived_at: Optional[str] = None
    response_time_min: Optional[int] = None
    master_actions: Optional[str] = None
    outcome: Optional[str] = None
    additional_investigation: Optional[bool] = False
    guilty_party: str = "unknown"
    contract_clause: Optional[str] = None
    root_cause: Optional[str] = None
    resolution: Optional[str] = None
    resolved_at: Optional[str] = None
    related_incident_id: Optional[int] = None
    status: str = "new"
    notes: Optional[str] = None

class IncidentUpdate(IncidentCreate):
    pass

class IncidentStatusUpdate(BaseModel):
    status: str

class EmployeeCreate(BaseModel):
    full_name: str
    position: Optional[str] = None
    phone: Optional[str] = None

class EmployeeUpdate(EmployeeCreate):
    is_active: Optional[bool] = True

class SettingsUpdate(BaseModel):
    viewer_password: Optional[str] = None
    logo_size: Optional[str] = None
    font_family: Optional[str] = None

# ── Lifespan ──────────────────────────────────────────────────────────────────

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

# ── Settings ──────────────────────────────────────────────────────────────────

@app.get("/api/settings")
def get_settings(_=Depends(require_admin)):
    conn = get_conn()
    try:
        rows = conn.execute("SELECT key, value FROM settings").fetchall()
        result = {r["key"]: r["value"] for r in rows}
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
            conn.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('viewer_password', ?)", (data.viewer_password,))
        if data.logo_size:
            conn.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('logo_size', ?)", (data.logo_size,))
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
    filename = f"{file_type}.png"
    path = os.path.join(UPLOAD_DIR, filename)
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    conn = get_conn()
    try:
        conn.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (f"{file_type}_url", f"/uploads/{filename}"))
        conn.commit()
    finally:
        conn.close()
    return {"url": f"/uploads/{filename}"}

@app.get("/api/settings/public")
def get_public_settings():
    conn = get_conn()
    try:
        logo    = conn.execute("SELECT value FROM settings WHERE key='logo_url'").fetchone()
        favicon = conn.execute("SELECT value FROM settings WHERE key='favicon_url'").fetchone()
        size    = conn.execute("SELECT value FROM settings WHERE key='logo_size'").fetchone()
        font    = conn.execute("SELECT value FROM settings WHERE key='font_family'").fetchone()
        return {
            "logo_url":    logo["value"]    if logo    else None,
            "favicon_url": favicon["value"] if favicon else None,
            "logo_size":   size["value"]    if size    else "32",
            "font_family": font["value"]    if font    else "Roboto",
        }
    finally:
        conn.close()

# ── Backup / Restore ──────────────────────────────────────────────────────────

@app.get("/api/backup/export")
def export_backup(_=Depends(require_admin)):
    """Export full DB as JSON inside a ZIP archive"""
    conn = get_conn()
    try:
        incidents = [dict(r) for r in conn.execute("SELECT * FROM incidents ORDER BY id").fetchall()]
        employees = [dict(r) for r in conn.execute("SELECT * FROM employees ORDER BY id").fetchall()]
        settings  = [dict(r) for r in conn.execute("SELECT * FROM settings").fetchall()]
    finally:
        conn.close()

    backup = {
        "version": 1,
        "exported_at": datetime.utcnow().isoformat(),
        "incidents": incidents,
        "employees": employees,
        "settings": settings,
    }
    json_bytes = json.dumps(backup, ensure_ascii=False, indent=2).encode("utf-8")

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(f"ops_backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json", json_bytes)
    buf.seek(0)

    filename = f"ops_backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.zip"
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@app.post("/api/backup/import")
async def import_backup(file: UploadFile = File(...), _=Depends(require_admin)):
    """Import backup from JSON or ZIP"""
    content = await file.read()

    # Unzip if needed
    if file.filename.endswith(".zip"):
        buf = io.BytesIO(content)
        with zipfile.ZipFile(buf, "r") as zf:
            names = zf.namelist()
            json_names = [n for n in names if n.endswith(".json")]
            if not json_names:
                raise HTTPException(400, "В архиве не найден JSON файл")
            content = zf.read(json_names[0])

    try:
        data = json.loads(content.decode("utf-8"))
    except Exception:
        raise HTTPException(400, "Не удалось распарсить JSON")

    if data.get("version") != 1:
        raise HTTPException(400, "Неизвестная версия резервной копии")

    conn = get_conn()
    try:
        c = conn.cursor()
        # Clear existing data
        c.execute("DELETE FROM incidents")
        c.execute("DELETE FROM employees")
        # Restore incidents
        for inc in data.get("incidents", []):
            cols = ", ".join(inc.keys())
            placeholders = ", ".join(["?"] * len(inc))
            c.execute(f"INSERT OR REPLACE INTO incidents ({cols}) VALUES ({placeholders})", list(inc.values()))
        # Restore employees
        for emp in data.get("employees", []):
            cols = ", ".join(emp.keys())
            placeholders = ", ".join(["?"] * len(emp))
            c.execute(f"INSERT OR REPLACE INTO employees ({cols}) VALUES ({placeholders})", list(emp.values()))
        # Restore settings (skip passwords to avoid overwrite)
        for s in data.get("settings", []):
            if s["key"] not in ("admin_password",):
                c.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (s["key"], s["value"]))
        conn.commit()
        return {
            "ok": True,
            "incidents": len(data.get("incidents", [])),
            "employees": len(data.get("employees", [])),
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(500, f"Ошибка импорта: {str(e)}")
    finally:
        conn.close()

# ── Employees ─────────────────────────────────────────────────────────────────

@app.get("/api/employees")
def list_employees(include_inactive: bool = False, role: str = Depends(get_role)):
    conn = get_conn()
    try:
        if include_inactive:
            rows = conn.execute("SELECT * FROM employees ORDER BY is_active DESC, full_name").fetchall()
        else:
            rows = conn.execute("SELECT * FROM employees WHERE is_active=1 ORDER BY full_name").fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

@app.post("/api/employees", status_code=201)
def create_employee(data: EmployeeCreate, _=Depends(require_admin)):
    conn = get_conn()
    try:
        now = datetime.utcnow().isoformat()
        cur = conn.execute(
            "INSERT INTO employees (full_name, position, phone, is_active, created_at) VALUES (?,?,?,1,?)",
            (data.full_name, data.position, data.phone, now)
        )
        conn.commit()
        return dict(conn.execute("SELECT * FROM employees WHERE id=?", (cur.lastrowid,)).fetchone())
    finally:
        conn.close()

@app.put("/api/employees/{id}")
def update_employee(id: int, data: EmployeeUpdate, _=Depends(require_admin)):
    conn = get_conn()
    try:
        row = conn.execute("SELECT id FROM employees WHERE id=?", (id,)).fetchone()
        if not row:
            raise HTTPException(404, "Не найдено")
        conn.execute(
            "UPDATE employees SET full_name=?, position=?, phone=?, is_active=? WHERE id=?",
            (data.full_name, data.position, data.phone, 1 if data.is_active else 0, id)
        )
        conn.commit()
        return dict(conn.execute("SELECT * FROM employees WHERE id=?", (id,)).fetchone())
    finally:
        conn.close()

@app.delete("/api/employees/{id}", status_code=204)
def delete_employee(id: int, _=Depends(require_admin)):
    """Soft delete — mark as inactive"""
    conn = get_conn()
    try:
        conn.execute("UPDATE employees SET is_active=0 WHERE id=?", (id,))
        conn.commit()
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
        # Auto-calculate response_time_min if not provided
        response_time = data.response_time_min
        if response_time is None and data.master_arrived_at:
            call_time = data.called_electrician_at or data.called_duty_at
            if call_time:
                try:
                    t1 = datetime.fromisoformat(call_time)
                    t2 = datetime.fromisoformat(data.master_arrived_at)
                    response_time = max(0, int((t2 - t1).total_seconds() / 60))
                except Exception:
                    pass

        cur = conn.execute("""
            INSERT INTO incidents
            (created_at, event_at, incident_type, description, discovered_by,
             notified_person, called_electrician_at, called_duty_at,
             employee_actions, repair_request_filed, object_left_before_fix, object_under_guard,
             guard_response, guard_response_type, master_arrived_at, response_time_min,
             master_actions, outcome, additional_investigation,
             guilty_party, contract_clause, root_cause, resolution, resolved_at,
             related_incident_id, status, notes)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (now, data.event_at, data.incident_type, data.description, data.discovered_by,
              data.notified_person, data.called_electrician_at, data.called_duty_at,
              data.employee_actions,
              1 if data.repair_request_filed else 0,
              1 if data.object_left_before_fix else 0,
              1 if data.object_under_guard else 0,
              data.guard_response, data.guard_response_type,
              data.master_arrived_at, response_time,
              data.master_actions, data.outcome,
              1 if data.additional_investigation else 0,
              data.guilty_party, data.contract_clause,
              data.root_cause, data.resolution, data.resolved_at,
              data.related_incident_id, data.status, data.notes))
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

        response_time = data.response_time_min
        if response_time is None and data.master_arrived_at:
            call_time = data.called_electrician_at or data.called_duty_at
            if call_time:
                try:
                    t1 = datetime.fromisoformat(call_time)
                    t2 = datetime.fromisoformat(data.master_arrived_at)
                    response_time = max(0, int((t2 - t1).total_seconds() / 60))
                except Exception:
                    pass

        conn.execute("""
            UPDATE incidents SET
            event_at=?, incident_type=?, description=?, discovered_by=?,
            notified_person=?, called_electrician_at=?, called_duty_at=?,
            employee_actions=?, repair_request_filed=?, object_left_before_fix=?, object_under_guard=?,
            guard_response=?, guard_response_type=?, master_arrived_at=?, response_time_min=?,
            master_actions=?, outcome=?, additional_investigation=?,
            guilty_party=?, contract_clause=?, root_cause=?, resolution=?, resolved_at=?,
            related_incident_id=?, status=?, notes=?
            WHERE id=?
        """, (data.event_at, data.incident_type, data.description, data.discovered_by,
              data.notified_person, data.called_electrician_at, data.called_duty_at,
              data.employee_actions,
              1 if data.repair_request_filed else 0,
              1 if data.object_left_before_fix else 0,
              1 if data.object_under_guard else 0,
              data.guard_response, data.guard_response_type,
              data.master_arrived_at, response_time,
              data.master_actions, data.outcome,
              1 if data.additional_investigation else 0,
              data.guilty_party, data.contract_clause,
              data.root_cause, data.resolution, data.resolved_at,
              data.related_incident_id, data.status, data.notes, id))
        conn.commit()
        return dict(conn.execute("SELECT * FROM incidents WHERE id=?", (id,)).fetchone())
    finally:
        conn.close()

@app.patch("/api/incidents/{id}/status")
def patch_status(id: int, data: IncidentStatusUpdate, role: str = Depends(get_role)):
    conn = get_conn()
    try:
        conn.execute("UPDATE incidents SET status=? WHERE id=?", (data.status, id))
        conn.commit()
        return {"ok": True}
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
        violations_no_master = conn.execute(
            f"SELECT COUNT(*) FROM incidents {where} AND repair_request_filed=1 AND master_arrived_at IS NULL AND status NOT IN ('new')", params
        ).fetchone()[0]
        not_under_guard = conn.execute(f"SELECT COUNT(*) FROM incidents {where} AND object_under_guard=0", params).fetchone()[0]
        return {
            "total": total,
            "by_guilty":   [dict(r) for r in by_guilty],
            "by_type":     [dict(r) for r in by_type],
            "by_status":   [dict(r) for r in by_status],
            "avg_response_min":      round(avg_response, 1) if avg_response else None,
            "violations_no_master":  violations_no_master,
            "not_under_guard":       not_under_guard,
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

# ── Plan image ───────────────────────────────────────────────────────────────

PLAN_FILE = os.path.join(UPLOAD_DIR, "plan.image")

@app.post("/api/plan/upload")
async def upload_plan(file: UploadFile = File(...), role: str = Depends(get_role)):
    """Загрузить план объекта. Доступно всем авторизованным пользователям."""
    content_type = file.content_type or ""
    if not content_type.startswith("image/"):
        raise HTTPException(400, "Только изображения")
    data = await file.read()
    # Сохраняем содержимое и content-type в один файл через простой формат:
    # первые 64 байта — content-type (padded пробелами), остаток — данные
    header = content_type.ljust(64).encode("utf-8")[:64]
    with open(PLAN_FILE, "wb") as f:
        f.write(header + data)
    return {"ok": True, "size": len(data), "content_type": content_type}

@app.get("/api/plan/image")
def get_plan(role: str = Depends(get_role)):
    """Получить план объекта."""
    if not os.path.exists(PLAN_FILE):
        raise HTTPException(404, "План не загружен")
    with open(PLAN_FILE, "rb") as f:
        raw = f.read()
    content_type = raw[:64].decode("utf-8").strip()
    data = raw[64:]
    return StreamingResponse(io.BytesIO(data), media_type=content_type)

@app.delete("/api/plan/image", status_code=204)
def delete_plan(role: str = Depends(get_role)):
    """Удалить план объекта."""
    if os.path.exists(PLAN_FILE):
        os.remove(PLAN_FILE)

@app.get("/health")
def health():
    return {"status": "ok"}
