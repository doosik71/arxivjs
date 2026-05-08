const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const DATA_PATH = path.join(__dirname, 'arxivjsdata');
const OPENALEX_API_URL = 'https://api.openalex.org/works';
const CROSSREF_API_URL = 'https://api.crossref.org/works';
const OPENALEX_API_KEY = process.env.OPENALEX_API_KEY?.trim();
const CROSSREF_MAILTO =
  process.env.CROSSREF_MAILTO?.trim() ||
  process.env.CROSSREF_EMAIL?.trim() ||
  process.env.EMAIL?.trim() ||
  '';
const SEARCH_DELAY_MS = 1500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeWhitespace(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTitle(value) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getFirstAuthorName(authors) {
  return normalizeWhitespace(String(authors || '').split(',')[0]);
}

function getLastName(name) {
  const parts = normalizeWhitespace(name).split(' ').filter(Boolean);
  return parts.length ? parts[parts.length - 1].toLowerCase() : '';
}

function isYearCompatible(expectedYear, candidateYear) {
  if (!Number.isInteger(expectedYear) || !Number.isInteger(candidateYear)) {
    return true;
  }

  return Math.abs(expectedYear - candidateYear) <= 1;
}

function titlesMatch(expectedTitle, candidateTitle) {
  const left = normalizeTitle(expectedTitle);
  const right = normalizeTitle(candidateTitle);

  if (!left || !right) {
    return false;
  }

  return left === right || left.includes(right) || right.includes(left);
}

function authorsMatch(expectedAuthors, candidateAuthors) {
  const expectedLastName = getLastName(getFirstAuthorName(expectedAuthors));
  if (!expectedLastName) {
    return false;
  }

  const candidateLastNames = candidateAuthors
    .map((name) => getLastName(name))
    .filter(Boolean);

  return candidateLastNames.includes(expectedLastName);
}

async function getJsonFilesRecursively(directoryPath) {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  const fileLists = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directoryPath, entry.name);

      if (entry.isDirectory()) {
        return getJsonFilesRecursively(fullPath);
      }

      if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.json') {
        return [fullPath];
      }

      return [];
    })
  );

  return fileLists.flat().sort((left, right) => left.localeCompare(right));
}

async function readPaper(paperPath) {
  const raw = await fs.readFile(paperPath, 'utf-8');
  return JSON.parse(raw);
}

function buildOpenAlexUrl(title) {
  const params = new URLSearchParams({
    search: normalizeWhitespace(title),
    select: 'id,display_name,publication_year,cited_by_count,authorships',
    per_page: '5'
  });

  if (OPENALEX_API_KEY) {
    params.set('api_key', OPENALEX_API_KEY);
  }

  return `${OPENALEX_API_URL}?${params.toString()}`;
}

function buildCrossrefUrl(authors, title) {
  const params = new URLSearchParams({
    'query.title': normalizeWhitespace(title),
    'query.author': getFirstAuthorName(authors),
    rows: '5',
    select: 'DOI,title,author,published-print,published-online,published,is-referenced-by-count,score'
  });

  if (CROSSREF_MAILTO) {
    params.set('mailto', CROSSREF_MAILTO);
  }

  return `${CROSSREF_API_URL}?${params.toString()}`;
}

function getCrossrefPublishedYear(item) {
  const dateParts =
    item?.published?.['date-parts'] ||
    item?.['published-print']?.['date-parts'] ||
    item?.['published-online']?.['date-parts'];

  const year = dateParts?.[0]?.[0];
  return Number.isInteger(year) ? year : undefined;
}

function findOpenAlexMatch(paper, results) {
  const candidates = Array.isArray(results) ? results : [];

  return candidates.find((item) => {
    const candidateTitle = item?.display_name;
    const candidateAuthors = Array.isArray(item?.authorships)
      ? item.authorships
        .map((authorship) => authorship?.author?.display_name)
        .filter(Boolean)
      : [];

    return (
      titlesMatch(paper.title, candidateTitle) &&
      authorsMatch(paper.authors, candidateAuthors) &&
      isYearCompatible(paper.year, item?.publication_year)
    );
  });
}

function findCrossrefMatch(paper, results) {
  const candidates = Array.isArray(results) ? results : [];

  return candidates.find((item) => {
    const candidateTitle = Array.isArray(item?.title) ? item.title[0] : item?.title;
    const candidateAuthors = Array.isArray(item?.author)
      ? item.author
        .map((author) => [author?.given, author?.family].filter(Boolean).join(' '))
        .filter(Boolean)
      : [];

    return (
      titlesMatch(paper.title, candidateTitle) &&
      authorsMatch(paper.authors, candidateAuthors) &&
      isYearCompatible(paper.year, getCrossrefPublishedYear(item))
    );
  });
}

async function getCitationCountFromOpenAlex(paper) {
  const url = buildOpenAlexUrl(paper.title);
  const response = await axios.get(url, { timeout: 8000 });
  const match = findOpenAlexMatch(paper, response.data?.results);

  if (!match) {
    return undefined;
  }

  return typeof match.cited_by_count === 'number' ? match.cited_by_count : undefined;
}

async function getCitationCountFromCrossref(paper) {
  const url = buildCrossrefUrl(paper.authors, paper.title);
  const response = await axios.get(url, { timeout: 8000 });
  const match = findCrossrefMatch(paper, response.data?.message?.items);

  if (!match) {
    return undefined;
  }

  const citationCount = match['is-referenced-by-count'];
  return typeof citationCount === 'number' ? citationCount : undefined;
}

async function getCitationCount(paper) {
  try {
    const openAlexCitationCount = await getCitationCountFromOpenAlex(paper);
    if (openAlexCitationCount !== undefined) {
      return { source: 'openalex', citationCount: openAlexCitationCount };
    }
  } catch (error) {
    console.warn(`[warn] OpenAlex lookup failed for "${paper.title}": ${error.message}`);
  }

  try {
    const crossrefCitationCount = await getCitationCountFromCrossref(paper);
    if (crossrefCitationCount !== undefined) {
      return { source: 'crossref', citationCount: crossrefCitationCount };
    }
  } catch (error) {
    console.warn(`[warn] Crossref lookup failed for "${paper.title}": ${error.message}`);
  }

  return undefined;
}

async function updateCitationForPaper(paperPath) {
  const paper = await readPaper(paperPath);

  if (paper.citation !== undefined) {
    return { status: 'skipped', reason: 'citation-exists' };
  }

  if (!paper.title || !paper.authors) {
    return { status: 'skipped', reason: 'missing-title-or-authors' };
  }

  await sleep(SEARCH_DELAY_MS);

  const citationResult = await getCitationCount(paper);
  if (!citationResult) {
    return { status: 'skipped', reason: 'citation-not-found' };
  }

  paper.citation = citationResult.citationCount;
  await fs.writeFile(paperPath, `${JSON.stringify(paper, null, 2)}\n`, 'utf-8');

  return {
    status: 'updated',
    citationCount: citationResult.citationCount,
    source: citationResult.source
  };
}

async function main() {
  const jsonFiles = await getJsonFilesRecursively(DATA_PATH);
  const stats = {
    processed: 0,
    updated: 0,
    skipped: 0,
    failed: 0
  };

  console.log('[start] update_citatation.js');
  console.log(`[start] data path: ${DATA_PATH}`);
  console.log(`[start] OpenAlex API key: ${OPENALEX_API_KEY ? 'configured' : 'missing'}`);
  console.log(`[start] Crossref mailto: ${CROSSREF_MAILTO || 'not set'}`);

  for (const paperPath of jsonFiles) {
    stats.processed += 1;
    const relativePath = path.relative(DATA_PATH, paperPath);

    try {
      const result = await updateCitationForPaper(paperPath);

      if (result.status === 'updated') {
        stats.updated += 1;
        console.log(`[done] ${relativePath} citation=${result.citationCount} source=${result.source}`);
        continue;
      }

      stats.skipped += 1;
      // console.log(`[skip] ${relativePath} ${result.reason}`);
    } catch (error) {
      stats.failed += 1;
      console.error(`[fail] ${relativePath} ${error.message}`);
    }
  }

  console.log('\n[summary]');
  console.log(`processed: ${stats.processed}`);
  console.log(`updated: ${stats.updated}`);
  console.log(`skipped: ${stats.skipped}`);
  console.log(`failed: ${stats.failed}`);
}

main().catch((error) => {
  console.error(`[fatal] ${error.message}`);
  process.exit(1);
});
