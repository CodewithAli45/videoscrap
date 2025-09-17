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
        const data = await response.json();

        // Update the progress bar with the server's task progress (getting the link)
        document.getElementById('bar-fill').style.width = data.percent + '%';
        document.getElementById('details').textContent = `Progress: ${Math.round(data.percent)}% - ${data.status}`;

        if (data.done) {
            if (data.direct_url) {
                // SUCCESS! The server found the direct link.
                document.getElementById('status').textContent = 'Starting your download now...';
                document.getElementById('details').textContent = 'The download will appear in your browser\'s download manager.';

                // Show the manual link just in case
                const downloadLink = document.getElementById('download-link');
                downloadLink.href = data.direct_url;
                downloadLink.style.display = 'block';
                downloadLink.textContent = 'Click here if the download does not start automatically.';

                // TRIGGER THE DOWNLOAD IN THE USER'S BROWSER
                window.location.href = data.direct_url;

            } else {
                // The server encountered an error getting the link
                document.getElementById('status').textContent = 'Error: Failed to prepare download.';
                document.getElementById('details').textContent = data.status || 'Unknown error occurred.';
            }
            // Stop polling
            return;
        }
        // If not done, check again in a second
        setTimeout(pollProgress, 1000);
    } catch (error) {
        console.error("Polling error:", error);
        setTimeout(pollProgress, 1000);
    }
}

// Optionally, attach event listeners if not using inline HTML attributes
// document.getElementById('url').addEventListener('blur', fetchQualities);
// document.getElementById('download-button').addEventListener('click', startDownload);
