# utils/youtube_dl_helper.py
import yt_dlp


def get_video_qualities(url):
    formats = []
    thumbnail_url = None
    try:
        with yt_dlp.YoutubeDL({'quiet': True}) as ydl:
            info = ydl.extract_info(url, download=False)
            thumbnail_url = info.get('thumbnail')
            for f in info.get('formats', []):
                # Only look for video formats (that have a video codec)
                if f.get('vcodec') != 'none':
                    label = f.get('format_note') or f"{f.get('height', 'N/A')}p" or f.get('format_id')
                    formats.append({
                        'id': f.get('format_id'),
                        'label': f'{label} ({f.get("ext")})',
                        'height': f.get('height'),
                        'ext': f.get('ext')
                    })
        # Remove duplicates and sort by height
        seen = set()
        unique_formats = []
        for fmt in formats:
            if fmt['id'] not in seen:
                unique_formats.append(fmt)
                seen.add(fmt['id'])
        unique_formats.sort(key=lambda x: x['height'] or 0, reverse=True)
        return {'formats': unique_formats, 'thumbnail': thumbnail_url}
    except Exception as e:
        raise e

def get_download_url(url, format_id):
    ydl_opts = {
        'format': format_id,
        # We don't want to download, just get the URL
        'simulate': True,
        # 'quiet': True,
        # 'no_warnings': True,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        # The 'url' key in the format info is the direct HTTP link to the file
        # Find the format the user selected
        selected_format = next((f for f in info['formats'] if f['format_id'] == format_id), None)
        if selected_format:
            return selected_format['url']
        else:
            raise Exception("Could not find the requested format.")