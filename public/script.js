const videoUrlInput = document.getElementById('videoUrl');
const fetchBtn = document.getElementById('fetchBtn');
const loader = document.getElementById('loader');
const videoPreview = document.getElementById('videoPreview');
const videoThumb = document.getElementById('videoThumb');
const videoTitle = document.getElementById('videoTitle');
const uploaderName = document.getElementById('uploaderName');
const durationTime = document.getElementById('durationTime');
const formatSelect = document.getElementById('formatSelect');
const qualitySelect = document.getElementById('qualitySelect');
const qualityWrapper = document.getElementById('qualityWrapper');
const downloadBtn = document.getElementById('downloadBtn');
const statusMessage = document.getElementById('statusMessage');
const statusText = document.getElementById('statusText');

function resetUI() {
    videoPreview.classList.add('hidden');
    statusMessage.classList.add('hidden');
    loader.classList.add('hidden');
    
    downloadBtn.disabled = false;
    downloadBtn.textContent = 'Download Now';
    downloadBtn.className = 'btn btn-success btn-large';
}

videoUrlInput.addEventListener('input', () => {
    if (!videoPreview.classList.contains('hidden') || !statusMessage.classList.contains('hidden')) {
        resetUI();
    }
});

formatSelect.addEventListener('change', () => {
    if (formatSelect.value === 'mp3') {
        qualityWrapper.classList.add('hidden');
    } else {
        qualityWrapper.classList.remove('hidden');
    }
});

fetchBtn.addEventListener('click', async () => {
    const url = videoUrlInput.value.trim();
    
    if (!url) {
        showStatus('Please enter a valid YouTube URL.', 'error');
        return;
    }

    resetUI();
    loader.classList.remove('hidden');

    try {
        const response = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch video info');
        }

        videoThumb.src = data.thumbnail;
        videoTitle.textContent = data.title;
        uploaderName.textContent = data.uploader;
        durationTime.textContent = data.duration;

        loader.classList.add('hidden');
        videoPreview.classList.remove('hidden');

    } catch (error) {
        loader.classList.add('hidden');
        showStatus(error.message, 'error');
    }
});

downloadBtn.addEventListener('click', async () => {
    const url = videoUrlInput.value.trim();
    const format = formatSelect.value;
    const quality = qualitySelect.value;

    if (!url) return;

    downloadBtn.disabled = true;
    downloadBtn.textContent = 'Downloading...';
    showStatus('Working on your file... please wait.', 'success');

    const downloadUrl = `/api/download?url=${encodeURIComponent(url)}&format=${format}&quality=${quality}`;
    
    try {
        const response = await fetch(downloadUrl);
        
        if (!response.ok) {
            const errData = await response.json().catch(() => null);
            throw new Error(errData?.error || 'Server limit reached or video unavailable.');
        }

        const blob = await response.blob();
        const downloadBlobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadBlobUrl;
        a.download = format === 'mp3' ? 'audio.mp3' : 'video.mp4';
        
        document.body.appendChild(a);
        a.click();
        
        downloadBtn.textContent = 'Downloaded!';
        downloadBtn.className = 'btn btn-primary btn-large';
        showStatus('Download complete! Enjoy your content.', 'success');
        
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadBlobUrl);
        }, 100);

    } catch (error) {
        downloadBtn.disabled = false;
        downloadBtn.textContent = 'Download Failed';
        downloadBtn.className = 'btn btn-primary btn-large';
        showStatus('Oops! Something went wrong while downloading.', 'error');
        console.error(error);
    }
});

function showStatus(message, type) {
    statusText.textContent = message;
    statusMessage.className = 'status-message';
    
    if (type === 'success') {
        statusMessage.classList.add('success');
    }

    statusMessage.classList.remove('hidden');
}

videoUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        fetchBtn.click();
    }
});


