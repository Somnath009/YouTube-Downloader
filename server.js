const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir);
}

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/api/info', (req, res) => {
    const videoUrl = req.query.url;

    if (!videoUrl) {
        return res.status(400).json({ error: 'URL is required' });
    }

    const ytDlp = spawn('yt-dlp', [
        '-j',
        '--no-playlist',
        videoUrl
    ], { shell: true });

    let output = '';
    let errorOutput = '';

    ytDlp.stdout.on('data', (data) => {
        output += data.toString();
    });

    ytDlp.stderr.on('data', (data) => {
        errorOutput += data.toString();
    });

    ytDlp.on('close', (code) => {
        if (code !== 0) {
            return res.status(500).json({ error: 'Failed to fetch video info' });
        }

        try {
            const info = JSON.parse(output);

            res.json({
                title: info.title,
                thumbnail: info.thumbnail,
                duration: info.duration_string,
                uploader: info.uploader,
                formats: (info.formats || []).filter(
                    f => f.vcodec !== 'none' || f.acodec !== 'none'
                )
            });

        } catch {
            res.status(500).json({ error: 'Error parsing video info' });
        }
    });
});

app.get('/api/download', (req, res) => {
    const { url, format, quality } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    const id = Date.now();
    const outputTemplate = path.join(downloadsDir, `${id}.%(ext)s`);

    let ytArgs = [];

    if (format === 'mp3') {
        ytArgs = [
            '-f', 'bestaudio',
            '--extract-audio',
            '--audio-format', 'mp3',
            '-o', outputTemplate,
            url
        ];
    } else {
        const height = quality || '720';

        ytArgs = [
            '-f', `bestvideo[height<=${height}]+bestaudio/best`,
            '--merge-output-format', 'mp4',
            '-o', outputTemplate,
            url
        ];
    }

    const ytDlp = spawn('yt-dlp', ytArgs, { shell: true });

    ytDlp.on('close', (code) => {
        if (code !== 0) {
            return res.status(500).json({ error: 'Download failed' });
        }

        const files = fs.readdirSync(downloadsDir);
        const file = files.find(f => f.startsWith(id));

        if (!file) {
            return res.status(500).json({ error: 'File not found' });
        }

        const filePath = path.join(downloadsDir, file);

        res.download(filePath, () => {
            fs.unlink(filePath, () => {});
        });
    });

    req.on('close', () => {
        if (ytDlp.exitCode === null) {
            ytDlp.kill();
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});