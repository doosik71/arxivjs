const express = require('express');
const app = express();
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const xml2js = require('xml2js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

if (!process.env.GEMINI_API_KEY) {
    console.error("Error: GEMINI_API_KEY is missing. Please set GEMINI_API_KEY in your .env file.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/topics', async (req, res) => {
    try {
        const dataDir = path.join(__dirname, 'data');
        const files = await fs.readdir(dataDir);
        const topics = [];

        for (const file of files) {
            if (file.startsWith('.')) continue;

            const fullPath = path.join(dataDir, file);

            try {
                const stat = await fs.stat(fullPath);
                if (stat.isDirectory()) {
                    topics.push(file);
                }
            } catch (e) {
                console.warn(`Ignored: ${file}`, e.message);
            }
        }

        res.json(topics.sort());
    } catch (error) {
        console.error('Error in /topics:', error);
        res.status(200).json([]);
    }
});

app.post('/topics', async (req, res) => {
    try {
        const { topicName } = req.body;
        if (!/^[a-zA-Z0-9\uAC00-\uD7A3\s]+$/.test(topicName)) {
            return res.status(400).json({ message: 'Invalid topic name.' });
        }
        await fs.mkdir(path.join(__dirname, 'data', topicName));
        res.status(201).json({ message: 'Topic created successfully.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.put('/topics/:oldName', async (req, res) => {
    try {
        const { newName } = req.body;
        if (!/^[a-zA-Z0-9\uAC00-\uD7A3\s]+$/.test(newName)) {
            return res.status(400).json({ message: 'Invalid topic name.' });
        }
        await fs.rename(path.join(__dirname, 'data', req.params.oldName), path.join(__dirname, 'data', newName));
        res.json({ message: 'Topic renamed successfully.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.delete('/topics/:topicName', async (req, res) => {
    try {
        const topicPath = path.join(__dirname, 'data', req.params.topicName);
        const files = await fs.readdir(topicPath);
        if (files.length > 0) {
            return res.status(400).json({ message: 'Topic folder is not empty.' });
        }
        await fs.rmdir(topicPath);
        res.json({ message: 'Topic deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/papers/:topicName', async (req, res) => {
    try {
        const topicPath = path.join(__dirname, 'data', req.params.topicName);
        const files = await fs.readdir(topicPath);
        const papers = [];
        for (const file of files) {
            if (path.extname(file) === '.json') {
                const content = await fs.readFile(path.join(topicPath, file), 'utf-8');
                papers.push(JSON.parse(content));
            }
        }
        papers.sort((a, b) => {
            if (b.year !== a.year) {
                return b.year - a.year;
            }
            return a.title.localeCompare(b.title);
        });
        res.json(papers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/papers/:topicName', async (req, res) => {
    try {
        const { paper } = req.body;
        const fileName = Buffer.from(paper.url).toString('base64') + '.json';
        await fs.writeFile(path.join(__dirname, 'data', req.params.topicName, fileName), JSON.stringify(paper, null, 2));
        res.status(201).json({ message: 'Paper saved successfully.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.put('/papers/:topicName/:paperId', async (req, res) => {
    try {
        const { newTopicName } = req.body;
        const oldPath = path.join(__dirname, 'data', req.params.topicName, req.params.paperId + '.json');
        const newPath = path.join(__dirname, 'data', newTopicName, req.params.paperId + '.json');
        await fs.rename(oldPath, newPath);

        const oldMdPath = path.join(__dirname, 'data', req.params.topicName, req.params.paperId + '.md');
        const newMdPath = path.join(__dirname, 'data', newTopicName, req.params.paperId + '.md');
        try {
            await fs.rename(oldMdPath, newMdPath);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }

        res.json({ message: 'Paper moved successfully.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.delete('/papers/:topicName/:paperId', async (req, res) => {
    try {
        await fs.unlink(path.join(__dirname, 'data', req.params.topicName, req.params.paperId + '.json'));
        try {
            await fs.unlink(path.join(__dirname, 'data', req.params.topicName, req.params.paperId + '.md'));
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
        res.json({ message: 'Paper deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/search', async (req, res) => {
    try {
        const { keyword, year } = req.query;
        let query = `search_query=ti:"${keyword}"+OR+au:"${keyword}"+OR+abs:"${keyword}"&max_results=1000`;
        const response = await axios.get(`http://export.arxiv.org/api/query?${query}`);
        const parser = new xml2js.Parser({ explicitArray: false });
        const result = await parser.parseStringPromise(response.data);
        const entries = result.feed.entry;

        if (!entries) {
            return res.json([]);
        }

        if (!Array.isArray(entries)) {
            entries = [entries];
        }

        let papers = entries.map(entry => ({
            title: entry.title,
            authors: Array.isArray(entry.author) ? entry.author.map(a => a.name).join(', ') : entry.author.name,
            year: new Date(entry.published).getFullYear(),
            url: entry.id,
            abstract: entry.summary.trim()
        }));

        if (year) {
            const [start, end] = year.split('~').map(Number);
            papers = papers.filter(p => p.year >= start && p.year <= end);
        }

        papers.sort((a, b) => {
            if (b.year !== a.year) {
                return b.year - a.year;
            }
            return a.title.localeCompare(b.title);
        });

        res.json(papers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/paper-summary/:topicName/:paperId', async (req, res) => {
    try {
        const { topicName, paperId } = req.params;
        const mdPath = path.join(__dirname, 'data', topicName, paperId + '.md');
        const summary = await fs.readFile(mdPath, 'utf-8');
        res.json({ summary });
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.status(404).json({ message: 'Summary not found.' });
        } else {
            res.status(500).json({ message: error.message });
        }
    }
});

app.post('/summarize-and-save', async (req, res) => {
    try {
        const { paper, topicName } = req.body;
        const { url, title, authors, year, abstract } = paper;

        const fileName = Buffer.from(url).toString('base64');
        const topicPath = path.join(__dirname, 'data', topicName);
        await fs.mkdir(topicPath, { recursive: true });

        const jsonFilePath = path.join(topicPath, fileName + '.json');
        const mdFilePath = path.join(topicPath, fileName + '.md');
        const paperDetails = { url, title, authors, year, abstract };
        await fs.writeFile(jsonFilePath, JSON.stringify(paperDetails, null, 2));
        const pdfUrl = url.replace('/abs/', '/pdf/');
        const response = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
        const pdfParser = require('pdf-parse');
        const data = await pdfParser(response.data);
        const userPrompt = await fs.readFile(path.join(__dirname, 'data', 'userprompt.txt'), 'utf-8');
        const prompt = userPrompt.replace('{context}', data.text);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContentStream(prompt);

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        let summaryContent = '';
        for await (const chunk of result.stream) {
            const textChunk = chunk.text?.();
            if (textChunk) {
                res.write(`data: ${JSON.stringify(textChunk)}\n\n`);
                summaryContent += textChunk;
            }
        }

        res.end();

        await fs.writeFile(mdFilePath, summaryContent);
    } catch (error) {
        console.error('Error in /summarize-and-save:', error);
        if (!res.headersSent) {
            res.status(500).json({ message: error.message });
        } else {
            res.end();
        }
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
