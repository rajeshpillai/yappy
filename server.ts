import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = 3000;
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');

app.use(cors());
app.use(express.json());

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

// Enable raw body parsing for compressed uploads
app.use(express.raw({ type: ['application/octet-stream', 'application/gzip', 'application/x-gzip'], limit: '50mb' }));

// Routes
app.get('/api/drawings', (req, res) => {
    try {
        const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json') || f.endsWith('.yappy'));
        res.json(files);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read directory' });
    }
});

app.get('/api/drawings/:id', (req, res) => {
    const jsonPath = path.join(DATA_DIR, `${req.params.id}.json`);
    const yappyPath = path.join(DATA_DIR, `${req.params.id}.yappy`);

    if (fs.existsSync(yappyPath)) {
        const content = fs.readFileSync(yappyPath);
        res.setHeader('Content-Type', 'application/gzip');
        res.send(content);
    } else if (fs.existsSync(jsonPath)) {
        const content = fs.readFileSync(jsonPath, 'utf-8');
        res.json(JSON.parse(content));
    } else {
        res.status(404).json({ error: 'Drawing not found' });
    }
});

app.post('/api/drawings/:id', (req, res) => {
    // Determine extension based on content type or just default to .yappy for new saves if it's binary
    const isBinary = req.is('application/octet-stream') || req.is('application/gzip') || req.is('application/x-gzip');
    const ext = isBinary ? '.yappy' : '.json';
    const filePath = path.join(DATA_DIR, `${req.params.id}${ext}`);

    // If saving as .yappy, remove potential .json duplicate to avoid confusion
    if (isBinary) {
        const jsonPath = path.join(DATA_DIR, `${req.params.id}.json`);
        if (fs.existsSync(jsonPath)) fs.unlinkSync(jsonPath);
    }

    try {
        if (isBinary) {
            fs.writeFileSync(filePath, req.body);
        } else {
            fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2));
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save drawing' });
    }
});

app.delete('/api/drawings/:id', (req, res) => {
    const jsonPath = path.join(DATA_DIR, `${req.params.id}.json`);
    const yappyPath = path.join(DATA_DIR, `${req.params.id}.yappy`);
    try {
        let deleted = false;
        if (fs.existsSync(yappyPath)) {
            fs.unlinkSync(yappyPath);
            deleted = true;
        }
        if (fs.existsSync(jsonPath)) {
            fs.unlinkSync(jsonPath);
            deleted = true;
        }

        if (deleted) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Drawing not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete drawing' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
