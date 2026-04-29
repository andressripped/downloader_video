import yt_dlp
import instaloader
from .utils import get_random_user_agent
import re

L = instaloader.Instaloader(
    download_pictures=False,
    download_video_thumbnails=False,
    download_videos=False,
    download_geotags=False,
    download_comments=False,
    save_metadata=False,
    compress_json=False
)

def extract_instagram(url: str):
    url = url.split('?')[0].rstrip('/')
    
    # Exclude common paths
    post_match = re.search(r'instagram\.com/(?:p|reel)/([^/]+)', url)
    profile_match = re.search(r'instagram\.com/([^/]+)$', url)
    
    if post_match:
        shortcode = post_match.group(1)
        try:
            post = instaloader.Post.from_shortcode(L.context, shortcode)
            
            if post.typename == 'GraphSidecar':
                media_urls = []
                for node in post.get_sidecar_nodes():
                    if node.is_video:
                        media_urls.append(node.video_url)
                    else:
                        media_urls.append(node.display_url)
                        
                return {
                    'platform': 'instagram',
                    'type': 'carousel',
                    'title': f"ig_carousel_{shortcode}",
                    'urls': media_urls,
                    'thumbnail': media_urls[0] if media_urls else None
                }
            elif post.is_video:
                return _extract_ig_video(url)
            else:
                return {
                    'platform': 'instagram',
                    'type': 'photo',
                    'title': f"ig_photo_{shortcode}",
                    'hd_url': post.url,
                    'thumbnail': post.url
                }
        except Exception as e:
            print(f"Instaloader falló, intentando yt-dlp: {e}")
            return _extract_ig_video(url)
            
    elif profile_match:
        username = profile_match.group(1)
        if username in ['p', 'reel', 'stories', 'explore']:
            raise ValueError("URL de Instagram no válida para perfil.")
        try:
            profile = instaloader.Profile.from_username(L.context, username)
            return {
                'platform': 'instagram',
                'type': 'profile',
                'title': f"{username}_profile_hd",
                'hd_url': profile.profile_pic_url_hd,
                'thumbnail': profile.profile_pic_url
            }
        except Exception as e:
            raise ValueError(f"Error al obtener el perfil de Instagram: {str(e)}")
    else:
        raise ValueError("URL de Instagram no reconocida.")

def _extract_ig_video(url: str):
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'http_headers': {
            'User-Agent': get_random_user_agent()
        }
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            info = ydl.extract_info(url, download=False)
        except Exception as e:
            raise ValueError(f"Error al procesar Reel/Video de IG con yt-dlp: {str(e)}")
            
        return {
            'platform': 'instagram',
            'type': 'video',
            'title': info.get('title', 'ig_video'),
            'description': info.get('description', ''),
            'thumbnail': info.get('thumbnail'),
            'hd_url': info.get('url')
        }
