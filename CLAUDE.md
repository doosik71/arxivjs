# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ArxivJS is a comprehensive research paper management system consisting of two applications:

1. **ArxivJS (Main Application)**: A Node.js application with both web and desktop interfaces for managing arXiv papers and general PDF documents
2. **ArxiView (Read-only Client)**: A React-based read-only interface for browsing and viewing papers with AI summaries

### ArxivJS Features

- Create and manage topic folders
- Search arXiv papers by keywords and date ranges
- Save papers to topic folders
- Summarize any PDF document via URL or file upload
- Generate AI-powered summaries using Google's Gemini API
- Export as both web application and Electron desktop app

### ArxiView Features

- Read-only interface for browsing topics and papers
- Advanced search with text highlighting
- Math expression rendering with MathJax
- Table of Contents with scroll tracking
- Multiple theme support (8 custom themes)
- Configurable backend URL via Settings modal
- Edge Immersive Reader support
- Responsive design for mobile and desktop
- Available as both web app and Electron desktop application

## Architecture

### ArxivJS (Main Application)

The main application uses a simple client-server architecture:

### ArxiView (React Client)

ArxiView is a modern React application that consumes the ArxivJS API:

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

### Client Side (public/script.js)

- **Vanilla JavaScript** single-page application
- **Five main views**: Topic List, Paper List, Paper Detail, PDF Summary, Option
- **Real-time streaming** for AI summary generation
- **Dynamic UI updates** without page refreshes
- **Theme system** with multiple color schemes and localStorage persistence
- **Client-side PDF processing** using PDF.js for text extraction

### Desktop App (main.js)

- **Electron wrapper** that creates a BrowserWindow loading the web server
- **Integrated server startup** - imports and runs the Express server
- **Platform-specific data paths** using Electron's userData directory

## Key File Structure

### ArxivJS (Main Application)

```text
├── index.js          # Main Express server with all API endpoints
├── main.js           # Electron app entry point
├── preload.js        # Electron preload script
├── public/
│   ├── index.html    # Single-page web interface
│   ├── script.js     # Client-side JavaScript (extensive)
│   ├── style.css     # Application styling with CSS variables
│   ├── theme-blue.css     # Blue theme color scheme
│   ├── theme-red.css      # Red theme color scheme
│   ├── theme-green.css    # Green theme color scheme
│   ├── theme-ocean.css    # Ocean theme color scheme
│   ├── theme-winter.css   # Winter theme color scheme
│   ├── theme-spring.css   # Spring theme color scheme
│   ├── theme-summer.css   # Summer theme color scheme
│   └── theme-autumn.css   # Autumn theme color scheme
└── arxivjsdata/      # Data directory (created at runtime)
    ├── userprompt.txt # Required: User's custom prompt for AI summarization
    └── [topics]/      # Topic folders containing .json and .md files
```

### ArxiView (React Client)

```text
arxiview/
├── package.json      # React dependencies and scripts with Electron support
├── vite.config.js    # Vite configuration with proxy to backend
├── index.html        # HTML entry point with meta tags for Immersive Reader
├── electron/
│   └── main.js       # Electron main process configuration
├── src/
│   ├── main.jsx      # React app entry point
│   ├── App.jsx       # Main application component with routing
│   ├── api.js        # Centralized API client with configurable backend URL
│   ├── index.css     # Global styles with CSS custom properties
│   ├── components/
│   │   ├── TopicList.jsx      # Topic grid with search and highlighting
│   │   ├── PaperList.jsx      # Year-grouped paper list with filtering
│   │   ├── PaperDetail.jsx    # Paper viewer with TOC and summary
│   │   ├── TableOfContents.jsx # TOC with scroll tracking
│   │   ├── ThemeSelector.jsx   # Theme dropdown component
│   │   ├── SettingsModal.jsx   # Settings modal for backend URL configuration
│   │   └── Footer.jsx         # Site footer with GitHub link
│   └── utils/
│       ├── themes.js          # 8 custom themes with color definitions
│       ├── markdownRenderer.jsx # Advanced markdown with math support
│       └── config.js          # Configuration management utility
```

## Development Commands

### ArxivJS (Main Application)

#### Running the Application

```bash
# Start development server (web only)
npm run dev

# Start Electron desktop app
npm start

# Alternative: Use provided scripts
./run_arxivjs_server.sh    # Web server
./run_arxivjs_app.sh       # Desktop app
```

#### Building/Packaging

```bash
# Package for Windows
npm run package:win

# Package for Linux
npm run package:linux
```

### ArxiView (React Client)

#### Running the Application

```bash
# From arxiview/ directory
cd arxiview

# Start development server (default port 8766)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Electron desktop app development
npm run electron-dev

# Build and run Electron app
npm run build-electron

# Build distribution packages
npm run dist          # All platforms
npm run dist:win      # Windows
npm run dist:mac      # macOS
npm run dist:linux    # Linux
```

#### Development Notes

- ArxiView requires ArxivJS backend to be running on port 8765
- Vite proxy automatically forwards API calls to the backend
- Hot module replacement (HMR) enabled for rapid development
- Electron app available with packaging for Windows, macOS, and Linux
- Distribution builds create installers in the `release/` directory
- Backend URL configuration persists in localStorage

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

## ArxiView Features (React Client)

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

### ArxiView (React Client)

- Read-only interface - no data modification capabilities
- Requires ArxivJS backend running on port 8765 for API access
- Uses modern React patterns (hooks, functional components)
- Built with React 19 and Vite for optimal performance
- MathJax loaded via CDN for math rendering
- Available as both web application and Electron desktop app
- Responsive design supports mobile and desktop browsers
- All themes, backend URL, and search preferences stored in localStorage
- Optimized for research paper reading and browsing experience
- Cross-platform Electron packaging for Windows, macOS, and Linux
