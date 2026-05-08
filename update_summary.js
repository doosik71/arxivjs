const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const pdfParser = require('pdf-parse');
require('dotenv').config();

const DATA_PATH = path.join(__dirname, 'arxivjsdata');
const USER_PROMPT_PATH = path.join(DATA_PATH, 'userprompt.txt');
const OLLAMA_MODEL = process.env.OLLAMA_MODEL?.trim();
const OLLAMA_API_URL = process.env.OLLAMA_API_URL?.trim()?.replace(/\/+$/, '');

function slugifyPaperTitle(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function ensureOllamaConfigured() {
  if (!OLLAMA_API_URL || !OLLAMA_MODEL) {
    throw new Error('OLLAMA_API_URL and OLLAMA_MODEL must be set in .env to run update_summary.js');
  }
}

async function ensureUserPromptExists() {
  await fs.access(USER_PROMPT_PATH);
}

async function getTopicDirectories() {
  const entries = await fs.readdir(DATA_PATH, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

async function getJsonPaperFiles(topicPath) {
  const entries = await fs.readdir(topicPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === '.json')
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

async function readPaperMetadata(paperPath) {
  const raw = await fs.readFile(paperPath, 'utf-8');
  const paper = JSON.parse(raw);

  if (!paper?.url || !paper?.title) {
    throw new Error('Paper metadata is missing required fields such as url or title.');
  }

  return paper;
}

async function getPdfTextFromUrl(arxivAbsUrl, topicPath, paper) {
  const fileName = slugifyPaperTitle(paper?.title);
  if (!fileName) {
    throw new Error('Paper title is required to build the PDF text cache filename.');
  }

  const txtCachePath = path.join(topicPath, `${fileName}.txt`);

  try {
    const cachedText = await fs.readFile(txtCachePath, 'utf-8');
    if (cachedText) {
      return { text: cachedText, fromCache: true };
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`[warn] failed to read cache ${path.basename(txtCachePath)}: ${error.message}`);
    }
  }

  const pdfUrl = arxivAbsUrl.replace('/abs/', '/pdf/');
  const response = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
  const data = await pdfParser(response.data);
  const pdfText = data.text;

  try {
    await fs.writeFile(txtCachePath, pdfText, 'utf-8');
  } catch (error) {
    console.warn(`[warn] failed to write cache ${path.basename(txtCachePath)}: ${error.message}`);
  }

  return { text: pdfText, fromCache: false };
}

async function generateSummaryWithOllama(prompt) {
  const response = await axios.post(`${OLLAMA_API_URL}/api/generate`, {
    model: OLLAMA_MODEL,
    prompt,
    stream: false
  });

  const summary = response.data?.response;
  if (!summary || typeof summary !== 'string') {
    throw new Error('Ollama returned an empty summary.');
  }

  return summary;
}

async function summarizePaper(topicName, topicPath, jsonFileName, userPrompt) {
  const paperId = path.basename(jsonFileName, '.json');
  const paperPath = path.join(topicPath, jsonFileName);
  const summaryPath = path.join(topicPath, `${paperId}.md`);

  try {
    await fs.access(summaryPath);
    return { status: 'skipped', reason: 'summary-exists', paperId };
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  const paper = await readPaperMetadata(paperPath);
  const pdfResult = await getPdfTextFromUrl(paper.url, topicPath, paper);
  const prompt = userPrompt.replace('{context}', pdfResult.text);
  const summary = await generateSummaryWithOllama(prompt);

  await fs.writeFile(summaryPath, summary, 'utf-8');

  return {
    status: 'created',
    paperId,
    title: paper.title,
    fromCache: pdfResult.fromCache
  };
}

async function main() {
  ensureOllamaConfigured();
  await ensureUserPromptExists();

  const userPrompt = await fs.readFile(USER_PROMPT_PATH, 'utf-8');
  const topicNames = await getTopicDirectories();
  const stats = {
    processed: 0,
    created: 0,
    skipped: 0,
    failed: 0
  };

  console.log(`[start] update_summary.js using Ollama model "${OLLAMA_MODEL}"`);
  console.log(`[start] data path: ${DATA_PATH}`);

  for (const topicName of topicNames) {
    const topicPath = path.join(DATA_PATH, topicName);
    const jsonFiles = await getJsonPaperFiles(topicPath);

    if (!jsonFiles.length) {
      continue;
    }

    // console.log(`\n[topic] ${topicName} (${jsonFiles.length} papers)`);

    for (const jsonFileName of jsonFiles) {
      stats.processed += 1;
      const paperId = path.basename(jsonFileName, '.json');

      try {
        const result = await summarizePaper(topicName, topicPath, jsonFileName, userPrompt);

        if (result.status === 'skipped') {
          stats.skipped += 1;
          // console.log(`[skip] ${topicName}/${paperId} summary already exists`);
          continue;
        }

        stats.created += 1;
        console.log(
          `[done] ${topicName}/${paperId} summary created (${result.fromCache ? 'cached text' : 'downloaded pdf'})`
        );
      } catch (error) {
        stats.failed += 1;
        console.error(`[fail] ${topicName}/${paperId} ${error.message}`);
      }
    }
  }

  console.log('\n[summary]');
  console.log(`processed: ${stats.processed}`);
  console.log(`created: ${stats.created}`);
  console.log(`skipped: ${stats.skipped}`);
  console.log(`failed: ${stats.failed}`);
}

main().catch((error) => {
  console.error(`[fatal] ${error.message}`);
  process.exit(1);
});
