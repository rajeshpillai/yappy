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
// Helper to get all files recursively
const getRecursiveFiles = (dir: string, baseDir: string = ''): string[] => {
    let results: string[] = [];
    const list = fs.readdirSync(dir);

    list.forEach(file => {
        const filePath = path.join(dir, file);
        const relativePath = path.join(baseDir, file);
        const stat = fs.statSync(filePath);

        if (stat && stat.isDirectory()) {
            results = results.concat(getRecursiveFiles(filePath, relativePath));
        } else {
            if (file.endsWith('.json') || file.endsWith('.yappy')) {
                results.push(relativePath);
            }
        }
    });
    return results;
};

// Routes
app.get('/api/drawings', (req, res) => {
    try {
        const files = getRecursiveFiles(DATA_DIR);
        res.json(files);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to read directory' });
    }
});

// Use wildcard matching for nested paths (Regex to avoid path-to-regexp issues)
app.get(/^\/api\/drawings\/(.+)$/, (req, res) => {
    // req.params[0] contains the wildcard part
    const fileId = (req.params as any)[0];
    const jsonPath = path.join(DATA_DIR, `${fileId}.json`);
    const yappyPath = path.join(DATA_DIR, `${fileId}.yappy`);

    // Basic path traversal protection
    if (!jsonPath.startsWith(DATA_DIR) || !yappyPath.startsWith(DATA_DIR)) {
        res.status(403).json({ error: 'Invalid path' });
        return;
    }

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

app.post(/^\/api\/drawings\/(.+)$/, (req, res) => {
    const fileId = (req.params as any)[0];

    // Determine extension based on content type or just default to .yappy for new saves if it's binary
    const isBinary = req.is('application/octet-stream') || req.is('application/gzip') || req.is('application/x-gzip');
    const ext = isBinary ? '.yappy' : '.json';
    const filePath = path.join(DATA_DIR, `${fileId}${ext}`);

    // Basic path traversal protection
    if (!filePath.startsWith(DATA_DIR)) {
        res.status(403).json({ error: 'Invalid path' });
        return;
    }

    // Ensure parent directory exists
    const dirname = path.dirname(filePath);
    if (!fs.existsSync(dirname)) {
        fs.mkdirSync(dirname, { recursive: true });
    }

    // If saving as .yappy, remove potential .json duplicate to avoid confusion
    if (isBinary) {
        const jsonPath = path.join(DATA_DIR, `${fileId}.json`);
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
        console.error(error);
        res.status(500).json({ error: 'Failed to save drawing' });
    }
});

app.delete(/^\/api\/drawings\/(.+)$/, (req, res) => {
    const fileId = (req.params as any)[0];
    const jsonPath = path.join(DATA_DIR, `${fileId}.json`);
    const yappyPath = path.join(DATA_DIR, `${fileId}.yappy`);

    // Basic path traversal protection
    if (!jsonPath.startsWith(DATA_DIR) || !yappyPath.startsWith(DATA_DIR)) {
        res.status(403).json({ error: 'Invalid path' });
        return;
    }

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
        console.error(error);
        res.status(500).json({ error: 'Failed to delete drawing' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
