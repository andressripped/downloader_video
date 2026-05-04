from fastapi import FastAPI, Request, HTTPException, BackgroundTasks, Form, Response
from fastapi.responses import HTMLResponse, FileResponse, RedirectResponse
import httpx
import asyncio
from app.database import init_db, log_usage, get_history
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
import re

import os

from app.downloaders.tiktok import extract_tiktok
from app.downloaders.instagram import extract_instagram
from app.downloaders.utils import stream_from_url, stream_zip_from_urls

app = FastAPI(title="Social Downloader")

init_db()

def verify_admin_cookie(request: Request):
    token = request.cookies.get("admin_session")
    return token == "super_secret_session_token"

async def track_user_action(request: Request, action: str, url: str):
    ip_address = request.client.host
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        ip_address = forwarded.split(',')[0].strip()
        
    country = "Desconocido"
    city = "Desconocido"
    
    if ip_address not in ["127.0.0.1", "localhost", "0.0.0.0"]:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(f"http://ip-api.com/json/{ip_address}")
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("status") == "success":
                        country = data.get("country", "Desconocido")
                        city = data.get("city", "Desconocido")
        except Exception:
            pass
            
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, log_usage, ip_address, country, city, action, url)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))

class ExtractRequest(BaseModel):
    url: str

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse(request=request, name="index.html")

@app.get("/admin/login", response_class=HTMLResponse)
async def login_page(request: Request):
    return templates.TemplateResponse(request=request, name="admin_login.html")

@app.post("/admin/login", response_class=HTMLResponse)
async def login_post(request: Request, username: str = Form(...), password: str = Form(...)):
    if username == "superadmin" and password == "andres":
        resp = RedirectResponse(url="/admin/historial", status_code=303)
        resp.set_cookie(key="admin_session", value="super_secret_session_token", httponly=True, max_age=86400)
        return resp
    return templates.TemplateResponse(request=request, name="admin_login.html", context={"error": "Credenciales incorrectas"}, status_code=401)

@app.get("/admin/logout")
async def admin_logout():
    resp = RedirectResponse(url="/", status_code=303)
    resp.delete_cookie("admin_session")
    return resp

@app.get("/admin/historial", response_class=HTMLResponse)
async def admin_history(request: Request):
    if not verify_admin_cookie(request):
        return RedirectResponse(url="/admin/login", status_code=303)
    history = get_history(200)
    return templates.TemplateResponse(request=request, name="admin_historial.html", context={"history": history})


@app.post("/api/extract")
async def extract_info(req: ExtractRequest, request: Request, background_tasks: BackgroundTasks):
    url = req.url.strip()
    background_tasks.add_task(track_user_action, request, "Extraer", url)
    
    if "tiktok.com" in url:
        try:
            return extract_tiktok(url)
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
    elif "instagram.com" in url:
        try:
            return extract_instagram(url)
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
    else:
        raise HTTPException(status_code=400, detail="URL no soportada. Solo TikTok e Instagram.")

@app.get("/api/download/stream")
async def download_stream(request: Request, background_tasks: BackgroundTasks, url: str, filename: str):
    background_tasks.add_task(track_user_action, request, "Descargar Media", url)
    try:
        return await stream_from_url(url, filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/download/tiktok")
async def download_tiktok_endpoint(request: Request, url: str, filename: str, background_tasks: BackgroundTasks, format_type: str = "h264"):
    from app.downloaders.tiktok import download_tiktok
    background_tasks.add_task(track_user_action, request, "Descargar Video TikTok", url)
    try:
        filepath = download_tiktok(url, filename, format_type)
        background_tasks.add_task(os.remove, filepath)
        return FileResponse(filepath, filename=filename, media_type="video/mp4")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/download/zip")
async def download_zip(request: Request, background_tasks: BackgroundTasks, urls: str, title: str):
    background_tasks.add_task(track_user_action, request, "Descargar Carrusel (ZIP)", title)
    url_list = urls.split(',')
    filenames = [f"{title}_{i+1}.jpg" for i in range(len(url_list))]
    zip_filename = f"{title}.zip"
    try:
        return await stream_zip_from_urls(url_list, filenames, zip_filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
