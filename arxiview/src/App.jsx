import { useState, useEffect, useCallback } from 'react';
import TopicList from './components/TopicList';
import PaperList from './components/PaperList';
import PaperDetail from './components/PaperDetail';
import TableOfContents from './components/TableOfContents';
import ThemeSelector from './components/ThemeSelector';
import Footer from './components/Footer';
import SettingsModal from './components/SettingsModal';
import { applyTheme, getStoredTheme } from './utils/themes';
import { initializeConfig } from './utils/config';
import { initializeApi, updateApiConfig } from './api';

const App = () => {
  const [currentView, setCurrentView] = useState('topics');
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [selectedPaperId, setSelectedPaperId] = useState(null);
  const [lastSelectedPaperId, setLastSelectedPaperId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [configStatus, setConfigStatus] = useState('initializing');
  const [tocHeaders, setTocHeaders] = useState([]);

  // Initialize theme and backend configuration on app load
  useEffect(() => {
    const initializeApp = async () => {
      // Apply stored theme
      const storedTheme = getStoredTheme();
      applyTheme(storedTheme);

      // Initialize API from command line args
      await initializeApi();

      // Initialize backend configuration
      try {
        setConfigStatus('initializing');
        const backendUrl = await initializeConfig();
        updateApiConfig(); // This might be redundant if initializeApi already sets it
        setConfigStatus('connected');
        console.log(`Backend initialized at: ${backendUrl}`);
      } catch (error) {
        console.error('Failed to initialize backend config:', error);
        setConfigStatus('error');
      }
    };

    initializeApp();
  }, []);

  const handleTopicSelect = (topicName) => {
    setSelectedTopic(topicName);
    setCurrentView('papers');
  };

  const handlePaperSelect = (paper, paperId) => {
    setLastSelectedPaperId(paperId);
    setSelectedPaper(paper);
    setSelectedPaperId(paperId);
    setCurrentView('paper-detail');
  };

  const handleBackToTopics = () => {
    setSelectedTopic(null);
    setSelectedPaper(null);
    setSelectedPaperId(null);
    setCurrentView('topics');
  };

  const handleBackToPapers = () => {
    setSelectedPaper(null);
    setSelectedPaperId(null);
    setCurrentView('papers');
  };

  const handleConfigUpdate = async (newConfig) => {
    try {
      setConfigStatus('updating');
      updateApiConfig();
      setConfigStatus('connected');
      console.log('Configuration updated:', newConfig);
    } catch (error) {
      console.error('Failed to update configuration:', error);
      setConfigStatus('error');
    }
  };

  const handleTocUpdate = useCallback((headers) => {
    setTocHeaders(headers);
  }, []);

  const renderCurrentView = () => {
    switch (currentView) {
      case 'topics':
        return <TopicList onTopicSelect={handleTopicSelect} />;
      case 'papers':
        return (
          <PaperList
            topicName={selectedTopic}
            onPaperSelect={handlePaperSelect}
            onBackToTopics={handleBackToTopics}
            lastSelectedPaperId={lastSelectedPaperId}
          />
        );
      case 'paper-detail':
        return (
          <div className="paper-detail-view">
            <PaperDetail
              paper={selectedPaper}
              paperId={selectedPaperId}
              topicName={selectedTopic}
              onBackToPapers={handleBackToPapers}
              onTocUpdate={handleTocUpdate}
            />
            {tocHeaders.length > 0 && (
              <aside className="toc-container">
                <TableOfContents headers={tocHeaders} />
              </aside>
            )}
          </div>
        );
      default:
        return <TopicList onTopicSelect={handleTopicSelect} />;
    }
  };

  return (
    <div className="App">
      <header className="header">
        <div className="container">
          <div className="header-content">
            <h1>ArxiView - Arxiv Paper Reader</h1>
            <div className="header-controls">
              <div className="backend-status">
                <span className={`status-indicator ${configStatus}`}>
                  {configStatus === 'initializing' && '🔄'}
                  {configStatus === 'connected' && '🟢'}
                  {configStatus === 'error' && '🔴'}
                  {configStatus === 'updating' && '⚙️'}
                </span>
                <span className="status-text">
                  {configStatus === 'initializing' && 'Connecting...'}
                  {configStatus === 'connected' && 'Connected'}
                  {configStatus === 'error' && 'Connection Error'}
                  {configStatus === 'updating' && 'Updating...'}
                </span>
              </div>
              <button 
                className="settings-button"
                onClick={() => setShowSettings(true)}
                title="Backend Settings"
              >
                ⚙️
              </button>
              <ThemeSelector />
            </div>
          </div>
        </div>
      </header>
      
      <main className="container">
        {renderCurrentView()}
      </main>
      
      <Footer />
      
      <SettingsModal 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onConfigUpdate={handleConfigUpdate}
      />
    </div>
  );
};

export default App;
