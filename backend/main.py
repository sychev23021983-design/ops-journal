from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
import sqlite3
import os
import jwt
import bcrypt
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel

DB_PATH = os.getenv("DB_PATH", "/app/data/ops.db")
SECRET_KEY = os.getenv("SECRET_KEY", "changeme-secret-key-2026")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

# ── DB ──────────────────────────────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.executescript("""
        CREATE TABLE IF NOT EXISTS incidents (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at  TEXT NOT NULL,
            event_at    TEXT NOT NULL,
            incident_type TEXT NOT NULL,
            description TEXT,
            discovered_by TEXT,
            shift_employee TEXT,
            guard_response TEXT,
            response_time_min INTEGER,
            guilty_party TEXT NOT NULL,
            root_cause  TEXT,
            resolution  TEXT,
            resolved_at TEXT,
            status      TEXT NOT NULL DEFAULT 'new',
            priority    TEXT NOT NULL DEFAULT 'medium',
            notes       TEXT
        );
    """)
    conn.commit()
    conn.close()

# ── Auth ─────────────────────────────────────────────────────────────────────

security = HTTPBearer()

def create_token():
    payload = {"exp": datetime.utcnow() + timedelta(hours=24), "sub": "admin"}
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

# ── Models ───────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    password: str

class IncidentCreate(BaseModel):
    event_at: str
    incident_type: str
    description: Optional[str] = None
    discovered_by: Optional[str] = None
    shift_employee: Optional[str] = None
    guard_response: Optional[str] = None
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

# ── App ──────────────────────────────────────────────────────────────────────

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

# ── Routes: Auth ─────────────────────────────────────────────────────────────

@app.post("/api/auth/login")
def login(req: LoginRequest):
    if req.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Неверный пароль")
    return {"token": create_token()}

# ── Routes: Incidents ────────────────────────────────────────────────────────

@app.get("/api/incidents")
def list_incidents(
    month: Optional[str] = None,   # YYYY-MM
    guilty_party: Optional[str] = None,
    incident_type: Optional[str] = None,
    status: Optional[str] = None,
    db: sqlite3.Connection = Depends(get_db),
    _=Depends(verify_token)
):
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
    rows = db.execute(query, params).fetchall()
    return [dict(r) for r in rows]

@app.post("/api/incidents", status_code=201)
def create_incident(
    data: IncidentCreate,
    db: sqlite3.Connection = Depends(get_db),
    _=Depends(verify_token)
):
    now = datetime.utcnow().isoformat()
    cur = db.execute("""
        INSERT INTO incidents
        (created_at, event_at, incident_type, description, discovered_by,
         shift_employee, guard_response, response_time_min, guilty_party,
         root_cause, resolution, resolved_at, status, priority, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, (now, data.event_at, data.incident_type, data.description,
          data.discovered_by, data.shift_employee, data.guard_response,
          data.response_time_min, data.guilty_party, data.root_cause,
          data.resolution, data.resolved_at, data.status, data.priority, data.notes))
    db.commit()
    row = db.execute("SELECT * FROM incidents WHERE id=?", (cur.lastrowid,)).fetchone()
    return dict(row)

@app.get("/api/incidents/{id}")
def get_incident(id: int, db: sqlite3.Connection = Depends(get_db), _=Depends(verify_token)):
    row = db.execute("SELECT * FROM incidents WHERE id=?", (id,)).fetchone()
    if not row:
        raise HTTPException(404, "Не найдено")
    return dict(row)

@app.put("/api/incidents/{id}")
def update_incident(
    id: int,
    data: IncidentUpdate,
    db: sqlite3.Connection = Depends(get_db),
    _=Depends(verify_token)
):
    row = db.execute("SELECT id FROM incidents WHERE id=?", (id,)).fetchone()
    if not row:
        raise HTTPException(404, "Не найдено")
    db.execute("""
        UPDATE incidents SET
        event_at=?, incident_type=?, description=?, discovered_by=?,
        shift_employee=?, guard_response=?, response_time_min=?, guilty_party=?,
        root_cause=?, resolution=?, resolved_at=?, status=?, priority=?, notes=?
        WHERE id=?
    """, (data.event_at, data.incident_type, data.description, data.discovered_by,
          data.shift_employee, data.guard_response, data.response_time_min,
          data.guilty_party, data.root_cause, data.resolution, data.resolved_at,
          data.status, data.priority, data.notes, id))
    db.commit()
    return dict(db.execute("SELECT * FROM incidents WHERE id=?", (id,)).fetchone())

@app.delete("/api/incidents/{id}", status_code=204)
def delete_incident(id: int, db: sqlite3.Connection = Depends(get_db), _=Depends(verify_token)):
    db.execute("DELETE FROM incidents WHERE id=?", (id,))
    db.commit()

# ── Routes: Stats / Report ───────────────────────────────────────────────────

@app.get("/api/stats")
def get_stats(
    month: Optional[str] = None,
    db: sqlite3.Connection = Depends(get_db),
    _=Depends(verify_token)
):
    where = "WHERE strftime('%Y-%m', event_at) = ?" if month else "WHERE 1=1"
    params = [month] if month else []

    total = db.execute(f"SELECT COUNT(*) FROM incidents {where}", params).fetchone()[0]

    by_guilty = db.execute(f"""
        SELECT guilty_party, COUNT(*) as cnt
        FROM incidents {where}
        GROUP BY guilty_party
    """, params).fetchall()

    by_type = db.execute(f"""
        SELECT incident_type, COUNT(*) as cnt
        FROM incidents {where}
        GROUP BY incident_type
    """, params).fetchall()

    by_status = db.execute(f"""
        SELECT status, COUNT(*) as cnt
        FROM incidents {where}
        GROUP BY status
    """, params).fetchall()

    avg_response = db.execute(f"""
        SELECT AVG(response_time_min)
        FROM incidents {where}
        AND response_time_min IS NOT NULL
    """, params).fetchone()[0]

    return {
        "total": total,
        "by_guilty": [dict(r) for r in by_guilty],
        "by_type": [dict(r) for r in by_type],
        "by_status": [dict(r) for r in by_status],
        "avg_response_min": round(avg_response, 1) if avg_response else None,
    }

@app.get("/api/months")
def get_months(db: sqlite3.Connection = Depends(get_db), _=Depends(verify_token)):
    rows = db.execute("""
        SELECT DISTINCT strftime('%Y-%m', event_at) as month
        FROM incidents ORDER BY month DESC
    """).fetchall()
    return [r["month"] for r in rows]

@app.get("/health")
def health():
    return {"status": "ok"}
