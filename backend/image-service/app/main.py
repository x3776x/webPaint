from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import requests

UPLOAD_DIR = "uploads"
AUTH_URL = os.getenv("AUTH_URL", "http://paint_auth_service:8081")

os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(401, "Missing token")
    r = requests.get(f"{AUTH_URL}/verify-token", headers={"Authorization": authorization})
    if r.status_code != 200:
        raise HTTPException(401, "Invalid token")
    return r.json()

@app.post("/upload")
async def upload(file: UploadFile = File(...), user=Depends(get_current_user)):
    filename = f"{user['id']}_{file.filename}"
    path = os.path.join(UPLOAD_DIR, filename)

    with open(path, "wb") as f:
        f.write(await file.read())

    return {"url": f"/files/{filename}"}

app.mount("/files", StaticFiles(directory=UPLOAD_DIR), name="files")

@app.get("/health")
def health():
    return {"ok": True}
