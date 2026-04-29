from fastapi import FastAPI, Request, HTTPException, BackgroundTasks
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
import re

import os

from app.downloaders.tiktok import extract_tiktok
from app.downloaders.instagram import extract_instagram
from app.downloaders.utils import stream_from_url, stream_zip_from_urls

app = FastAPI(title="Social Downloader")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))

class ExtractRequest(BaseModel):
    url: str

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse(request=request, name="index.html")


@app.post("/api/extract")
async def extract_info(req: ExtractRequest):
    url = req.url.strip()
    
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
async def download_stream(url: str, filename: str):
    try:
        return await stream_from_url(url, filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/download/tiktok")
async def download_tiktok_endpoint(url: str, filename: str, background_tasks: BackgroundTasks, format_type: str = "h264"):
    from app.downloaders.tiktok import download_tiktok
    try:
        filepath = download_tiktok(url, filename, format_type)
        background_tasks.add_task(os.remove, filepath)
        return FileResponse(filepath, filename=filename, media_type="video/mp4")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/download/zip")
async def download_zip(urls: str, title: str):
    url_list = urls.split(',')
    filenames = [f"{title}_{i+1}.jpg" for i in range(len(url_list))]
    zip_filename = f"{title}.zip"
    try:
        return await stream_zip_from_urls(url_list, filenames, zip_filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
