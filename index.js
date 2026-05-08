const express = require('express');
const app = express();
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const xml2js = require('xml2js');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { marked } = require('marked');
const pdfParser = require('pdf-parse');
require('dotenv').config();

// Initialize electron application.
const { app: electronApp, dialog } = require('electron');

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL?.trim();
const OLLAMA_API_URL = process.env.OLLAMA_API_URL?.trim()?.replace(/\/+$/, '');

const llmProviders = {
    gemini: process.env.GEMINI_API_KEY ? {
        name: 'gemini',
        model: GEMINI_MODEL,
        client: new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    } : null,
    ollama: OLLAMA_API_URL && OLLAMA_MODEL ? {
        name: 'ollama',
        model: OLLAMA_MODEL,
        apiUrl: OLLAMA_API_URL
    } : null
};

function slugifyPaperTitle(title) {
    return String(title || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
}

function getPaperStorageId(paper) {
    if (paper?.id) {
        return paper.id;
    }

    return slugifyPaperTitle(paper?.title);
}

function normalizeTopicDisplayName(topicName) {
    return String(topicName || '')
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function toTopicFolderName(topicName) {
    return normalizeTopicDisplayName(topicName).replace(/\s+/g, '_');
}

function toTopicDisplayName(folderName) {
    return normalizeTopicDisplayName(folderName);
}

function isValidTopicName(topicName) {
    return /^[a-zA-Z0-9\uAC00-\uD7A3 ()-]+$/.test(topicName);
}

function getTopicPath(topicName) {
    return path.join(dataPath, toTopicFolderName(topicName));
}

function getAvailableLlmEngines() {
    return Object.entries(llmProviders)
        .filter(([, provider]) => Boolean(provider))
        .map(([engine]) => engine);
}

function getDefaultLlmEngine() {
    const availableEngines = getAvailableLlmEngines();
    if (availableEngines.includes('gemini')) {
        return 'gemini';
    }
    return availableEngines[0] || null;
}

function failStartup(message) {
    if (electronApp) {
        dialog.showErrorBox('LLM Configuration Error', message);
    } else {
        console.error(`Error: ${message}`);
    }
    process.exit(1);
}

if (getAvailableLlmEngines().length === 0) {
    failStartup('Neither Gemini nor Ollama is configured. Please set GEMINI_API_KEY or both OLLAMA_API_URL and OLLAMA_MODEL in your .env file.');
}

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

function normalizeHighlightText(text) {
    if (typeof text !== 'string') {
        return '';
    }

    return text.replace(/\s+/g, ' ').trim();
}

function stripMathFromMarkdown(text) {
    return text
        .replace(/\$\$[\s\S]+?\$\$/g, ' ')
        .replace(/\$([^\n\r$]+?)\$/g, ' ');
}

function decodeHtmlEntities(text) {
    return text
        .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
        .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCodePoint(parseInt(code, 16)))
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}

function fixKoreanFormatting(htmlContent) {
    return htmlContent.replace(/\*\*([^*\r\n]+)\*\*/g, '<strong>$1</strong>');
}

function htmlToDisplayText(html) {
    if (!html) {
        return '';
    }

    // Preserve block-level separation without injecting spaces around inline tags like <strong>.
    const blockBoundaryTags = /<\/?(?:address|article|aside|blockquote|br|caption|dd|div|dl|dt|figcaption|figure|footer|form|h[1-6]|header|hr|li|main|nav|ol|p|pre|section|table|tbody|td|tfoot|th|thead|tr|ul)[^>]*>/gi;
    const withoutBlocks = html.replace(blockBoundaryTags, ' ');
    const withoutTags = withoutBlocks.replace(/<[^>]+>/g, '');
    return decodeHtmlEntities(withoutTags);
}

function markdownToDisplayText(markdownText) {
    const safeMarkdown = stripMathFromMarkdown(markdownText || '');
    let html = marked.parse(safeMarkdown, {
        mangle: false,
        headerIds: false
    });
    html = fixKoreanFormatting(html);

    return normalizeHighlightText(htmlToDisplayText(html));
}

function sanitizeHighlights(highlights, summaryText, summaryFileName = 'unknown.md') {
    const displayText = markdownToDisplayText(summaryText || '');
    const uniqueHighlights = [];
    const seenTexts = new Set();

    for (const highlight of Array.isArray(highlights) ? highlights : []) {
        const normalizedText = normalizeHighlightText(highlight?.text);
        const color = typeof highlight?.color === 'string' ? highlight.color.trim() : '';

        if (!normalizedText || !color || seenTexts.has(normalizedText)) {
            continue;
        }

        if (!displayText.includes(normalizedText)) {
            console.warn(`[highlight-miss] ${summaryFileName} :: ${normalizedText}`);
            continue;
        }

        uniqueHighlights.push({
            text: normalizedText,
            color
        });
        seenTexts.add(normalizedText);
    }

    return uniqueHighlights;
}

async function loadHighlightsFile(topicName, paperId) {
    const highlightPath = path.join(getTopicPath(topicName), paperId + '.hlt');

    try {
        const raw = await fs.readFile(highlightPath, 'utf-8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed?.highlights) ? parsed.highlights : [];
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
}

async function saveHighlightsFile(topicName, paperId, highlights) {
    const highlightPath = path.join(getTopicPath(topicName), paperId + '.hlt');

    if (!highlights.length) {
        try {
            await fs.unlink(highlightPath);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
        return;
    }

    await fs.writeFile(highlightPath, JSON.stringify({
        version: 1,
        highlights
    }, null, 2));
}

function resolveEngine(requestedEngine) {
    const normalizedEngine = typeof requestedEngine === 'string' ? requestedEngine.trim().toLowerCase() : '';
    const availableEngines = getAvailableLlmEngines();

    if (normalizedEngine && availableEngines.includes(normalizedEngine)) {
        return normalizedEngine;
    }

    return getDefaultLlmEngine();
}

function getProviderOrThrow(engine) {
    const resolvedEngine = resolveEngine(engine);
    const provider = resolvedEngine ? llmProviders[resolvedEngine] : null;

    if (!provider) {
        throw new Error(`Requested engine "${engine || 'unknown'}" is not configured.`);
    }

    return { engine: resolvedEngine, provider };
}

function createSseResponse(res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
}

function writeSseChunk(res, chunk) {
    if (chunk) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }
}

async function* parseOllamaNdjson(stream) {
    let buffer = '';

    for await (const chunk of stream) {
        buffer += chunk.toString('utf-8');
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) {
                continue;
            }

            yield JSON.parse(trimmedLine);
        }
    }

    const trailingLine = buffer.trim();
    if (trailingLine) {
        yield JSON.parse(trailingLine);
    }
}

async function* streamGeminiGenerate(prompt) {
    const { provider } = getProviderOrThrow('gemini');
    const model = provider.client.getGenerativeModel({ model: provider.model });
    const result = await model.generateContentStream(prompt);

    for await (const chunk of result.stream) {
        const textChunk = chunk.text?.();
        if (textChunk) {
            yield textChunk;
        }
    }
}

async function* streamGeminiChat(history, paperContext) {
    const { provider } = getProviderOrThrow('gemini');
    const model = provider.client.getGenerativeModel({ model: provider.model });
    const conversationHistory = history.slice(0, -1);
    const lastMessage = history[history.length - 1];

    const chat = model.startChat({
        history: [
            {
                role: 'user',
                parts: [{ text: `You are a helpful assistant. The user is asking questions about a research paper. Use the following context to answer their questions:\n\n${paperContext}` }],
            },
            {
                role: 'model',
                parts: [{ text: "Okay, I have the context of the paper. I'm ready to answer questions about it." }],
            },
            ...conversationHistory.map((entry) => ({
                role: entry.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: entry.content }]
            }))
        ],
    });

    const result = await chat.sendMessageStream(lastMessage.content);
    for await (const chunk of result.stream) {
        const textChunk = chunk.text?.();
        if (textChunk) {
            yield textChunk;
        }
    }
}

async function* streamOllamaGenerate(prompt) {
    const { provider } = getProviderOrThrow('ollama');
    const response = await axios.post(`${provider.apiUrl}/api/generate`, {
        model: provider.model,
        prompt,
        stream: true
    }, {
        responseType: 'stream'
    });

    for await (const entry of parseOllamaNdjson(response.data)) {
        if (entry.response) {
            yield entry.response;
        }
    }
}

async function* streamOllamaChat(history, paperContext) {
    const { provider } = getProviderOrThrow('ollama');
    const messages = [
        {
            role: 'system',
            content: `You are a helpful assistant. The user is asking questions about a research paper. Use the following context to answer their questions:\n\n${paperContext}`
        },
        ...history.map((entry) => ({
            role: entry.role,
            content: entry.content
        }))
    ];

    const response = await axios.post(`${provider.apiUrl}/api/chat`, {
        model: provider.model,
        messages,
        stream: true
    }, {
        responseType: 'stream'
    });

    for await (const entry of parseOllamaNdjson(response.data)) {
        const textChunk = entry.message?.content;
        if (textChunk) {
            yield textChunk;
        }
    }
}

async function generateSingleResponse(engine, prompt) {
    const resolvedEngine = resolveEngine(engine);
    const chunks = [];
    const generator = resolvedEngine === 'ollama'
        ? streamOllamaGenerate(prompt)
        : streamGeminiGenerate(prompt);

    for await (const chunk of generator) {
        chunks.push(chunk);
    }

    return chunks.join('');
}

async function streamSummary(engine, prompt) {
    const resolvedEngine = resolveEngine(engine);
    return resolvedEngine === 'ollama'
        ? streamOllamaGenerate(prompt)
        : streamGeminiGenerate(prompt);
}

async function streamChat(engine, history, paperContext) {
    const resolvedEngine = resolveEngine(engine);
    return resolvedEngine === 'ollama'
        ? streamOllamaChat(history, paperContext)
        : streamGeminiChat(history, paperContext);
}

async function streamGeneratorToSse(res, generator) {
    createSseResponse(res);

    let fullText = '';
    for await (const chunk of generator) {
        writeSseChunk(res, chunk);
        fullText += chunk;
    }

    res.end();
    return fullText;
}

async function backupSummaryFile(summaryPath) {
    try {
        await fs.access(summaryPath);
        await fs.copyFile(summaryPath, `${summaryPath}.bak`);
    } catch (error) {
        if (error.code !== 'ENOENT') {
            throw error;
        }
    }
}

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
                    topics.push(toTopicDisplayName(file));
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
        const normalizedTopicName = normalizeTopicDisplayName(req.body?.topicName);
        if (!normalizedTopicName || !isValidTopicName(normalizedTopicName)) {
            return res.status(400).json({ message: 'Invalid topic name.' });
        }

        const topicPath = getTopicPath(normalizedTopicName);

        try {
            await fs.access(topicPath);
            return res.status(409).json({ message: 'Topic already exists.' });
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }

        await fs.mkdir(topicPath);
        res.status(201).json({ message: 'Topic created successfully.', topicName: normalizedTopicName });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

async function renameTopic(req, res) {
    try {
        const oldTopicName = normalizeTopicDisplayName(req.params.oldName);
        const newTopicName = normalizeTopicDisplayName(req.body?.newName);
        if (!newTopicName || !isValidTopicName(newTopicName)) {
            return res.status(400).json({ message: 'Invalid topic name.' });
        }

        const oldTopicPath = getTopicPath(oldTopicName);
        const newTopicPath = getTopicPath(newTopicName);

        if (oldTopicPath === newTopicPath) {
            return res.json({ message: 'Topic renamed successfully.', topicName: newTopicName });
        }

        try {
            await fs.access(newTopicPath);
            return res.status(409).json({ message: 'Topic already exists.' });
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }

        await fs.rename(oldTopicPath, newTopicPath);
        res.json({ message: 'Topic renamed successfully.', topicName: newTopicName });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

async function deleteTopic(req, res) {
    try {
        const topicPath = getTopicPath(req.params.topicName);
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
        const topicPath = getTopicPath(req.params.topicName);
        const files = await fs.readdir(topicPath);
        const papers = [];
        for (const file of files) {
            if (path.extname(file) === '.json') {
                const content = await fs.readFile(path.join(topicPath, file), 'utf-8');
                const paper = JSON.parse(content);
                paper.id = path.basename(file, '.json');

                // Check for summary
                const baseName = path.basename(file, '.json');
                const mdPath = path.join(topicPath, baseName + '.md');
                try {
                    await fs.access(mdPath);
                    paper.hasSummary = true;
                } catch (e) {
                    paper.hasSummary = false;
                }

                const hltPath = path.join(topicPath, baseName + '.hlt');
                try {
                    await fs.access(hltPath);
                    paper.hasHighlights = true;
                } catch (e) {
                    paper.hasHighlights = false;
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

/**
 * Get DOI from arXiv using title and author.
 * @param {string} title - The title of the paper.
 * @param {string} author - The first author of the paper.
 * @returns {Promise<string|null>} A promise that resolves with the DOI or null.
 */
async function getArxivDOIByAuthorTitle(author, title) {
    const firstAuthor = author.split(',')[0].trim().replace(/\s+/g, ' ');
    const processedTitle = title.replace(/"/g, ''); // Remove quotes for query

    const query = `ti:"${processedTitle}"+AND+au:${firstAuthor.replace(/ /g, '+')}`;
    const apiUrl = `https://export.arxiv.org/api/query?search_query=${query}&max_results=1`;

    try {
        const response = await axios.get(apiUrl, { timeout: 5000 });
        const parser = new xml2js.Parser({ explicitArray: false, tagNameProcessors: [xml2js.processors.stripPrefix] });
        const result = await parser.parseStringPromise(response.data);

        if (result.feed && result.feed.entry) {
            const entry = result.feed.entry;
            if (entry.doi) {
                return entry.doi._ || entry.doi;
            }
            if (entry.link) {
                const doiLink = Array.isArray(entry.link) ? entry.link.find(l => l.$.title === 'doi') : (entry.link.$.title === 'doi' ? entry.link : null);
                if (doiLink) {
                    return doiLink.$.href.replace('https://doi.org/', '');
                }
            }
        }
    } catch (error) {
        // console.wanr("Cound not fetch DOI from arXiv:", error.message);
    }
}

/**
 * Get DOI from arXiv using the paper's URL.
 * @param {string} url - The URL of the paper (e.g., http://arxiv.org/abs/2305.12345).
 * @returns {Promise<string|null>} A promise that resolves with the DOI or null.
 */
async function getArxivDOIByURL(url) {
    const arxivIdMatch = url.match(/(\d{4}\.\d{5}(v\d+)?)/);
    if (!arxivIdMatch) {
        return null;
    }
    const arxivId = arxivIdMatch[0];

    // const query = `id_list=${arxivId}`;
    // const apiUrl = `https://export.arxiv.org/api/query?${query}&max_results=1`;

    // console.log(apiUrl);

    // try {
    //     const response = await axios.get(apiUrl, { timeout: 5000 });
    //     const parser = new xml2js.Parser({ explicitArray: false, tagNameProcessors: [xml2js.processors.stripPrefix] });
    //     const result = await parser.parseStringPromise(response.data);

    //     if (result.feed && result.feed.entry) {
    //         const entry = result.feed.entry;
    //         if (entry.doi) {
    //             // console.log("Success with getArxivDOIByURL");
    //             return entry.doi._ || entry.doi;
    //         }
    //         if (entry.link) {
    //             const doiLink = Array.isArray(entry.link) ? entry.link.find(l => l.$.title === 'doi') : (entry.link.$.title === 'doi' ? entry.link : null);
    //             if (doiLink) {
    //                 // console.log("Success with getArxivDOIByURL");
    //                 return doiLink.$.href.replace('https://doi.org/', '');
    //             }
    //         }
    //     }
    // } catch (error) {
    //     // console.warn("Could not fetch DOI from arXiv by URL:", error.message);
    // }

    // If DOI is not found, construct an arXiv-issued DOI as a last resort.
    if (arxivId) {
        const arxivIdWithoutVersion = arxivId.split('v')[0]; // Remove version suffix like 'v1', 'v2'
        const doi = `10.48550/arXiv.${arxivIdWithoutVersion}`;
        // console.log(doi);
        return doi;
    }

    return null; // Explicitly return null if DOI not found and cannot construct arXiv-issued DOI
}

/**
 * Get citation count from Semantic Scholar using DOI.
 * @param {string} doi - The DOI of the paper.
 * @returns {Promise<number|undefined>} A promise that resolves with the citation count or undefined.
 */
async function getCitationCountByDOIWithSC(doi) {
    const apiUrl = `https://api.semanticscholar.org/graph/v1/paper/DOI:${doi}?fields=citationCount`;

    try {
        const response = await axios.get(apiUrl, { timeout: 5000 });
        if (response.status === 200 && response.data) {
            return response.data.citationCount;
        }
    } catch (error) {
        if (error.response && error.response.status !== 404) {
            // console.error(`Error fetching citation count for DOI ${doi}:`, error.message);
        }
    }

    // console.warn("Could not find citation count from DOI.");
}

/**
 * Get citation count from Semantic Scholar by searching with author and title.
 * @param {string} authors - The authors of the paper.
 * @param {string} title - The title of the paper.
 * @returns {Promise<number|undefined>} A promise that resolves with the citation count or undefined.
 */
async function getCitationCountByAuthorTitleWithSC(authors, title) {
    const firstAuthor = authors.split(',')[0].replace(/\s+/g, ' ').trim();
    const processedTitle = title.replace(/\s+/g, ' ').trim();

    const query = encodeURIComponent(`${firstAuthor} ${processedTitle}`);
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${query}&fields=title,citationCount`;
    // const apiKey = process.env.SEMANTICSCHOLAR_API_KEY;
    // const headers = apiKey ? { 'x-api-key': apiKey } : {};

    try {
        const response = await axios.get(url, {
            // headers: headers,
            timeout: 5000
        });
        if (response.status === 200) {
            if (response.data && response.data.data && response.data.data.length > 0) {
                // console.log("Success with getCitationCountByAuthorTitleWithSC");
                return response.data.data[0].citationCount || 0;
            } else {
                return 0;
            }
        }
    } catch (error) {
        // console.warn('Cound not fetch citation count by search:', error.message);
    }
}

/**
 * Get citation count for a paper using its URL.
 * It first tries to get DOI from arXiv and then use it to get citation count.
 * If that fails, it falls back to searching by author and title (as a backup).
 * @param {string} url - The URL of the paper.
 * @param {string} authors - The authors of the paper (for fallback).
 * @param {string} title - The title of the paper (for fallback).
 * @returns {Promise<number|undefined>} A promise that resolves with the citation count or undefined.
 */
async function getCitationCountByURL(url, authors, title) {
    const doi = await getArxivDOIByURL(url);

    if (doi) {
        const citationCount = await getCitationCountByDOIWithSC(doi.trim());
        if (citationCount !== undefined) {
            // console.log("Success with getCitationCountByDOIWithSC");
            return citationCount;
        }
    }

    // console.warn("Could not find DOI from arXiv by URL. Falling back to search.");
    // Fallback to searching by author and title
    return await getCitationCountByAuthorTitleWithSC(authors, title);
}

/**
 * Get citation count for a paper.
 * It first tries to get DOI from arXiv and then use it to get citation count.
 * If that fails, it falls back to searching by author and title.
 * @param {string} authors - The authors of the paper.
 * @param {string} title - The title of the paper.
 * @returns {Promise<number|undefined>} A promise that resolves with the citation count or undefined.
 */
// async function getCitationCountByAuthorTitle(authors, title) {
//     // Pre-process authors and title to remove newlines and collapse multiple spaces.
//     const processedAuthors = authors.replace(/\s+/g, ' ').trim();
//     const processedTitle = title.replace(/\s+/g, ' ').trim();

//     const doi = await getArxivDOIByAuthorTitle(processedAuthors, processedTitle);

//     if (doi !== undefined) {
//         const citationCount = await getCitationCountByDOIWithSC(doi.trim());
//         if (citationCount !== undefined) {
//             return citationCount;
//         }
//     }

//     // console.warn("Could not find DOI from arXiv.");

//     // Fallback to searching by author and title
//     return await getCitationCountByAuthorTitleWithSC(processedAuthors, processedTitle);
// }

async function savePaper(req, res) {
    try {
        const { paper } = req.body;
        const topicName = req.params.topicName;

        // Sanitize title and authors
        if (paper.title) {
            paper.title = paper.title.replace(/\s+/g, ' ').trim();
        }
        if (paper.authors) {
            paper.authors = paper.authors.replace(/\s+/g, ' ').trim();
        }

        const fileName = getPaperStorageId(paper) + '.json';
        const paperPath = path.join(getTopicPath(topicName), fileName);

        // Save paper without citation count first.
        await fs.writeFile(paperPath, JSON.stringify(paper, null, 2));

        // Respond to the client immediately.
        res.status(201).json({ message: 'Paper saved successfully. Citation count is being fetched in the background.', paper });

        // Background Fetch & Update
        if (paper.citation === undefined) {
            // Fire-and-forget promise for citation fetching.
            getCitationCountByURL(paper.url, paper.authors, paper.title)
                .then(async (citationCount) => {
                    if (citationCount !== undefined) {
                        try {
                            const data = await fs.readFile(paperPath, 'utf-8');
                            const savedPaper = JSON.parse(data);
                            savedPaper.citation = citationCount;
                            await fs.writeFile(paperPath, JSON.stringify(savedPaper, null, 2));
                        } catch (updateError) {
                            console.error(`Failed to update citation for ${fileName}:`, updateError.message);
                        }
                    }
                })
                .catch(error => {
                    console.error(`Error fetching citation in background for ${fileName}:`, error.message);
                });
        }
    } catch (error) {
        if (!res.headersSent) {
            res.status(500).json({ message: error.message });
        } else {
            console.error('Error in savePaper after response sent:', error.message);
        }
    }
}

async function movePaper(req, res) {
    try {
        const { newTopicName } = req.body;
        const oldTopicPath = getTopicPath(req.params.topicName);
        const newTopicPath = getTopicPath(newTopicName);
        const oldPath = path.join(oldTopicPath, req.params.paperId + '.json');
        const newPath = path.join(newTopicPath, req.params.paperId + '.json');
        const oldMdPath = path.join(oldTopicPath, req.params.paperId + '.md');
        const newMdPath = path.join(newTopicPath, req.params.paperId + '.md');
        const oldHltPath = path.join(oldTopicPath, req.params.paperId + '.hlt');
        const newHltPath = path.join(newTopicPath, req.params.paperId + '.hlt');

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
                let movedSummaryFile = false;

                // Handle .md file - check if moving paper has a newer summary
                try {
                    const existingMdStat = await fs.stat(newMdPath);
                    const movingMdStat = await fs.stat(oldMdPath);

                    if (movingMdStat.mtime > existingMdStat.mtime) {
                        await fs.rename(oldMdPath, newMdPath);
                        movedSummaryFile = true;
                    } else {
                        // Remove old md file since we're keeping the existing one
                        await fs.unlink(oldMdPath);
                    }
                } catch (mdError) {
                    // Handle case where one of the md files doesn't exist
                    try {
                        await fs.rename(oldMdPath, newMdPath);
                        movedSummaryFile = true;
                    } catch (renameError) {
                        if (renameError.code !== 'ENOENT') {
                            throw renameError;
                        }
                    }
                }

                try {
                    if (movedSummaryFile) {
                        try {
                            await fs.unlink(newHltPath);
                        } catch (unlinkError) {
                            if (unlinkError.code !== 'ENOENT') {
                                throw unlinkError;
                            }
                        }
                        await fs.rename(oldHltPath, newHltPath);
                    } else {
                        await fs.unlink(oldHltPath);
                    }
                } catch (hltError) {
                    if (hltError.code !== 'ENOENT') {
                        throw hltError;
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
                try {
                    await fs.unlink(oldHltPath);
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

                try {
                    await fs.rename(oldHltPath, newHltPath);
                } catch (hltError) {
                    if (hltError.code !== 'ENOENT') {
                        throw hltError;
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
        const topicPath = getTopicPath(req.params.topicName);
        await fs.unlink(path.join(topicPath, req.params.paperId + '.json'));
        try {
            await fs.unlink(path.join(topicPath, req.params.paperId + '.md'));
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
        try {
            await fs.unlink(path.join(topicPath, req.params.paperId + '.hlt'));
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
        const topicPath = getTopicPath(req.params.topicName);
        const summaryPath = path.join(topicPath, req.params.paperId + '.md');
        const backupPath = path.join(topicPath, req.params.paperId + '.bak');

        try {
            await fs.unlink(backupPath);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }

        await fs.rename(summaryPath, backupPath);
        try {
            await fs.unlink(path.join(topicPath, req.params.paperId + '.hlt'));
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
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

        const isArxivId = /^[0-9]{4}\.[0-9]{5}(v[0-9]+)?$/.test(keyword.trim());
        let query;

        if (isArxivId) {
            query = `https://export.arxiv.org/api/query?id_list=${keyword.trim()}&max_results=1`;
        } else {
            keyword = keyword.replace(/[<>#%{}|\\^~\[\]`'"`;\/?:@&=+$,!\s]/g, " ").replace(/\s+/g, " ").trim().replace(/\s/g, "+");
            query = `https://export.arxiv.org/api/query?search_query=all:${keyword}`;

            if (year) {
                const [start, end] = year.split('~').map(Number);
                const startDate = `${start}01010000`;
                const endDate = `${end}12312359`;
                query += `+AND+submittedDate:[${startDate}+TO+${endDate}]`;
            }

            query += `&max_results=${count}&sortBy=relevance&sortOrder=descending`;
        }

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

        if (sort === 'submittedDate') {
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
        const mdPath = path.join(getTopicPath(topicName), paperId + '.md');
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

async function getPaperHighlights(req, res) {
    try {
        const { topicName, paperId } = req.params;
        const mdPath = path.join(getTopicPath(topicName), paperId + '.md');
        const summary = await fs.readFile(mdPath, 'utf-8');
        const highlights = sanitizeHighlights(await loadHighlightsFile(topicName, paperId), summary, `${paperId}.md`);

        await saveHighlightsFile(topicName, paperId, highlights);
        res.json({ highlights });
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.status(404).json({ message: 'Summary not found.' });
        } else {
            res.status(500).json({ message: error.message });
        }
    }
}

async function updatePaperHighlights(req, res) {
    try {
        const { topicName, paperId } = req.params;
        const mdPath = path.join(getTopicPath(topicName), paperId + '.md');
        const summary = await fs.readFile(mdPath, 'utf-8');
        const highlights = sanitizeHighlights(req.body?.highlights, summary, `${paperId}.md`);

        await saveHighlightsFile(topicName, paperId, highlights);
        res.json({ highlights });
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.status(404).json({ message: 'Summary not found.' });
        } else {
            res.status(500).json({ message: error.message });
        }
    }
}

/**
 * Fetches a PDF from an arXiv abstract URL, extracts its text content, and caches it.
 * @param {string} arxivAbsUrl - The URL of the arXiv abstract page (e.g., https://arxiv.org/abs/...).
 * @param {string} topicName - The name of the topic folder to cache the text file in.
 * @returns {Promise<string>} A promise that resolves with the extracted text.
 */
async function getPdfTextFromUrl(arxivAbsUrl, topicName, paperIdentifier) {
    if (!paperIdentifier) {
        throw new Error('paperIdentifier is required to build the PDF text cache filename.');
    }

    const fileName = paperIdentifier;
    const topicPath = getTopicPath(topicName);
    const txtCachePath = path.join(topicPath, fileName + '.txt');

    // Check for cache first
    try {
        const cachedText = await fs.readFile(txtCachePath, 'utf-8');
        if (cachedText) {
            return cachedText;
        }
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.warn('Error reading PDF text cache:', error.message);
        }
    }

    // If no cache, fetch, parse, and save
    const pdfUrl = arxivAbsUrl.replace('/abs/', '/pdf/');
    const response = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
    const data = await pdfParser(response.data);
    const pdfText = data.text;

    try {
        await fs.writeFile(txtCachePath, pdfText, 'utf-8');
    } catch (writeError) {
        console.error('Failed to write PDF text cache file:', writeError.message);
    }

    return pdfText;
}

async function chatWithPaper(req, res) {
    try {
        const { topicName, paperId } = req.params;
        const { history, engine } = req.body;

        const topicPath = getTopicPath(topicName);
        const jsonPath = path.join(topicPath, paperId + '.json');
        const mdPath = path.join(topicPath, paperId + '.md');

        let paperContext = '';
        let paper;

        try {
            const paperData = await fs.readFile(jsonPath, 'utf-8');
            paper = JSON.parse(paperData);
        } catch (error) {
            return res.status(404).json({ message: 'Paper JSON not found.' });
        }

        try {
            // Try to get full text from PDF (with caching)
            paperContext = await getPdfTextFromUrl(paper.url, topicName, paperId);
        } catch (pdfError) {
            console.warn('Failed to get full paper text, falling back to summary.', pdfError.message);
            // Fallback to abstract and summary
            paperContext += `Title: ${paper.title}\nAuthors: ${paper.authors}\nAbstract: ${paper.abstract}\n\n`;
            try {
                const summary = await fs.readFile(mdPath, 'utf-8');
                paperContext += `AI Summary:\n${summary}`;
            } catch (summaryError) {
                // Ignore if summary file doesn't exist
            }
        }

        if (!paperContext) {
            return res.status(404).json({ message: 'Paper context not found.' });
        }
        const generator = await streamChat(engine, history, paperContext);
        await streamGeneratorToSse(res, generator);

    } catch (error) {
        console.error('Error in /chat:', error);
        if (!res.headersSent) {
            res.status(500).json({ message: error.message });
        } else {
            res.end();
        }
    }
}

async function summarizeAndSave(req, res) {
    try {
        const { paper, topicName, engine } = req.body;
        const { url } = paper;
        const fileName = getPaperStorageId(paper);
        const topicPath = getTopicPath(topicName);

        await fs.mkdir(topicPath, { recursive: true });

        const mdFilePath = path.join(topicPath, fileName + '.md');
        const pdfText = await getPdfTextFromUrl(url, topicName, fileName);
        const userPrompt = await fs.readFile(path.join(dataPath, 'userprompt.txt'), 'utf-8');
        const prompt = userPrompt.replace('{context}', pdfText);
        const generator = await streamSummary(engine, prompt);
        const summaryContent = await streamGeneratorToSse(res, generator);

        await backupSummaryFile(mdFilePath);
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
        const topicPath = getTopicPath(topicName);
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


async function translateText(req, res) {
    try {
        const { text, engine } = req.body;
        if (!text) {
            return res.status(400).json({ message: 'Text to translate is required.' });
        }

        const prompt = `Act as a professional academic translator.
Translate the text below into Korean using a formal and scholarly tone.
Do not include any conversational fillers like 'Here is the translation' or 'I hope this helps'.
Return only the result.:\n\nText: ${text}`;
        const translatedText = await generateSingleResponse(engine, prompt);

        res.json({ translatedText });
    } catch (error) {
        console.error('Error in /translate:', error);
        res.status(500).json({ message: 'Failed to translate text.' });
    }
}

app.post('/translate', translateText);
app.get('/topics', getTopics);
app.post('/topics', createTopic);
app.put('/topics/:oldName', renameTopic);
app.delete('/topics/:topicName', deleteTopic);
app.get('/papers/:topicName', getPapers);
app.post('/papers/:topicName', savePaper);
app.put('/papers/:topicName/:paperId', movePaper);
app.delete('/papers/:topicName/:paperId', deletePaper);
app.delete('/paper-summary/:topicName/:paperId', deletePaperSummary);
app.get('/paper-highlights/:topicName/:paperId', getPaperHighlights);
app.put('/paper-highlights/:topicName/:paperId', updatePaperHighlights);

async function fetchAndUpdateCitation(req, res) {
    try {
        const { topicName, paperId } = req.params;
        const paperPath = path.join(getTopicPath(topicName), paperId + '.json');

        let paper;
        try {
            const data = await fs.readFile(paperPath, 'utf-8');
            paper = JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return res.status(404).json({ message: 'Paper not found.' });
            }
            throw error;
        }

        const citationCount = await getCitationCountByURL(paper.url, paper.authors, paper.title);

        if (citationCount !== undefined) {
            paper.citation = citationCount;
        } else {
            // If not found, we don't update, just return the current paper
            return res.json({ message: 'Could not find citation information.', paper });
        }

        await fs.writeFile(paperPath, JSON.stringify(paper, null, 2));

        res.json({ message: 'Citation count updated successfully.', paper });
    } catch (error) {
        console.error('Error updating citation:', error.message);
        res.status(500).json({ message: 'Failed to update citation count.' });
    }
}

async function updateCitation(req, res) {
    try {
        const { topicName, paperId } = req.params;
        const { citation } = req.body;

        if (typeof citation !== 'number') {
            return res.status(400).json({ message: 'Citation count must be a number.' });
        }

        const paperPath = path.join(getTopicPath(topicName), paperId + '.json');

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

app.get('/papers/:topicName/:paperId/update-citation', fetchAndUpdateCitation);
app.post('/papers/:topicName/:paperId/citation', updateCitation);
app.get('/search', searchArxiv);
app.get('/paper-summary/:topicName/:paperId', getPaperSummary);
app.post('/chat/:topicName/:paperId', chatWithPaper);
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

        const data = await pdfParser(req.file.buffer);

        res.json({ text: data.text });
    } catch (error) {
        console.error('PDF text extraction error:', error);
        res.status(500).json({ message: 'Failed to extract text from PDF' });
    }
}

async function summarizePdfText(req, res) {
    try {
        const { text, topicName, engine } = req.body;

        if (!text) {
            return res.status(400).json({ message: 'No text provided for summarization' });
        }

        if (!topicName) {
            return res.status(400).json({ message: 'Topic name is required' });
        }

        // Read user prompt template
        const userPrompt = await fs.readFile(path.join(dataPath, 'userprompt.txt'), 'utf-8');
        const prompt = userPrompt.replace('{context}', text);
        const generator = await streamSummary(engine, prompt);
        await streamGeneratorToSse(res, generator);

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

        const topicPath = getTopicPath(topicName);

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
    const availableEngines = getAvailableLlmEngines();
    if (server && server.address()) {
        res.json({
            port: server.address().port,
            hostname: server.address().address,
            dataPath: dataPath,
            availableEngines,
            defaultEngine: getDefaultLlmEngine()
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
