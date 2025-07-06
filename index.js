const express = require('express');
const app = express();
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const xml2js = require('xml2js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Initialize electron application.
const { app: electronApp, dialog } = require('electron');

// Initialize Gemini API.
if (!process.env.GEMINI_API_KEY) {
    if (electronApp) {
        dialog.showErrorBox('API Key Missing', 'GEMINI_API_KEY is missing. Please set GEMINI_API_KEY in your .env file.');
    } else {
        console.error("Error: GEMINI_API_KEY is missing. Please set GEMINI_API_KEY in your .env file.");
    }
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Initialize arxivjsdata folder.
const dataPath = electronApp ? path.join(electronApp.getPath('userData'), 'arxivjsdata') : path.join(__dirname, 'arxivjsdata');

if (electronApp) {
    try {
        fs.mkdir(dataPath, { recursive: true });
    } catch (e) {
        console.log("arxivjsdata dir already exists");
    }
} else {
    try {
        fs.mkdir(dataPath, { recursive: true });
    } catch (e) {
        console.log("arxivjsdata dir already exists");
    }
   
}

// Check userprompt.txt file.
const userPromptPath = path.join(dataPath, 'userprompt.txt');
(async () => {
    try {
        await fs.access(userPromptPath);
    } catch (error) {
        const errorMessage = `"userprompt.txt" file is missing. Please check if the file "userprompt.txt" exists in ${dataPath}.`;
        if (electronApp) {
            dialog.showErrorBox('User Prompt Missing', errorMessage);
        } else {
            console.error(`Error: ${errorMessage}`);
        }
        process.exit(1);
    }
})();

// Initialize express server.
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Establish API access points.
app.get('/topics', async (req, res) => {
    try {
        const files = await fs.readdir(dataPath);
        const topics = [];

        for (const file of files) {
            if (file.startsWith('.')) continue;

            const fullPath = path.join(dataPath, file);

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
        if (!/^[a-zA-Z0-9\uAC00-\uD7A3\s()\-]+$/.test(topicName)) {
            return res.status(400).json({ message: 'Invalid topic name.' });
        }
        await fs.mkdir(path.join(dataPath, topicName));
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
        await fs.rename(path.join(dataPath, req.params.oldName), path.join(dataPath, newName));
        res.json({ message: 'Topic renamed successfully.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.delete('/topics/:topicName', async (req, res) => {
    try {
        const topicPath = path.join(dataPath, req.params.topicName);
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
        const topicPath = path.join(dataPath, req.params.topicName);
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
        await fs.writeFile(path.join(dataPath, req.params.topicName, fileName), JSON.stringify(paper, null, 2));
        res.status(201).json({ message: 'Paper saved successfully.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.put('/papers/:topicName/:paperId', async (req, res) => {
    try {
        const { newTopicName } = req.body;
        const oldPath = path.join(dataPath, req.params.topicName, req.params.paperId + '.json');
        const newPath = path.join(dataPath, newTopicName, req.params.paperId + '.json');
        await fs.rename(oldPath, newPath);

        const oldMdPath = path.join(dataPath, req.params.topicName, req.params.paperId + '.md');
        const newMdPath = path.join(dataPath, newTopicName, req.params.paperId + '.md');
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
        await fs.unlink(path.join(dataPath, req.params.topicName, req.params.paperId + '.json'));
        try {
            await fs.unlink(path.join(dataPath, req.params.topicName, req.params.paperId + '.md'));
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
        let { keyword, year, count } = req.query;

        if (!keyword) {
            return res.json([]);
        }

        if (!count || isNaN(parseInt(count))) {
            count = 100;
        }

        keyword = keyword.replace(/[<>#%{}|\\^~\[\]`'"`;\/?:@&=+$,!\s]/g, " ").replace(/\s+/g, " ").trim().replace(/\s/g, "+");
        let query = `http://export.arxiv.org/api/query?search_query=all:`
            + keyword
            + `&max_results=${count}&sortBy=relevance&sortOrder=descending`;

        const response = await axios.get(query);
        const parser = new xml2js.Parser({ explicitArray: false });
        const result = await parser.parseStringPromise(response.data);
        const entries = result.feed.entry;

        console.log('Searching with keyword = ' + keyword);

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
        console.log(error.message);
        return res.json([]);
    }
});

app.get('/paper-summary/:topicName/:paperId', async (req, res) => {
    try {
        const { topicName, paperId } = req.params;
        const mdPath = path.join(dataPath, topicName, paperId + '.md');
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
        const topicPath = path.join(dataPath, topicName);
        await fs.mkdir(topicPath, { recursive: true });

        const jsonFilePath = path.join(topicPath, fileName + '.json');
        const mdFilePath = path.join(topicPath, fileName + '.md');
        const paperDetails = { url, title, authors, year, abstract };
        await fs.writeFile(jsonFilePath, JSON.stringify(paperDetails, null, 2));
        const pdfUrl = url.replace('/abs/', '/pdf/');
        const response = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
        const pdfParser = require('pdf-parse');
        const data = await pdfParser(response.data);
        const userPrompt = await fs.readFile(path.join(dataPath, 'userprompt.txt'), 'utf-8');
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

// Start express server.
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Data path: ${dataPath}`);
});

module.exports = server;
