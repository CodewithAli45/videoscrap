# routes/api_routes.py
from flask import Blueprint, request, jsonify, Response, stream_with_context, render_template
import threading
from utils.youtube_dl_helper import get_video_qualities, get_download_url
import requests

api_bp = Blueprint('api', __name__)

@api_bp.route('/proxy_download/<download_id>')
def proxy_download(download_id):
    # Option 1: Proxy the video to force download
    data = progress_data.get(download_id)
    if not data or 'direct_url' not in data:
        return 'Invalid or expired download link', 404
    direct_url = data['direct_url']
    # Try to get filename from direct_url or fallback
    filename = direct_url.split('?')[0].split('/')[-1] or 'video.mp4'
    r = requests.get(direct_url, stream=True)
    def generate():
        for chunk in r.iter_content(chunk_size=8192):
            if chunk:
                yield chunk
    headers = {
        'Content-Disposition': f'attachment; filename="{filename}"',
        'Content-Type': r.headers.get('Content-Type', 'application/octet-stream')
    }
    return Response(stream_with_context(generate()), headers=headers)

# Option 2: Playback page with download button (commented for now)
# @api_bp.route('/playback/<download_id>')
# def playback(download_id):
#     data = progress_data.get(download_id)
#     if not data or 'direct_url' not in data:
#         return 'Invalid or expired link', 404
#     direct_url = data['direct_url']
#     return render_template('playback.html', video_url=direct_url)

# Create a Blueprint for API routes


# In-memory store for progress (for simplicity). For production, use a database like Redis.
progress_data = {}

@api_bp.route('/qualities', methods=['POST'])
def qualities():
    data = request.get_json()
    url = data.get('url')
    if not url:
        return jsonify({'error': 'URL is required'}), 400

    try:
        result = get_video_qualities(url)
        return jsonify({'qualities': result['formats'], 'thumbnail': result['thumbnail']})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/download', methods=['POST'])
def download():
    data = request.get_json()
    url = data.get('url')
    quality_id = data.get('quality_id') # e.g., '137' for 1080p mp4

    if not url or not quality_id:
        return jsonify({'error': 'URL and quality are required'}), 400

    # Create a unique ID for this download task
    download_id = f"{hash(url + quality_id)}"
    progress_data[download_id] = {'status': 'Fetching direct link...', 'percent': 10, 'done': False}

    def run_task():
        try:
            # This function now gets the direct URL, not the file
            direct_url = get_download_url(url, quality_id)
            progress_data[download_id] = {
                'status': 'Ready',
                'percent': 100,
                'done': True,
                'direct_url': direct_url # Send the URL to the frontend!
            }
        except Exception as e:
            progress_data[download_id] = {'status': f'Error: {str(e)}', 'percent': 0, 'done': True}

    threading.Thread(target=run_task, daemon=True).start()
    return jsonify({'id': download_id})

@api_bp.route('/progress/<download_id>')
def progress(download_id):
    data = progress_data.get(download_id, {'status': 'Unknown', 'percent': 0, 'done': False})
    return jsonify(data)