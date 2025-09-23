const express = require('express');
const app = express();
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const xml2js = require('xml2js');
const multer = require('multer');
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
        // console.log("arxivjsdata dir already exists");
    }
} else {
    try {
        fs.mkdir(dataPath, { recursive: true });
    } catch (e) {
        // console.log("arxivjsdata dir already exists");
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

// Configure CORS to allow ArxiView frontend access
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

// Establish API access points.
async function getTopics(req, res) {
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
}

async function createTopic(req, res) {
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
}

async function renameTopic(req, res) {
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
}

async function deleteTopic(req, res) {
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
}

async function getPapers(req, res) {
    try {
        const topicPath = path.join(dataPath, req.params.topicName);
        const files = await fs.readdir(topicPath);
        const papers = [];
        for (const file of files) {
            if (path.extname(file) === '.json') {
                const content = await fs.readFile(path.join(topicPath, file), 'utf-8');
                const paper = JSON.parse(content);

                // Check for summary
                const baseName = path.basename(file, '.json');
                const mdPath = path.join(topicPath, baseName + '.md');
                try {
                    await fs.access(mdPath);
                    paper.hasSummary = true;
                } catch (e) {
                    paper.hasSummary = false;
                }

                papers.push(paper);
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
}

async function savePaper(req, res) {
    try {
        const { paper } = req.body;
        const fileName = Buffer.from(paper.url).toString('base64') + '.json';
        await fs.writeFile(path.join(dataPath, req.params.topicName, fileName), JSON.stringify(paper, null, 2));
        res.status(201).json({ message: 'Paper saved successfully.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

async function movePaper(req, res) {
    try {
        const { newTopicName } = req.body;
        const oldPath = path.join(dataPath, req.params.topicName, req.params.paperId + '.json');
        const newPath = path.join(dataPath, newTopicName, req.params.paperId + '.json');
        const oldMdPath = path.join(dataPath, req.params.topicName, req.params.paperId + '.md');
        const newMdPath = path.join(dataPath, newTopicName, req.params.paperId + '.md');

        // Check if paper already exists in target topic
        try {
            const existingPaperData = await fs.readFile(newPath, 'utf8');
            const existingPaper = JSON.parse(existingPaperData);

            // Read the paper to be moved
            const movingPaperData = await fs.readFile(oldPath, 'utf8');
            const movingPaper = JSON.parse(movingPaperData);

            // Compare dates and keep the newer one
            const existingDate = new Date(existingPaper.dateAdded || existingPaper.date || 0);
            const movingDate = new Date(movingPaper.dateAdded || movingPaper.date || 0);

            if (movingDate > existingDate) {
                // Moving paper is newer, replace the existing one
                await fs.rename(oldPath, newPath);

                // Handle .md file - check if moving paper has a newer summary
                try {
                    const existingMdStat = await fs.stat(newMdPath);
                    const movingMdStat = await fs.stat(oldMdPath);

                    if (movingMdStat.mtime > existingMdStat.mtime) {
                        await fs.rename(oldMdPath, newMdPath);
                    } else {
                        // Remove old md file since we're keeping the existing one
                        await fs.unlink(oldMdPath);
                    }
                } catch (mdError) {
                    // Handle case where one of the md files doesn't exist
                    try {
                        await fs.rename(oldMdPath, newMdPath);
                    } catch (renameError) {
                        if (renameError.code !== 'ENOENT') {
                            throw renameError;
                        }
                    }
                }

                res.json({ message: 'Paper moved successfully. Newer version replaced existing paper.' });
            } else {
                // Existing paper is newer or same date, just delete the moving paper
                await fs.unlink(oldPath);
                try {
                    await fs.unlink(oldMdPath);
                } catch (error) {
                    if (error.code !== 'ENOENT') {
                        throw error;
                    }
                }
                res.json({ message: 'Paper not moved. Existing paper in target topic is newer or same date.' });
            }
        } catch (error) {
            if (error.code === 'ENOENT') {
                // Paper doesn't exist in target topic, proceed with normal move
                await fs.rename(oldPath, newPath);

                try {
                    await fs.rename(oldMdPath, newMdPath);
                } catch (mdError) {
                    if (mdError.code !== 'ENOENT') {
                        throw mdError;
                    }
                }

                res.json({ message: 'Paper moved successfully.' });
            } else {
                throw error;
            }
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

async function deletePaper(req, res) {
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
}

async function deletePaperSummary(req, res) {
    try {
        await fs.unlink(path.join(dataPath, req.params.topicName, req.params.paperId + '.md'));
        res.json({ message: 'Paper summary deleted successfully.' });
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.status(404).json({ message: 'Summary not found.' });
        } else {
            res.status(500).json({ message: error.message });
        }
    }
}

async function searchArxiv(req, res) {
    try {
        let { keyword, year, count, sort } = req.query;

        if (!keyword) {
            return res.json([]);
        }

        if (!count || isNaN(parseInt(count))) {
            count = 100;
        }

        keyword = keyword.replace(/[<>#%{}|\\^~\[\]`'"`;\/?:@&=+$,!\s]/g, " ").replace(/\s+/g, " ").trim().replace(/\s/g, "+");
        let query = `http://export.arxiv.org/api/query?search_query=all:${keyword}`;

        if (year) {
            const [start, end] = year.split('~').map(Number);
            const startDate = `${start}01010000`;
            const endDate = `${end}12312359`;
            query += `+AND+submittedDate:[${startDate}+TO+${endDate}]`;
        }

        query += `&max_results=${count}&sortBy=relevance&sortOrder=descending`;

        const response = await axios.get(query);
        const parser = new xml2js.Parser({ explicitArray: false });
        const result = await parser.parseStringPromise(response.data);
        const entries = result.feed.entry;

        // console.log('Searching with query = ' + query);

        if (!entries) {
            return res.json([]);
        }

        let papers = Array.isArray(entries) ? entries : [entries];

        papers = papers.map(entry => ({
            title: entry.title,
            authors: Array.isArray(entry.author) ? entry.author.map(a => a.name).join(', ') : entry.author.name,
            year: new Date(entry.published).getFullYear(),
            url: entry.id,
            abstract: entry.summary.trim()
        }));

        if (sort == 'submittedDate') {
            papers.sort((a, b) => {
                if (b.year !== a.year) {
                    return b.year - a.year;
                }
                return a.title.localeCompare(b.title);
            });
        }

        res.json(papers);
    } catch (error) {
        console.log(error.message);
        return res.json([]);
    }
}

async function getPaperSummary(req, res) {
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
}

async function chatWithGemini(req, res) {
    try {
        const { topicName, paperId } = req.params;
        const { history } = req.body;

        const jsonPath = path.join(dataPath, topicName, paperId + '.json');
        const mdPath = path.join(dataPath, topicName, paperId + '.md');

        let paperContext = '';
        try {
            const paperData = await fs.readFile(jsonPath, 'utf-8');
            const paper = JSON.parse(paperData);
            paperContext += `Title: ${paper.title}\nAuthors: ${paper.authors}\nAbstract: ${paper.abstract}\n\n`;
        } catch (error) {
            // Ignore if json file doesn't exist
        }

        try {
            const summary = await fs.readFile(mdPath, 'utf-8');
            paperContext += `AI Summary:\n${summary}`;
        } catch (error) {
            // Ignore if summary file doesn't exist
        }

        if (!paperContext) {
            return res.status(404).json({ message: 'Paper context not found.' });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const conversationHistory = history.slice(0, -1);
        const lastMessage = history[history.length - 1];

        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: `You are a helpful assistant. The user is asking questions about a research paper. Use the following context to answer their questions:\n\n${paperContext}` }],
                },
                {
                    role: "model",
                    parts: [{ text: "Okay, I have the context of the paper. I'm ready to answer questions about it." }],
                },
                ...conversationHistory.map(h => ({
                    role: h.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: h.content }]
                }))
            ],
        });

        const result = await chat.sendMessage(lastMessage.content);
        const response = await result.response;
        const text = response.text();

        res.json({ message: text });

    } catch (error) {
        console.error('Error in /chat:', error);
        res.status(500).json({ message: error.message });
    }
}

async function summarizeAndSave(req, res) {
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
}

async function addPaperByUrl(req, res) {
    try {
        const { paperUrl, topicName } = req.body;
        const paperId = paperUrl.split('/').pop();
        const query = `http://export.arxiv.org/api/query?id_list=${paperId}`;
        const response = await axios.get(query);
        const parser = new xml2js.Parser({ explicitArray: false });
        const result = await parser.parseStringPromise(response.data);
        const entry = result.feed.entry;

        if (!entry) {
            return res.status(404).json({ message: 'Paper not found.' });
        }

        const paper = {
            title: entry.title,
            authors: Array.isArray(entry.author) ? entry.author.map(a => a.name).join(', ') : entry.author.name,
            year: new Date(entry.published).getFullYear(),
            url: entry.id,
            abstract: entry.summary.trim()
        };

        const fileName = Buffer.from(paper.url).toString('base64') + '.json';
        const topicPath = path.join(dataPath, topicName);
        const filePath = path.join(topicPath, fileName);

        try {
            await fs.access(filePath);
            // console.log(`Paper already exists: ${filePath}`);
            res.status(200).json(paper);
        } catch (e) {
            await fs.mkdir(topicPath, { recursive: true });
            await fs.writeFile(filePath, JSON.stringify(paper, null, 2));
            res.status(201).json(paper);
        }
    } catch (error) {
        console.error(`Error with bad request in /paper-by-url:`);
        res.status(500).json({ message: error.message });
    }
}

app.get('/topics', getTopics);
app.post('/topics', createTopic);
app.put('/topics/:oldName', renameTopic);
app.delete('/topics/:topicName', deleteTopic);
app.get('/papers/:topicName', getPapers);
app.post('/papers/:topicName', savePaper);
app.put('/papers/:topicName/:paperId', movePaper);
app.delete('/papers/:topicName/:paperId', deletePaper);
app.delete('/paper-summary/:topicName/:paperId', deletePaperSummary);

async function updateCitation(req, res) {
    try {
        const { topicName, paperId } = req.params;
        const { citation } = req.body;

        if (typeof citation !== 'number') {
            return res.status(400).json({ message: 'Citation count must be a number.' });
        }

        const paperPath = path.join(dataPath, topicName, paperId + '.json');

        const data = await fs.readFile(paperPath, 'utf-8');
        const paper = JSON.parse(data);
        paper.citation = citation;

        await fs.writeFile(paperPath, JSON.stringify(paper, null, 2));

        res.json({ message: 'Citation count updated successfully.', paper });
    } catch (error) {
        if (error.code === 'ENOENT') {
            return res.status(404).json({ message: 'Paper not found.' });
        }
        res.status(500).json({ message: error.message });
    }
}

app.post('/papers/:topicName/:paperId/citation', updateCitation);
app.get('/search', searchArxiv);
app.get('/paper-summary/:topicName/:paperId', getPaperSummary);
app.post('/chat/:topicName/:paperId', chatWithGemini);
app.post('/summarize-and-save', summarizeAndSave);
app.post('/paper-by-url', addPaperByUrl);
app.post('/extract-pdf-text', upload.single('pdf'), extractPdfText);
app.post('/summarize-pdf-text', summarizePdfText);
app.post('/fetch-pdf-url', fetchPdfFromUrl);
app.post('/save-pdf-paper', savePdfPaper);

async function extractPdfText(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No PDF file uploaded' });
        }

        if (req.file.mimetype !== 'application/pdf') {
            return res.status(400).json({ message: 'File must be a PDF' });
        }

        const pdfParser = require('pdf-parse');
        const data = await pdfParser(req.file.buffer);

        res.json({ text: data.text });
    } catch (error) {
        console.error('PDF text extraction error:', error);
        res.status(500).json({ message: 'Failed to extract text from PDF' });
    }
}

async function summarizePdfText(req, res) {
    try {
        const { text, topicName } = req.body;

        if (!text) {
            return res.status(400).json({ message: 'No text provided for summarization' });
        }

        if (!topicName) {
            return res.status(400).json({ message: 'Topic name is required' });
        }

        // Read user prompt template
        const userPrompt = await fs.readFile(path.join(dataPath, 'userprompt.txt'), 'utf-8');
        const prompt = userPrompt.replace('{context}', text);

        // Initialize Gemini model
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContentStream(prompt);

        // Set up streaming response
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        // Stream the summary
        for await (const chunk of result.stream) {
            const textChunk = chunk.text?.();
            if (textChunk) {
                res.write(`data: ${JSON.stringify(textChunk)}\n\n`);
            }
        }

        res.end();

    } catch (error) {
        console.error('PDF text summarization error:', error);
        res.status(500).json({ message: 'Failed to summarize PDF text' });
    }
}

async function fetchPdfFromUrl(req, res) {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ message: 'PDF URL is required' });
        }

        // Fetch PDF from the URL
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        // Set appropriate headers for PDF response
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', response.data.length);

        // Send the PDF data
        res.send(Buffer.from(response.data));

    } catch (error) {
        console.error('PDF URL fetch error:', error);
        res.status(500).json({ message: 'Failed to fetch PDF from URL' });
    }
}

async function savePdfPaper(req, res) {
    try {
        const { paper, summary, topicName } = req.body;

        if (!paper || !summary || !topicName) {
            return res.status(400).json({ message: 'Missing required data: paper, summary, or topicName' });
        }

        // Validate paper data
        if (!paper.title || !paper.authors || !paper.year || !paper.url) {
            return res.status(400).json({ message: 'Paper must include title, authors, year, and url' });
        }

        const topicPath = path.join(dataPath, topicName);

        // Check if topic exists
        try {
            await fs.access(topicPath);
        } catch (error) {
            return res.status(404).json({ message: 'Topic not found' });
        }

        // Generate filename using base64-encoded URL
        const fileName = btoa(paper.url).replace(/[/+=]/g, '_');
        const jsonFilePath = path.join(topicPath, fileName + '.json');
        const mdFilePath = path.join(topicPath, fileName + '.md');

        // Save paper metadata
        await fs.writeFile(jsonFilePath, JSON.stringify(paper, null, 2));

        // Save summary
        await fs.writeFile(mdFilePath, summary);

        res.status(201).json({ message: 'PDF paper saved successfully' });

    } catch (error) {
        console.error('Save PDF paper error:', error);
        res.status(500).json({ message: 'Failed to save PDF paper' });
    }
}

let server;

app.get('/server-info', (req, res) => {
    if (server && server.address()) {
        res.json({
            port: server.address().port,
            hostname: server.address().address,
            dataPath: dataPath,
        });
    } else {
        res.status(503).json({ message: 'Server not available' });
    }
});

// Start express server.
const net = require('net');

/**
 * Finds an available port within a given range.
 * @param {number} startPort - The starting port number.
 * @param {number} endPort - The ending port number.
 * @param {string} host - The host to check the port on.
 * @returns {Promise<number>} A promise that resolves with an available port number.
 */
function findAvailablePort(startPort, endPort, host) {
    return new Promise((resolve, reject) => {
        const checkPort = (port) => {
            if (port > endPort) {
                reject(new Error(`No available ports found between ${startPort} and ${endPort}.`));
                return;
            }
            const server = net.createServer();
            server.listen(port, host, () => {
                server.once('close', () => {
                    resolve(port);
                });
                server.close();
            });
            server.on('error', (err) => {
                if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
                    checkPort(port + 1);
                } else {
                    reject(err);
                }
            });
        };
        checkPort(startPort);
    });
}

/**
 * Starts the express server on an available port.
 * @returns {Promise<{server: *, port: number, hostname: string}>}
 */
async function startServer() {
    const args = process.argv.slice(2);

    function getArgValue(argName) {
        const argIndex = args.indexOf(argName);
        if (argIndex > -1 && args[argIndex + 1]) {
            return args[argIndex + 1];
        }
        return null;
    }

    const HOSTNAME = getArgValue('--host') || 'localhost';
    let port = getArgValue('--port') || process.env.PORT;

    if (!port) {
        try {
            port = await findAvailablePort(8765, 9000, HOSTNAME);
        } catch (err) {
            console.error(err.message);
            // console.log('Defaulting to port 8765.');
            port = 8765;
        }
    }

    return new Promise((resolve) => {
        server = app.listen(port, HOSTNAME, () => {
            console.log(`Server is running on http://${HOSTNAME}:${port}`);
            console.log(`Data path: ${dataPath}`);
            resolve({ server, port, hostname: HOSTNAME });
        });
    });
}

if (require.main === module) {
    startServer();
}

module.exports = { startServer };