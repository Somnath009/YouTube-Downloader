const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir);
}

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/api/info', async (req, res) => {
    const videoUrl = req.query.url;

    if (!videoUrl) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        const ytDlp = spawn('yt-dlp', [
            '-j',
            '--no-playlist',
            videoUrl
        ]);

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
                console.error(`yt-dlp error: ${errorOutput}`);
                return res.status(500).json({ error: 'Failed to fetch video info' });
            }

            try {
                const info = JSON.parse(output);
                res.json({
                    title: info.title,
                    thumbnail: info.thumbnail,
                    duration: info.duration_string,
                    uploader: info.uploader,
                    formats: info.formats.filter(f => f.vcodec !== 'none' || f.acodec !== 'none')
                });
            } catch (err) {
                res.status(500).json({ error: 'Error parsing video info' });
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/download', (req, res) => {
    const { url, format, quality } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    const timestamp = Date.now();
    const downloadId = `dl_${timestamp}`;
    let outputTemplate = path.join(downloadsDir, `${downloadId}.%(ext)s`);
    
    let ytArgs = [];
    let extension = format === 'mp3' ? 'mp3' : 'mp4';

    if (format === 'mp3') {
        ytArgs = [
            '-x',
            '--audio-format', 'mp3',
            '--audio-quality', '0',
            '-o', outputTemplate,
            url
        ];
    } else {
        const height = quality || '720';
        ytArgs = [
            '-f', `bestvideo[height<=${height}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${height}][ext=mp4]/best`,
            '--merge-output-format', 'mp4',
            '-o', outputTemplate,
            url
        ];
    }

    console.log(`Starting download for: ${url}`);
    const ytDlp = spawn('yt-dlp', ytArgs);

    ytDlp.stderr.on('data', (data) => {
        console.log(`Log: ${data}`);
    });

    ytDlp.on('close', (code) => {
        if (code !== 0) {
            console.error(`yt-dlp failed with code ${code}`);
            return res.status(500).json({ error: 'Download failed' });
        }

        const files = fs.readdirSync(downloadsDir);
        const fileName = files.find(f => f.startsWith(downloadId));

        if (!fileName) {
            return res.status(500).json({ error: 'Downloaded file not found' });
        }

        const filePath = path.join(downloadsDir, fileName);

        res.download(filePath, (err) => {
            if (err) {
                console.error('Error sending file:', err);
            }
            fs.unlink(filePath, (unlinkErr) => {
                if (unlinkErr) console.error('Error deleting temp file:', unlinkErr);
                else console.log(`Cleaned up: ${fileName}`);
            });
        });
    });

    req.on('close', () => {
        if (ytDlp.exitCode === null) {
            ytDlp.kill();
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});


