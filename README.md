# ArxivJS

ArxivJS is a comprehensive **full-stack research paper management system** that combines a Node.js Express backend with a modern React frontend. Available as both a **web application** and **Electron desktop application**, it provides a unified interface for discovering, organizing, and summarizing research papers from arXiv and other sources using AI-powered summaries.

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-username/arxivjs.git
cd arxivjs
```

### 2. Install dependencies

Make sure you have Node.js (v16+) and npm installed. The project uses a unified dependency management system for both frontend and backend:

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root of the project and add your Gemini API key:

```ini
GEMINI_API_KEY=YOUR_API_KEY
```

You can use the Gemini API key by creating a project at <https://console.cloud.google.com/projectselector2/home/dashboard>, generating an API key at <https://aistudio.google.com/apikey>, and then activating the `Generative Language API` at <https://console.cloud.google.com/apis/dashboard>.

### 4. Write user prompt

Write a user prompt to `arxivjsdata/userprompt.txt` file.
Following shows an example.

```text
Please summarize the following paper.

The summary **must be written in Korean** and **must follow Markdown syntax** using a clear hierarchical structure with headings, bullet points, and formatting where appropriate.
Ensure the content is **concise, accurate, and easy to understand** for a technical but general audience.

Please follow these formatting rules:

- At the very top, display:
  - The **paper title** on the first line as a "#" heading.
  - The **author list** on the second line as plain text (comma-separated), below the title.

- Then use the following summary structure:
  - ## 🧩 Problem to Solve
    - Clearly describe the main research problem or question the paper aims to address.
  - ## ✨ Key Contributions
    - List the core findings and novel contributions as bullet points.
  - ## 📎 Related Works
    - Mention key prior works referenced in the paper.
  - ## 🛠️ Methodology
    - Describe the approach or algorithm used, preferably with steps or bullet points.
  - ## 📊 Results
    - Summarize quantitative or qualitative results briefly.
  - ## 🧠 Insights & Discussion
    - Explain the implications, any limitations, or significance of the results.
  - ## 📌 TL;DR
    - Provide a TL;DR summary of this paper, highlighting the main problem, proposed method, and key findings.

- Guidelines for writing in Markdown format:
  1. Use braces around multi-character subscripts or superscripts in MathJax to avoid rendering errors.
  2. Use $...$ for inline math and $$...$$ for block math to ensure compatibility with MathJax.
  3. Do not use backticks (`) for math; use dollar signs ($) to allow proper MathJax rendering.

Here is the paper content:

{context}
```

## Features

### Backend (Express Server)

- 🔍 **arXiv Integration**: Search and fetch papers by keywords and date ranges
- 📁 **Topic Management**: Create and organize research topics
- 🤖 **AI Summaries**: Generate paper summaries using Google's Gemini API
- 📄 **PDF Processing**: Extract text from uploaded PDFs or URLs
- 🌐 **RESTful API**: Complete API for all operations
- 🔄 **Real-time Streaming**: Live AI summary generation

### Frontend (React Client)

- ⚛️ **Modern React**: Built with React 19 and Vite
- 🎨 **8 Custom Themes**: Multiple color schemes with persistence
- 🔍 **Advanced Search**: Real-time filtering with text highlighting
- 📖 **Table of Contents**: Auto-generated TOC with scroll tracking
- 🧮 **Math Rendering**: Full LaTeX support with MathJax
- 📱 **Responsive Design**: Optimized for mobile and desktop
- 🌐 **Edge Reader Support**: Semantic markup for better accessibility

### Cross-Platform Support

- 🖥️ **Electron Desktop**: Native applications for Windows, macOS, and Linux
- 🌍 **Web Application**: Single-port deployment for easy hosting
- ⚡ **Unified Development**: Integrated build and development process

## Usage

### Development

ArxivJS offers multiple development workflows:

#### 1. Unified Development (Recommended)

```bash
npm run dev:unified
```

- Builds React in watch mode + runs Express server
- Single port (8765-8768) with automatic rebuilding
- Best for rapid development

#### 2. Production-like Development

```bash
npm run dev
```

- Builds React once, then runs Express server
- Single port deployment
- Good for testing production build

#### 3. Separate Development

```bash
npm run dev:separate
```

- React dev server (8765) + Express server (8766)
- Hot module replacement for React
- Traditional development approach

### Production

#### Web Application

```bash
# Build and start production server
npm run build
npm run server
```

#### Desktop Application

```bash
# Start Electron app
npm start

# Build distribution packages
npm run dist          # All platforms
npm run dist:win      # Windows only
npm run dist:mac      # macOS only
npm run dist:linux    # Linux only
```

Once running, access the application at `http://localhost:8765` (or the automatically assigned port).

## Project Structure

```text
arxivjs/
├── index.js              # Express server with API endpoints
├── main.js               # Electron main process
├── package.json          # Unified dependencies (frontend + backend)
├── vite.config.js        # Vite build configuration
├── index.html            # React app entry point
├── src/                  # React source code
│   ├── App.jsx           # Main React component
│   ├── components/       # React components
│   └── utils/            # Utilities (themes, config, etc.)
├── public/               # Built React app (generated)
├── client/electron/      # Electron configuration
├── assets/               # Static assets
└── arxivjsdata/          # User data (topics, papers, summaries)
```

## Architecture

ArxivJS uses a **unified full-stack architecture**:

- **Express Backend**: Handles API requests, arXiv integration, AI summarization, and PDF processing
- **React Frontend**: Modern UI with advanced features like search, themes, and math rendering  
- **Single Port Deployment**: Both frontend and API served from the same port (8765-8768)
- **Vite Build System**: Compiles React app into `public/` directory for Express to serve
- **Electron Wrapper**: Cross-platform desktop application support

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.
