const fs = require('fs');
const path = require('path');
const express = require('express');
const axios = require('axios');
const { parseString } = require('xml2js');

const app = express();
const port = 3000;

const dataDir = path.join(__dirname, 'data');


if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

app.use(express.static(__dirname));
app.use(express.json());

/**
 * GET /api/topics
 * Retrieves a list of all topic directories under the "data" directory.
 * 
 * Response:
 * - 200: JSON array of topic names
 * - 500: Error reading the topics
 */
app.get('/api/topics', (req, res) => {
    fs.readdir(dataDir, (err, files) => {
        if (err) {
            res.status(500).send('Error reading topics');
        } else {
            res.json(files);
        }
    });
});

/**
 * POST /api/topics
 * Creates a new topic directory under the "data" folder.
 * 
 * Request body:
 * - topic: string (only Korean, English, digits, and spaces allowed)
 * 
 * Response:
 * - 201: Topic created
 * - 400: Invalid topic name
 * - 500: Error creating topic
 */
app.post('/api/topics', (req, res) => {
    const newTopic = req.body.topic.replace(/\s+/g, ' ').trim();

    if (!newTopic || !/^[a-zA-Z0-9가-힣 ]+$/.test(newTopic)) {
        return res.status(400).send('Invalid topic name');
    }

    const newTopicPath = path.join(dataDir, newTopic);

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
 * Deletes a topic directory only if it is empty.
 * 
 * URL Parameter:
 * - topic: topic name to delete
 * 
 * Response:
 * - 200: Topic deleted
 * - 400: Topic not empty
 * - 500: Error reading or deleting topic
 */
app.delete('/api/topics/:topic', (req, res) => {
    const topic = req.params.topic.replace(/\s+/g, ' ').trim();
    const topicPath = path.join(dataDir, topic);

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
 * Renames an existing topic directory.
 * 
 * URL Parameter:
 * - topic: current topic name
 * 
 * Request body:
 * - topic: new topic name (validated)
 * 
 * Response:
 * - 200: Topic renamed
 * - 400: Invalid new topic name
 * - 500: Error renaming topic
 */
app.put('/api/topics/:topic', (req, res) => {
    const oldTopic = req.params.topic;
    const newTopic = req.body.topic.replace(/\s+/g, ' ').trim();

    if (!newTopic || !/^[a-zA-Z0-9가-힣 ]+$/.test(newTopic)) {
        return res.status(400).send('Invalid topic name');
    }

    const oldTopicPath = path.join(dataDir, oldTopic);
    const newTopicPath = path.join(dataDir, newTopic);

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
 * Searches arXiv API for papers matching the given query.
 * 
 * Query Parameters:
 * - query: string (required), used for title/author/abstract search
 * - maxResults: number (optional), default 100
 * 
 * Response:
 * - 200: Array of paper objects with id, title, author, summary, year
 * - 400: Missing query
 * - 500: API or XML parsing error
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
                    summary: entry.summary[0].trim(),
                    year: new Date(entry.published[0]).getFullYear()
                };
            });
            res.json(papers);
        });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching from arXiv API' });
    }
});

/**
 * Starts the Express server on the defined port.
 */
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});