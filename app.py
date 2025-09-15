@app.route('/qualities', methods=['POST'])
def get_qualities():
	data = request.get_json()
	url = data.get('url')
	formats = []
	try:
		with yt_dlp.YoutubeDL({'quiet': True}) as ydl:
			info = ydl.extract_info(url, download=False)
			for f in info.get('formats', []):
				if f.get('vcodec') != 'none':
					label = f.get('format_note') or f.get('height') or f.get('format_id')
					formats.append({
						'id': f.get('format_id'),
						'label': f'{label} ({f.get('ext')}, {f.get('height', 'unknown')}p)',
						'height': f.get('height'),
						'ext': f.get('ext')
					})
		# Remove duplicates and sort by height descending
		seen = set()
		unique_formats = []
		for fmt in formats:
			if fmt['id'] not in seen:
				unique_formats.append(fmt)
				seen.add(fmt['id'])
		unique_formats.sort(key=lambda x: x['height'] or 0, reverse=True)
		return jsonify({'qualities': unique_formats})
	except Exception as e:
		return jsonify({'error': str(e), 'qualities': []}), 400

from flask import Flask, request, jsonify, send_from_directory, render_template_string
import yt_dlp
import threading
import os

app = Flask(__name__)

DOWNLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'downloads')
os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)

progress_data = {}

HTML_PAGE = '''
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>Welcome to Video Download for Educational</title>
	<style>
		body { font-family: Arial, sans-serif; background: #f4f4f4; }
		.container { max-width: 500px; margin: 40px auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px #ccc; }
		h2 { text-align: center; }
		label, select, input { display: block; width: 100%; margin-bottom: 15px; }
		button { width: 100%; padding: 10px; background: #007bff; color: #fff; border: none; border-radius: 4px; font-size: 16px; }
		#progress { margin-top: 20px; }
	</style>
</head>
<body>
	<div class="container">
		<h2>Welcome to Video Download for Educational</h2>
		<label for="url">Paste Video URL:</label>
		<input type="text" id="url" placeholder="Enter video URL here" onblur="fetchQualities()">
		<label for="quality">Select Quality:</label>
		<select id="quality">
			<option value="">Paste URL to load qualities</option>
		</select>
		<button onclick="startDownload()">Download</button>
		<div id="progress">
			<div id="status"></div>
			<div id="bar" style="width:100%;background:#eee;height:20px;border-radius:4px;overflow:hidden;">
				<div id="barfill" style="height:100%;width:0;background:#007bff;"></div>
			</div>
			<div id="speed"></div>
			<div id="eta"></div>
		</div>
	</div>
	<script>
		let downloadId = null;
		function fetchQualities() {
			const url = document.getElementById('url').value;
			if (!url) return;
			document.getElementById('quality').innerHTML = '<option>Loading...</option>';
			fetch('/qualities', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url })
			})
			.then(res => res.json())
			.then(data => {
				const select = document.getElementById('quality');
				select.innerHTML = '';
				if (data.qualities && data.qualities.length) {
					data.qualities.forEach(q => {
						select.innerHTML += `<option value="${q.id}">${q.label}</option>`;
					});
				} else {
					select.innerHTML = '<option>No qualities found</option>';
				}
			})
			.catch(() => {
				document.getElementById('quality').innerHTML = '<option>Error loading qualities</option>';
			});
		}

		function startDownload() {
			const url = document.getElementById('url').value;
			const quality = document.getElementById('quality').value;
			document.getElementById('status').innerText = 'Starting download...';
			fetch('/download', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url, quality })
			})
			.then(res => res.json())
			.then(data => {
				downloadId = data.id;
				pollProgress();
			});
		}

		function pollProgress() {
			if (!downloadId) return;
			fetch('/progress/' + downloadId)
			.then(res => res.json())
			.then(data => {
				document.getElementById('status').innerText = data.status;
				document.getElementById('barfill').style.width = data.percent + '%';
				document.getElementById('speed').innerText = 'Speed: ' + data.speed;
				document.getElementById('eta').innerText = 'Time left: ' + data.eta;
				if (!data.done) setTimeout(pollProgress, 1000);
				else document.getElementById('status').innerText = 'Download complete!';
			});
		}
	</script>
</body>
</html>
'''

def ydl_progress_hook(d):
	download_id = d.get('download_id')
	if not download_id:
		return
	if d['status'] == 'downloading':
		progress_data[download_id] = {
			'status': 'Downloading...',
			'percent': d.get('progress', 0) * 100 if d.get('progress') else d.get('percent', 0),
			'speed': f"{d.get('speed', 0):.2f} B/s" if d.get('speed') else 'N/A',
			'eta': f"{d.get('eta', 0)}s" if d.get('eta') else 'N/A',
			'done': False
		}
	elif d['status'] == 'finished':
		progress_data[download_id] = {
			'status': 'Download finished',
			'percent': 100,
			'speed': 'N/A',
			'eta': '0s',
			'done': True
		}

@app.route('/')
def index():
	return render_template_string(HTML_PAGE)

@app.route('/download', methods=['POST'])
def download():
	data = request.get_json()
	url = data.get('url')
	quality = data.get('quality', 'best')
	download_id = str(abs(hash(url + quality)))
	progress_data[download_id] = {'status': 'Queued', 'percent': 0, 'speed': 'N/A', 'eta': 'N/A', 'done': False}

	def run_download():
		ydl_opts = {
			'outtmpl': os.path.join(DOWNLOAD_FOLDER, '%(title)s.%(ext)s'),
			'format': quality if quality in ['best', '1080p', '720p'] else 'best',
			'progress_hooks': [lambda d: ydl_progress_hook({**d, 'download_id': download_id})],
		}
		with yt_dlp.YoutubeDL(ydl_opts) as ydl:
			try:
				ydl.download([url])
			except Exception as e:
				progress_data[download_id] = {'status': f'Error: {str(e)}', 'percent': 0, 'speed': 'N/A', 'eta': 'N/A', 'done': True}

	threading.Thread(target=run_download, daemon=True).start()
	return jsonify({'id': download_id})

@app.route('/progress/<download_id>')
def progress(download_id):
	data = progress_data.get(download_id, {'status': 'Unknown', 'percent': 0, 'speed': 'N/A', 'eta': 'N/A', 'done': False})
	return jsonify(data)

if __name__ == '__main__':
	app.run(debug=True)
