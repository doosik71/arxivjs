require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const pdf = require('pdf-parse');
const http = require('http');
const fs = require('fs');
const path = require('path');
const express = require('express');
const axios = require('axios');
const { parseString } = require('xml2js');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const app = express();
const port = 3000;

const dataDir = path.join(__dirname, 'data');
const topicDir = path.join(__dirname, 'data', 'topic');
const summaryDir = path.join(__dirname, 'data', 'summary');

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}
if (!fs.existsSync(topicDir)) {
    fs.mkdirSync(topicDir);
}
if (!fs.existsSync(summaryDir)) {
    fs.mkdirSync(summaryDir);
}

app.use(express.static(__dirname));
app.use(express.json());

/**
 * GET /api/topics
 * 
 * Retrieves a list of all topic directories under the "data/topic" folder.
 * 
 * Response:
 * - 200: JSON array of topic folder names.
 * - 500: If directory reading fails.
 */
app.get('/api/topics', (req, res) => {
    fs.readdir(topicDir, (err, files) => {
        if (err) {
            res.status(500).send('Error reading topics');
        } else {
            res.json(files);
        }
    });
});

/**
 * POST /api/topics
 * 
 * Creates a new topic folder inside the "data/topic" directory.
 * 
 * Request body:
 * - topic: string (required) — topic name (validated with regex).
 * 
 * Response:
 * - 201: Topic created successfully.
 * - 400: Invalid topic name.
 * - 500: Error creating the directory.
 */
app.post('/api/topics', (req, res) => {
    const newTopic = req.body.topic.replace(/\s+/g, ' ').trim();

    if (!newTopic || !/^[a-zA-Z0-9가-힣 ]+$/.test(newTopic)) {
        return res.status(400).send('Invalid topic name');
    }

    const newTopicPath = path.join(topicDir, newTopic);

    fs.mkdir(newTopicPath, (err) => {
        if (err) {
            res.status(500).send('Error creating topic');
        } else {
            res.status(201).send('Topic created');
        }
    });
});

/**
 * DELETE /api/topics/:topic
 * 
 * Deletes an existing topic folder, only if it is empty.
 * 
 * Path parameter:
 * - topic: string — name of the topic to delete.
 * 
 * Response:
 * - 200: Topic deleted.
 * - 400: Topic folder is not empty.
 * - 500: Error reading or deleting the folder.
 */
app.delete('/api/topics/:topic', (req, res) => {
    const topic = req.params.topic.replace(/\s+/g, ' ').trim();
    const topicPath = path.join(topicDir, topic);

    fs.readdir(topicPath, (err, files) => {
        if (err) {
            return res.status(500).send('Error reading topic directory');
        }

        if (files.length > 0) {
            return res.status(400).send('Topic directory is not empty');
        }

        fs.rmdir(topicPath, (err) => {
            if (err) {
                res.status(500).send('Error deleting topic');
            } else {
                res.status(200).send('Topic deleted');
            }
        });
    });
});

/**
 * PUT /api/topics/:topic
 * 
 * Renames an existing topic folder.
 * 
 * Path parameter:
 * - topic: string — current topic name.
 * 
 * Request body:
 * - topic: string — new topic name.
 * 
 * Response:
 * - 200: Rename successful.
 * - 400: Invalid new topic name.
 * - 500: Error renaming the folder.
 */
app.put('/api/topics/:topic', (req, res) => {
    const oldTopic = req.params.topic;
    const newTopic = req.body.topic.replace(/\s+/g, ' ').trim();

    if (!newTopic || !/^[a-zA-Z0-9가-힣 ]+$/.test(newTopic)) {
        return res.status(400).send('Invalid topic name');
    }

    const oldTopicPath = path.join(topicDir, oldTopic);
    const newTopicPath = path.join(topicDir, newTopic);

    fs.rename(oldTopicPath, newTopicPath, (err) => {
        if (err) {
            res.status(500).send('Error renaming topic');
        } else {
            res.status(200).send('Topic renamed');
        }
    });
});

/**
 * GET /api/search
 * 
 * Searches for academic papers using the arXiv API based on a given query.
 * The search includes matches in the title, author, and abstract fields.
 * Results are sorted by last updated date in descending order.
 * 
 * Query Parameters:
 * - query (string, required): The keyword to search for.
 * - maxResults (number, optional): Maximum number of results to return (default is 100).
 * 
 * Response:
 * - 200 OK: An array of paper objects (id, title, author(s), abstract, year).
 * - 400 Bad Request: If the query parameter is missing.
 * - 500 Internal Server Error: If the API request or XML parsing fails.
 */
app.get('/api/search', async (req, res) => {
    const query = req.query.query;
    const maxResults = req.query.maxResults || 100;

    if (!query) {
        return res.status(400).json({ error: 'Query is required' });
    }

    try {
        const response = await axios.get('http://export.arxiv.org/api/query', {
            params: {
                search_query: `ti:"${query}" OR au:"${query}" OR abs:"${query}"`,
                max_results: maxResults,
                sortBy: 'lastUpdatedDate',
                sortOrder: 'descending'
            }
        });

        parseString(response.data, (err, result) => {
            if (err) {
                return res.status(500).json({ error: 'Error parsing XML' });
            }

            const entries = result.feed.entry;
            if (!entries) {
                return res.json([]);
            }

            const papers = entries.map(entry => {
                const authors = Array.isArray(entry.author) ? entry.author.map(a => a.name[0]) : [entry.author.name[0]];

                return {
                    id: entry.id[0],
                    title: entry.title[0].trim(),
                    author: authors.join(', '),
                    abstract: entry.summary[0].trim(),
                    year: new Date(entry.published[0]).getFullYear(),
                    summary: null
                };
            });
            res.json(papers);
        });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching from arXiv API' });
    }
});

/**
 * POST /api/summarize
 * 
 * Downloads a paper PDF from arXiv, extracts its text,
 * generates a summary using Gemini API, and saves the result to disk.
 * 
 * Request body:
 * - paper: object with at least an `id` field (arXiv URL).
 * 
 * Response:
 * - 200: Streaming response with summary text.
 * - 500: On download, parsing, or summarization failure.
 */
app.post('/api/summarize', async (req, res) => {
    try {
        const paper = req.body;
        const pdfUrl = paper.id.replace('/abs/', '/pdf/');

        const response = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
        const pdfBuffer = Buffer.from(response.data, 'binary');

        const data = await pdf(pdfBuffer);
        const textContent = data.text;

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Please summarize the following research paper text:\n\n${textContent}`;

        const result = await model.generateContentStream(prompt);

        res.setHeader('Content-Type', 'text/plain');
        res.flushHeaders();

        let fullSummary = '';
        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            res.write(chunkText);
            fullSummary += chunkText;
        }

        const paperId = paper.id.split('/').pop();
        const filePath = path.join(summaryDir, `${paperId}.json`);
        const finalData = { ...paper, summary: fullSummary };

        fs.writeFile(filePath, JSON.stringify(finalData, null, 2), (err) => {
            if (err) {
                console.error('Error saving summary:', err);
            }
        });

        res.end();

    } catch (error) {
        console.error('Error during summarization:', error);
        res.status(500).send('Failed to summarize paper.');
    }
});

/**
 * GET /api/summary/:filename
 * 
 * Retrieves a saved summary JSON file by filename.
 * 
 * Path parameter:
 * - filename: string — name of the JSON file (e.g. 1234.5678.json).
 * 
 * Response:
 * - 200: Parsed summary object.
 * - 404: File not found.
 * - 500: File reading error.
 */
app.get('/api/summary/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(summaryDir, filename);

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                return res.status(404).send('Summary not found');
            }
            return res.status(500).send('Error reading summary file');
        }
        res.json(JSON.parse(data));
    });
});

/**
 * POST /api/paper
 * 
 * Saves a full paper metadata object (possibly with summary)
 * to the local summary directory.
 * 
 * Request body:
 * - paper: object (must include `id` field).
 * 
 * Response:
 * - 200: File saved.
 * - 400: Missing or invalid data.
 * - 500: File writing error.
 */
app.post('/api/paper', (req, res) => {
    const paper = req.body;
    if (!paper || !paper.id) {
        return res.status(400).send('Invalid paper data');
    }

    const paperId = paper.id.split('/').pop();
    const filePath = path.join(summaryDir, `${paperId}.json`);

    fs.writeFile(filePath, JSON.stringify(paper, null, 2), (err) => {
        if (err) {
            return res.status(500).send('Error saving paper data');
        }
        res.status(200).send('Paper data saved');
    });
});

/**
 * Starts the Express server on the specified port.
 */
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
