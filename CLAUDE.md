# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ArxivJS is a comprehensive research paper management system with a unified full-stack architecture:

**ArxivJS (Unified Full-Stack Application)**: A Node.js Express server with an integrated React client interface for managing arXiv papers and general PDF documents. The React client (formerly ArxiView) has been fully integrated into the main application using a flat project structure.

### Features

#### Backend (Express Server)

- Create and manage topic folders
- Search arXiv papers by keywords and date ranges
- Save papers to topic folders
- Summarize any PDF document via URL or file upload
- Generate AI-powered summaries using Google's Gemini API
- RESTful API endpoints for all operations
- PDF processing and CORS proxy functionality

#### Frontend (React Client)

- Modern React-based interface for browsing topics and papers
- Advanced search with text highlighting
- Math expression rendering with MathJax
- Table of Contents with scroll tracking
- Multiple theme support (8 custom themes)
- Edge Immersive Reader support
- Responsive design for mobile and desktop

#### Cross-Platform Support

- Web application (single port deployment)
- Electron desktop application for Windows, macOS, and Linux
- Unified development and build process

## Architecture

ArxivJS uses a unified full-stack architecture with integrated frontend and backend:

### Unified Full-Stack Structure

The application combines an Express.js server with a React frontend in a single project:

#### Frontend Stack

- **React 19** with functional components and hooks
- **Vite** as build tool and development server
- **Axios** for API communication with ArxivJS backend
- **React Router DOM** for client-side routing
- **MathJax** for LaTeX math expression rendering
- **Marked** library for markdown parsing with Korean text support

#### Key Components

- **App.jsx**: Main application container with routing logic
- **TopicList.jsx**: Grid-based topic browser with search and highlighting
- **PaperList.jsx**: Year-grouped paper listing with advanced search
- **PaperDetail.jsx**: Paper viewer with metadata, abstract, and AI summary
- **TableOfContents.jsx**: Auto-generated TOC with scroll tracking
- **ThemeSelector.jsx**: Dynamic theme switching component
- **SettingsModal.jsx**: Settings configuration modal for backend URL and other options
- **Footer.jsx**: Site footer with GitHub link and project info

#### Utilities

- **themes.js**: Theme management with 8 custom color schemes
- **markdownRenderer.jsx**: Advanced markdown processing with math protection
- **config.js**: Configuration management for backend URL and app settings
- **api.js**: Centralized API communication layer

### ArxivJS Server Side (index.js)

- **Express.js server** that handles API endpoints and serves static files
- **Data storage** in `arxivjsdata/` directory (either in project root or Electron userData path)
- **Gemini API integration** for paper summarization using streaming responses
- **PDF processing** with pdf-parse library for extracting text content
- **PDF URL proxy** for fetching external PDFs to avoid CORS issues
- **ArXiv API integration** for searching and fetching paper metadata
- **File upload handling** using multer for PDF file processing

### React Client Side (src/)

- **React 19 application** with modern functional components and hooks
- **Component-based architecture**: TopicList, PaperList, PaperDetail, etc.
- **Real-time streaming** for AI summary generation
- **State management** using React hooks and context
- **Theme system** with 8 custom themes and localStorage persistence
- **Advanced UI features**: search highlighting, TOC, responsive design

### Desktop App (main.js)

- **Electron wrapper** that creates a BrowserWindow loading the web server
- **Integrated server startup** - imports and runs the Express server
- **Platform-specific data paths** using Electron's userData directory

## Key File Structure

### ArxivJS (Unified Full-Stack Application)

```text
├── index.js          # Main Express server with all API endpoints
├── main.js           # Electron app entry point
├── preload.js        # Electron preload script
├── package.json      # Unified dependencies (server + client)
├── vite.config.js    # Vite configuration for React client
├── index.html        # React app entry point
├── src/              # React source code
│   ├── main.jsx      # React app entry point
│   ├── App.jsx       # Main application component with routing
│   ├── api.js        # Centralized API client
│   ├── index.css     # Global styles with CSS custom properties
│   ├── components/
│   │   ├── TopicList.jsx      # Topic grid with search and highlighting
│   │   ├── PaperList.jsx      # Year-grouped paper list with filtering
│   │   ├── PaperDetail.jsx    # Paper viewer with TOC and summary
│   │   ├── TableOfContents.jsx # TOC with scroll tracking
│   │   ├── ThemeSelector.jsx   # Theme dropdown component
│   │   ├── SettingsModal.jsx   # Settings modal
│   │   ├── ChatBox.jsx        # AI chat interface
│   │   └── Footer.jsx         # Site footer with GitHub link
│   └── utils/
│       ├── themes.js          # 8 custom themes with color definitions
│       ├── markdownRenderer.jsx # Advanced markdown with math support
│       └── config.js          # Configuration management utility
├── public/           # Built React application (generated by Vite)
│   ├── index.html    # Built React app
│   └── assets/       # Built CSS and JS files
├── client/           # Electron configuration
│   └── electron/
│       ├── main.js   # Electron main process configuration
│       └── preload.js # Electron preload script
├── assets/           # Static assets (icons, etc.)
└── arxivjsdata/      # Data directory (created at runtime)
    ├── userprompt.txt # Required: User's custom prompt for AI summarization
    └── [topics]/      # Topic folders containing .json and .md files
```

## Development Commands

### Unified Full-Stack Development

#### Running the Application

```bash
# Production mode - Build React and run server on single port
npm run dev

# Development mode - Real-time React building with server restart
npm run dev:unified

# Separate development - React dev server + Express server (different ports)
npm run dev:separate

# Start Electron desktop app
npm start

# Alternative: Use provided scripts
./run_arxivjs_server.sh    # Web server
./run_arxivjs_app.sh       # Desktop app
```

#### Building

```bash
# Build React application for production
npm run build

# Build with watch mode (auto-rebuild on changes)
npm run build:watch

# Preview built application
npm run preview
```

#### Electron Development and Packaging

```bash
# Electron development mode
npm run electron-dev

# Build and run Electron app
npm run build-electron

# Build distribution packages
npm run dist          # All platforms
npm run dist:win      # Windows
npm run dist:mac      # macOS
npm run dist:linux    # Linux

# Legacy packaging (using electron-packager)
npm run package:win   # Windows
npm run package:linux # Linux
```

#### Development Workflow Options

1. **Unified Port Development** (Recommended)

   ```bash
   npm run dev:unified
   ```

   - Vite builds React in watch mode
   - Express serves built files on single port (8765-8768)
   - Automatic rebuild and server restart on changes

2. **Production-like Development**

   ```bash
   npm run dev
   ```

   - Builds React once, then runs Express server
   - Single port deployment (8765-8768)
   - Manual rebuild required for React changes

3. **Separate Development**

   ```bash
   npm run dev:separate
   ```

   - React dev server on port 8765
   - Express server on port 8766
   - Hot module replacement for React

#### Development Notes

- **Single port deployment**: Express server automatically finds available port (8765-8768)
- **Vite configuration**: Builds to `public/` directory for Express to serve
- **Hot reloading**: Available in `dev:unified` and `dev:separate` modes
- **Electron integration**: Works with any development mode
- **Cross-platform**: Windows, macOS, and Linux support

### Testing

- No test suite is currently configured (package.json shows test script exits with error)

## Required Environment Setup

1. **Environment Variables**: Create `.env` file with:

   ```ini
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

2. **User Prompt File**: Create `arxivjsdata/userprompt.txt` with your custom prompt template. The prompt should include `{context}` placeholder where paper content will be inserted.

## API Endpoints

The server provides RESTful endpoints for:

- **Topics**: GET/POST/PUT/DELETE `/topics`
- **Papers**: GET/POST/PUT/DELETE `/papers/:topicName`
- **ArXiv Search**: GET `/search` with query parameters
- **Paper Summaries**: GET `/paper-summary/:topicName/:paperId`
- **AI Summarization**: POST `/summarize-and-save` (streaming response)
- **Add by URL**: POST `/paper-by-url`
- **PDF Text Extraction**: POST `/extract-pdf-text` (file upload)
- **PDF Text Summarization**: POST `/summarize-pdf-text` (streaming response)
- **PDF URL Proxy**: POST `/fetch-pdf-url` (CORS-free PDF fetching)
- **Save PDF Paper**: POST `/save-pdf-paper` (save PDF summary with metadata)

## Data Format

- **Papers**: Stored as JSON files with metadata (title, authors, year, URL, abstract)
- **Summaries**: Stored as Markdown files generated by Gemini AI
- **File naming**: Uses base64-encoded URLs as filenames for uniqueness

## UI Features

### Theme System

- **8 different color themes**: Blue, Red, Green, Ocean, Winter, Spring, Summer, Autumn
- **CSS Variables**: All colors defined as CSS custom properties for easy theming
- **Theme persistence**: Selected theme saved in localStorage
- **Real-time switching**: Themes change immediately without page refresh
- **Comprehensive styling**: All UI elements (inputs, buttons, tables) follow theme colors

### Responsive Sidebar

- **Collapsible menu**: Toggle between full sidebar and icon-only mode
- **Smart text hiding**: Menu text hidden when collapsed, icons remain visible
- **Five main sections**: Topic List, Paper List, Paper Detail, PDF Summary, Option
- **Context-aware navigation**: Menu items enabled/disabled based on current state

### Form Elements

- **Themed inputs**: All text inputs and select boxes use theme colors
- **Focus states**: Enhanced visual feedback on input focus
- **Consistent styling**: Buttons, dropdowns, and inputs follow design system

## PDF Summary Feature

### Overview

The PDF Summary feature allows users to summarize any PDF document (not just arXiv papers) by:

- Entering a PDF URL directly
- Uploading a PDF file from their device

### Technical Implementation

- **Client-side PDF processing**: Uses PDF.js library for text extraction in the browser
- **CORS handling**: Server proxy (`/fetch-pdf-url`) fetches external PDFs to avoid browser CORS restrictions
- **Dual input methods**: Radio button selection between URL input and file upload
- **Streaming summaries**: Real-time AI-powered summarization using Gemini API
- **Topic-based organization**: Summaries are associated with selected topics
- **Paper metadata management**: Collects and validates paper information (title, authors, year)
- **Automatic saving**: Saves both paper metadata (.json) and summary (.md) to topic folders

### User Interface

- **Method selection**: Radio button selection for PDF source (URL vs File Upload)
- **Conditional UI**: Shows only the selected input method
- **Real-time streaming**: Live display of summary results during generation
- **Save functionality**: Post-summarization form for paper metadata entry
- **Form validation**: Ensures required fields (title, authors, year) are completed
- **Success feedback**: Clear confirmation messages and automatic form cleanup
- **Theme integration**: Consistent styling with existing design system

### Workflow

1. **Select input method**: Choose between PDF URL or file upload
2. **Provide PDF source**: Enter URL or upload file
3. **Generate summary**: Click Summarize to process PDF and generate AI summary
4. **Enter metadata**: Fill in paper title, authors, and publication year (URL method only)
5. **Save to topic**: Store both summary and metadata in the selected topic folder

## Integration Notes

### Migration from Separate Projects

The project has been migrated from a two-application architecture (ArxivJS + ArxiView) to a unified full-stack application:

1. **ArxiView source code** has been moved from `arxiview/` to `src/` (flat structure)
2. **Dependencies merged** into single `package.json` with both frontend and backend packages
3. **Build process unified** using Vite to build React app into `public/` directory
4. **Port configuration simplified** to use single port for both frontend and API
5. **Development workflows** support both unified and separate development modes

## React Client Features

### Advanced Search & Highlighting

- **Real-time search**: Instant filtering of topics and papers
- **Field-specific search**: Search within title, authors, year, or abstract
- **Text highlighting**: Search terms highlighted in yellow across all results
- **Search statistics**: Shows number of matches found

### Math Expression Support

- **MathJax integration**: Full LaTeX math rendering support
- **Math protection**: Advanced preprocessing prevents markdown corruption
- **Korean text support**: Enhanced markdown parsing for mixed Korean/English text
- **Streaming compatibility**: Math expressions render correctly in real-time

### Table of Contents (TOC)

- **Auto-generation**: TOC created from markdown headers (h1, h2, h3)
- **Scroll tracking**: Single active item highlighting based on scroll position
- **Sticky positioning**: TOC remains visible while scrolling
- **Smooth navigation**: Click to scroll to specific sections
- **Responsive design**: Collapses on mobile devices

### Theme System

- **8 custom themes**: Light, Dark, Forest, Ocean, Sunset, Lavender, Coffee, Mint
- **CSS custom properties**: Consistent theming across all components
- **Theme persistence**: Selected theme saved in localStorage
- **Dynamic switching**: Real-time theme changes without page refresh
- **Search highlighting**: Theme-aware highlight colors

### Edge Immersive Reader Support

- **Semantic HTML**: Proper article, section, header structure
- **Meta tags**: Rich metadata for better content understanding
- **Schema.org markup**: Structured data for research articles
- **Dynamic metadata**: Page title and description update per paper

### Responsive Design

- **Mobile-first**: Optimized for touch devices
- **Flexible layout**: Grid and flexbox for adaptive design
- **Viewport optimization**: Proper scaling and touch targets
- **Footer integration**: Sticky footer with GitHub link

## Important Notes

### ArxivJS (Main Application)

- The application requires both `GEMINI_API_KEY` and `userprompt.txt` to function
- Papers are downloaded as PDFs and processed to extract text for summarization
- PDF.js library is loaded via CDN for client-side PDF text extraction
- The frontend uses extensive DOM manipulation and event handling
- Error handling includes both console logging and user-facing error dialogs
- The server supports both standalone web deployment and Electron integration
- Theme preferences are automatically saved and restored on application restart
- CORS issues with external PDFs are handled through server-side proxy endpoints

### Unified Full-Stack Application

- **Integrated architecture**: React frontend and Express backend in single project
- **Single port deployment**: Both frontend and API served from same port (8765-8768)
- **Modern React patterns**: Functional components, hooks, and context for state management
- **Built with React 19 and Vite**: Optimal performance and modern development experience
- **Real-time features**: Streaming AI summaries and live search functionality
- **MathJax integration**: Full LaTeX math rendering support for research papers
- **Cross-platform Electron**: Available as desktop application for Windows, macOS, and Linux
- **Responsive design**: Optimized for both mobile and desktop browsers
- **Theme persistence**: 8 custom themes with localStorage-based preferences
- **Development flexibility**: Multiple development modes for different workflows
- **Unified dependencies**: Single package.json manages both frontend and backend dependencies
