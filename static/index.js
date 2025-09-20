let downloadId = null;

async function fetchQualities() {
    const url = document.getElementById('url').value;
    if (!url) {
        alert('Please enter a URL');
        return;
    }
    const qualitySelect = document.getElementById('quality');
    qualitySelect.innerHTML = '<option>Loading...</option>';
    try {
        const response = await fetch('/api/qualities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        let data;
        try {
            data = await response.json();
        } catch (e) {
            const text = await response.text();
            throw new Error('Server did not return JSON. Response was: ' + text);
        }
        qualitySelect.innerHTML = '';
        if (data.qualities && data.qualities.length) {
            data.qualities.forEach(q => {
                const option = document.createElement('option');
                option.value = q.id;
                option.textContent = q.label;
                qualitySelect.appendChild(option);
            });
        } else {
            qualitySelect.innerHTML = '<option>No qualities found</option>';
        }
        // Show poster if available
        const posterDiv = document.getElementById('poster');
        if (data.thumbnail) {
            posterDiv.innerHTML = `<img src="${data.thumbnail}" alt="Video poster" style="width:250px;height:auto;display:block;margin:10px auto 20px auto;border-radius:8px;box-shadow:0 2px 8px #aaa;">`;
        } else {
            posterDiv.innerHTML = '';
        }
    } catch (error) {
        qualitySelect.innerHTML = '<option>Error loading qualities</option>';
        alert('Error: ' + error.message);
    }
}

async function startDownload() {
    const url = document.getElementById('url').value;
    const quality = document.getElementById('quality').value;
    document.getElementById('status').textContent = 'Starting...';
    try {
        const response = await fetch('/api/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, quality_id: quality })
        });
        let data;
        try {
            data = await response.json();
        } catch (e) {
            const text = await response.text();
            throw new Error('Server did not return JSON. Response was: ' + text);
        }
        if (data.error) throw new Error(data.error);
        downloadId = data.id;
        pollProgress();
    } catch (error) {
        document.getElementById('status').textContent = 'Error: ' + error.message;
    }
}

async function pollProgress() {
    if (!downloadId) return;
    try {
        const response = await fetch(`/api/progress/${downloadId}`);
        let data;
        try {
            data = await response.json();
        } catch (e) {
            const text = await response.text();
            throw new Error('Server did not return JSON. Response was: ' + text);
        }
        // Update the progress bar with the server's task progress (getting the link)
        document.getElementById('barfill').style.width = data.percent + '%';
        document.getElementById('status').textContent = data.status;
        document.getElementById('speed').textContent = '';
        document.getElementById('eta').textContent = '';
        if (data.done) {
            if (data.direct_url) {
                document.getElementById('status').textContent = 'Starting your download now...';
                // Option 1: Proxy download to force browser download
                window.location.href = `/api/proxy_download/${downloadId}`;
                // Option 2: Playback page with download button (commented)
                // window.location.href = `/api/playback/${downloadId}`;
            } else {
                document.getElementById('status').textContent = 'Error: Failed to prepare download.';
            }
            return;
        }
        setTimeout(pollProgress, 1000);
    } catch (error) {
        document.getElementById('status').textContent = 'Error: ' + error.message;
        setTimeout(pollProgress, 2000);
    }
}

// Optionally, attach event listeners if not using inline HTML attributes
// document.getElementById('url').addEventListener('blur', fetchQualities);
// document.getElementById('download-button').addEventListener('click', startDownload);
