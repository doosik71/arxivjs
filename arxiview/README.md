# ArxiView - Research Paper Reader

ArxiView is a React-based read-only frontend client for viewing research papers and summaries managed by the ArxivJS application.

## Features

- **Topic Browsing**: View all research topics created in ArxivJS
- **Paper Listing**: Browse papers within each topic, sorted by year and title
- **Paper Details**: View paper metadata, abstracts, and AI-generated summaries
- **Responsive Design**: Optimized for desktop and mobile viewing
- **Read-Only Interface**: Safe viewing without the ability to modify data

## Requirements

- Node.js 16+ 
- ArxivJS backend server running (default: http://localhost:9900)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The application will be available at http://localhost:3000

## Production Build

```bash
npm run build
npm run preview
```

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