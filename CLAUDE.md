# CLAUDE.md

Guidance for Claude Code when working in this repository. See `README.md` for the user-facing overview and setup.

@AGENTS.md

## Project Shape

ArxivJS is a single-package full-stack app: an Express 5 server (`index.js`) serves a React 19 + Vite client built into `public/`, and the same server is embedded in an Electron desktop app (`main.js`).

- `index.js`: all API routes, arXiv search, AI routing (Gemini / Claude / Ollama), PDF text extraction (`pdf-parse`), citation lookup, and file-based storage. Exports `startServer()`.
- `main.js`, `preload.js`: Electron entry point; calls `startServer()` and loads the served page in a `BrowserWindow`.
- `src/`: React client. `App.jsx` switches between `topics`, `papers` and `paper-detail` views with `useState` (no router). All HTTP calls go through `src/api.js`.
- `update_summary.js`: batch CLI that generates missing summaries with Ollama (`npm run update-summary`).
- `update_citatation.js`: batch CLI that refreshes citation counts via OpenAlex / Crossref.
- `migrate_arxivjsdata.js`: one-off migration to the title-slug file naming.

## Commands

```bash
npm run dev          # vite build, then `node --watch index.js`
npm run dev:unified  # vite build --watch + `node --watch index.js`
npm run dev:separate # dev + Vite dev server on 5173 (proxies /api to 8765)
npm run server       # node index.js (no build, no watch)
npm run build        # vite build into public/
npm start            # Electron app
npm run dist:win     # package with electron-builder (also dist:mac, dist:linux)
```

- Server flags: `--host` (default `localhost`) and `--port` (default `PORT` env, else first free port from 8765). Pass them through npm with `npm run dev -- --port 8790`.
- There is no test suite. Verify changes by building and exercising the affected endpoint or view.
- When running Electron from a VS Code terminal, unset `ELECTRON_RUN_AS_NODE`, otherwise Electron runs as plain Node.

## Configuration

- `.env` (see `.env.sample`): `GEMINI_API_KEY`, `GEMINI_MODEL`, `ANTHROPIC_API_KEY`, `CLAUDE_MODEL`, `ANTHROPIC_WORKSPACE_ID` (only for keys not scoped to a workspace), `OLLAMA_API_URL`, `OLLAMA_MODEL`, `SEMANTICSCHOLAR_API_KEY`, plus optional `OPENALEX_API_KEY` and `CROSSREF_MAILTO`.
- Startup exits if none of Gemini, Claude, or Ollama is configured, or if `arxivjsdata/userprompt.txt` is missing. The prompt template must contain `{context}`.

## Data Storage

- Data root is `arxivjsdata/` in the project root, or `<userData>/arxivjsdata` when running under Electron.
- Each topic is a folder. Each paper is a bundle of files sharing one slug basename: `.json` (metadata), `.md` (summary), `.txt` (cached PDF text), `.hlt` (highlights).
- `docs/arxivjsdata-format-specification.md` is the authoritative format spec. Read it before changing how files are named, moved, or written.
