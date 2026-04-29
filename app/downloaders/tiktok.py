import yt_dlp
from .utils import get_random_user_agent

def extract_tiktok(url: str):
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'http_headers': {
            'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
    }
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            info = ydl.extract_info(url, download=False)
        except Exception as e:
            raise ValueError(f"Error al procesar link de TikTok: {str(e)}")
            
        title = info.get('title', 'tiktok_video')
        formats = info.get('formats', [])
        
        hd_url = None
        sd_url = None
        
        # TikTok format logic: download_addr usually watermark-free, play_addr is standard
        for f in formats:
            format_id = f.get('format_id', '')
            if 'download_addr' in format_id:
                hd_url = f.get('url')
            elif 'play_addr' in format_id:
                sd_url = f.get('url')
                
        # Fallbacks
        if not hd_url:
            hd_url = info.get('url') # yt-dlp default is best quality
        if not sd_url and formats:
            sd_url = formats[0].get('url')
            
        return {
            'platform': 'tiktok',
            'title': title,
            'description': info.get('description', ''),
            'thumbnail': info.get('thumbnail'),
            'hd_url': hd_url,
            'sd_url': sd_url,
            'original_url': url
        }

def download_tiktok(url: str, filename: str, format_type: str = "h264") -> str:
    import os
    temp_dir = os.path.join(os.path.dirname(__file__), "temp")
    os.makedirs(temp_dir, exist_ok=True)
    filepath = os.path.join(temp_dir, filename)
    
    # Filtramos para asegurarnos de que sean sin marca de agua (excluyendo el id 'download')
    if format_type == 'h265':
        format_str = 'best[format_id!=download][vcodec^=h265]/best[format_id!=download][vcodec^=bytevc1]/best[format_id!=download]'
        format_sort = []
    else:
        format_str = 'best[format_id!=download][vcodec^=h264]/best[format_id!=download]'
        format_sort = ['size'] # Fuerza el archivo de mayor peso
    
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'outtmpl': filepath,
        'format': format_str,
        'http_headers': {
            'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
    }
    
    if format_sort:
        ydl_opts['format_sort'] = format_sort
    
    # Si el archivo ya existe por descargas previas fallidas, lo borramos
    if os.path.exists(filepath):
        try:
            os.remove(filepath)
        except:
            pass
            
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])
        
    return filepath
