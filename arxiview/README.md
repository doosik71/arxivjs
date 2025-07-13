# ArxiView - Arxiv Paper Reader

ArxiView is a React-based read-only frontend client for viewing research papers and summaries managed by the ArxivJS application.

## Features

- **Topic Browsing**: View all research topics created in ArxivJS
- **Paper Listing**: Browse papers within each topic, sorted by year and title
- **Paper Details**: View paper metadata, abstracts, and AI-generated summaries
- **Advanced Search**: Real-time search with text highlighting
- **Math Expression Support**: Full LaTeX math rendering with MathJax
- **Table of Contents**: Auto-generated TOC with scroll tracking
- **Multiple Themes**: 8 custom themes with consistent styling
- **Responsive Design**: Optimized for desktop and mobile viewing
- **Read-Only Interface**: Safe viewing without the ability to modify data
- **Electron Desktop App**: Available as a cross-platform desktop application

## Requirements

- Node.js 16+ 
- ArxivJS backend server running (default: http://localhost:8765)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The application will be available at http://localhost:8766

## Production Build

### Web Application
```bash
npm run build
npm run preview
```

### Desktop Application (Electron)

```bash
# Development mode (starts both Vite and Electron)
npm run electron-dev

# Build and run Electron app
npm run build-electron

# Build distributable packages
npm run dist:win    # Windows installer and portable
npm run dist:mac    # macOS DMG  
npm run dist:linux  # Linux AppImage and DEB
npm run dist        # All platforms
```

#### Windows Build Outputs
- `ArxiView-1.0.0-x64.exe` - NSIS installer
- `ArxiView-1.0.0-x64.exe` - Portable executable

#### macOS Build Outputs  
- `ArxiView-1.0.0-arm64.dmg` - Apple Silicon
- `ArxiView-1.0.0-x64.dmg` - Intel Macs

#### Linux Build Outputs
- `ArxiView-1.0.0-x64.AppImage` - Universal Linux app
- `ArxiView-1.0.0-x64.deb` - Debian/Ubuntu package

## Architecture

- **Frontend**: React 19 with Vite build tool
- **Routing**: Simple state-based navigation (no react-router)
- **API**: Communicates with ArxivJS backend via proxy
- **Styling**: Pure CSS with responsive design

## API Integration

The app connects to the ArxivJS backend through these endpoints:
- `GET /topics` - List all topics
- `GET /papers/:topicName` - List papers in a topic  
- `GET /paper-summary/:topicName/:paperId` - Get paper summary

## Usage

1. **Browse Topics**: Start page shows all available research topics
2. **View Papers**: Click a topic to see papers within that topic
3. **Read Details**: Click a paper to view its abstract and AI summary
4. **Navigate**: Use breadcrumb navigation to move between views

## Development

The app uses modern React patterns:
- Functional components with hooks
- State management with useState
- Effect handling with useEffect
- Axios for API calls
- CSS modules for styling
- React DevTools integration for debugging

### Development Tools

- **React DevTools**: Automatically enabled in development mode
- **Vite**: Fast development server with HMR
- **TypeScript support**: Type definitions included for better DX

## Browser Support

- Chrome/Edge 88+
- Firefox 85+
- Safari 14+
- Mobile browsers with ES2020 support