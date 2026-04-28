# ArxivJS

ArxivJS is a full-stack research paper management system built with an Express backend and a React frontend. It is available as both a web application and an Electron desktop application, and provides a unified interface for discovering, organizing, translating, chatting about, and summarizing research papers from arXiv and other sources with AI assistance.

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-username/arxivjs.git
cd arxivjs
```

### 2. Install dependencies

Make sure you have Node.js and npm installed.

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the project root.

You can enable Gemini, Ollama, or both:

```ini
# Optional: Gemini
GEMINI_API_KEY=YOUR_API_KEY
GEMINI_MODEL=gemini-2.5-flash

# Optional: Ollama
OLLAMA_API_URL=http://localhost:11434/
OLLAMA_MODEL=gemma4:31b

# Optional: citation lookup
SEMANTICSCHOLAR_API_KEY=YOUR_API_KEY
```

Notes:

- If both Gemini and Ollama are configured, the app lets you choose the active AI engine in the settings modal.
- If only one engine is configured, only that engine is shown and enabled.
- The server exits at startup only when neither Gemini nor Ollama is configured.

You can create a Gemini API key at <https://aistudio.google.com/apikey> and enable the `Generative Language API` in Google Cloud.

To use Ollama, install and run Ollama locally, then pull the model you want to use. Example:

```bash
ollama pull gemma4:31b
```

### 4. Write the summary prompt

Create or edit `arxivjsdata/userprompt.txt`.

Example:

```text
Please summarize the following paper.

The summary must be written in Korean and must follow Markdown syntax using a clear hierarchical structure with headings, bullet points, and formatting where appropriate.
Ensure the content is concise, accurate, and easy to understand for a technical but general audience.

Please follow these formatting rules:

- At the very top, display:
  - The paper title on the first line as a "#" heading.
  - The author list on the second line as plain text, below the title.

- Then use the following summary structure:
  - ## Problem to Solve
    - Clearly describe the main research problem or question the paper aims to address.
  - ## Key Contributions
    - List the core findings and novel contributions as bullet points.
  - ## Related Works
    - Mention key prior works referenced in the paper.
  - ## Methodology
    - Describe the approach or algorithm used, preferably with steps or bullet points.
  - ## Results
    - Summarize quantitative or qualitative results briefly.
  - ## Insights & Discussion
    - Explain the implications, limitations, or significance of the results.
  - ## TL;DR
    - Provide a concise takeaway highlighting the main problem, proposed method, and key findings.

- Guidelines for writing in Markdown format:
  1. Use braces around multi-character subscripts or superscripts in MathJax to avoid rendering errors.
  2. Use $...$ for inline math and $$...$$ for block math to ensure compatibility with MathJax.
  3. Do not use backticks for math; use dollar signs instead.

Here is the paper content:

{context}
```

## Features

### Backend

- arXiv integration for search and paper import
- Topic-based paper organization
- Multi-engine AI support with Gemini and Ollama
- Paper summary generation
- Abstract translation to Korean
- Paper chat with streaming responses
- PDF text extraction and caching
- REST API for all main operations
- Batch CLI for generating missing summaries with Ollama

### Frontend

- React 19 + Vite
- Theme selection with persistence
- Advanced paper filtering and search
- Table of contents extraction from summaries
- MathJax rendering for equations
- Responsive UI for desktop and mobile
- AI settings modal for choosing the active engine
- Summary highlighting and chat interface

### Platforms

- Web application
- Electron desktop application for Windows, macOS, and Linux

## Usage

### Development

#### Unified development

```bash
npm run dev:unified
```

- Builds React in watch mode and runs the Express server
- Uses a single port

#### Production-like development

```bash
npm run dev
```

- Builds React once, then runs the Express server

#### Separate development

```bash
npm run dev:separate
```

- Runs the React dev server and the backend separately

### Production

#### Web application

```bash
npm run build
npm run server
```

#### Desktop application

```bash
npm start
```

Build distribution packages:

```bash
npm run dist
npm run dist:win
npm run dist:mac
npm run dist:linux
```

Once running, access the application at `http://localhost:8765` or the automatically assigned port.

### Batch summary CLI

To generate summaries only for papers that do not already have a `.md` summary file:

```bash
npm run update-summary
```

This script:

- scans `arxivjsdata` by topic
- checks each paper `.json` file
- skips papers whose matching `.md` summary already exists
- uses `arxivjsdata/userprompt.txt` as the prompt template
- uses Ollama to generate summaries sequentially
- reuses cached `.txt` PDF text files when available

This is useful when you want to precompute many summaries with Ollama without interactive user actions.

## Project Structure

```text
arxivjs/
|- index.js              # Express server and API endpoints
|- main.js               # Electron main process
|- package.json          # Project scripts and dependencies
|- update_summary.js     # Batch CLI for generating missing summaries with Ollama
|- vite.config.js        # Vite build configuration
|- index.html            # React app entry point
|- src/                  # React source code
|  |- App.jsx            # Main React component
|  |- components/        # UI components
|  |- utils/             # Utilities such as theme/config helpers
|- public/               # Built frontend output
|- assets/               # Static assets
|- arxivjsdata/          # User data, prompts, papers, summaries, caches
```

## Architecture

ArxivJS uses a unified full-stack architecture:

- Express backend for API handling, arXiv integration, AI routing, summarization, translation, chat, and PDF processing
- React frontend for search, reading, theming, engine selection, and interactive summary workflows
- Single-port deployment where the frontend and API are served from the same backend
- Vite build output served from `public/`
- Electron wrapper for desktop packaging
- Batch CLI worker via `update_summary.js` for non-interactive Ollama summary generation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

This project is licensed under the ISC License.
