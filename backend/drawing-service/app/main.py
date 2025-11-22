from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
import requests
import sqlite3
import json
import os

DATABASE = "drawings.db"
AUTH_URL = os.getenv("AUTH_URL", "http://paint_auth_service:8081")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def init_db():
    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()
    c.execute("""
    CREATE TABLE IF NOT EXISTS drawings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT,
        data TEXT
    )
    """)
    conn.commit()
    conn.close()

init_db()

def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(401, "Missing token")

    try:
        r = requests.get(
            f"{AUTH_URL}/verify-token",
            headers={"Authorization": authorization}
        )
        if r.status_code != 200:
            raise HTTPException(401, "Invalid token")
        return r.json()

    except Exception:
        raise HTTPException(401, "Auth service unreachable")

@app.post("/save")
def save_drawing(name: str, data: dict, user=Depends(get_current_user)):
    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()
    c.execute("INSERT INTO drawings (user_id, name, data) VALUES (?, ?, ?)",
              (user["id"], name, json.dumps(data)))
    conn.commit()
    conn.close()
    return {"ok": True}

@app.get("/list")
def list_drawings(user=Depends(get_current_user)):
    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()
    c.execute("SELECT id, name FROM drawings WHERE user_id = ?", (user["id"],))
    rows = c.fetchall()
    conn.close()
    return [{"id": r[0], "name": r[1]} for r in rows]

@app.get("/load/{drawing_id}")
def load_drawing(drawing_id: int, user=Depends(get_current_user)):
    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()
    c.execute("SELECT data FROM drawings WHERE id = ? AND user_id = ?", (drawing_id, user["id"]))
    row = c.fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "Not found")
    return json.loads(row[0])

@app.get("/health")
def health():
    return {"ok": True}
