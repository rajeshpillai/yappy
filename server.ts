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

// Routes
app.get('/api/drawings', (req, res) => {
    try {
        const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
        res.json(files);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read directory' });
    }
});

app.get('/api/drawings/:id', (req, res) => {
    const filePath = path.join(DATA_DIR, `${req.params.id}.json`);
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        res.json(JSON.parse(content));
    } else {
        res.status(404).json({ error: 'Drawing not found' });
    }
});

app.post('/api/drawings/:id', (req, res) => {
    const filePath = path.join(DATA_DIR, `${req.params.id}.json`);
    try {
        fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save drawing' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
