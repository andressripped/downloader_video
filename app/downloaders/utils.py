import random
import httpx
from fastapi.responses import StreamingResponse
import io
import zipfile

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
]

def get_random_user_agent():
    return random.choice(USER_AGENTS)

async def stream_from_url(url: str, filename: str):
    """
    Túnel de streaming: obtiene el archivo desde la URL remota
    y lo pasa directamente al cliente sin guardarlo en disco.
    """
    # Desactivar timeouts para descargas largas y evitar cortes
    timeout = httpx.Timeout(connect=15.0, read=None, write=None, pool=None)
    client = httpx.AsyncClient(follow_redirects=True, timeout=timeout)
    
    headers = {
        'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        'Accept': '*/*',
        'Connection': 'keep-alive',
        'Referer': 'https://www.tiktok.com/'
    }

    try:
        # Obtenemos primero los headers (sin descargar el cuerpo) para Content-Type y Content-Length
        head_response = await client.head(url, headers=headers)
        content_type = head_response.headers.get("Content-Type", "application/octet-stream")
        content_length = head_response.headers.get("Content-Length")
    except Exception:
        content_type = "application/octet-stream"
        content_length = None

    async def stream_generator():
        try:
            async with client.stream("GET", url, headers=headers) as response:
                response.raise_for_status()
                async for chunk in response.aiter_bytes(chunk_size=1024 * 256): # 256KB chunks para mejor rendimiento
                    yield chunk
        finally:
            await client.aclose()

    response_headers = {
        "Content-Disposition": f"attachment; filename=\"{filename}\""
    }
    if content_length:
        response_headers["Content-Length"] = content_length

    return StreamingResponse(
        stream_generator(),
        media_type=content_type,
        headers=response_headers
    )

async def stream_zip_from_urls(urls: list, filenames: list, zip_filename: str):
    """
    Descarga varios archivos en memoria y los envía como un archivo ZIP.
    Ideal para carruseles de Instagram sin usar almacenamiento local.
    """
    zip_buffer = io.BytesIO()
    
    async with httpx.AsyncClient(follow_redirects=True) as client:
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
            for url, name in zip(urls, filenames):
                headers = {'User-Agent': get_random_user_agent()}
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    zip_file.writestr(name, resp.content)
                    
    zip_buffer.seek(0)
    return StreamingResponse(
        iter([zip_buffer.getvalue()]),
        media_type="application/x-zip-compressed",
        headers={"Content-Disposition": f"attachment; filename=\"{zip_filename}\""}
    )
