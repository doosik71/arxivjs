import { useState, useEffect } from 'react';
import TopicList from './components/TopicList';
import PaperList from './components/PaperList';
import PaperDetail from './components/PaperDetail';
import ThemeSelector from './components/ThemeSelector';
import Footer from './components/Footer';
import SettingsModal from './components/SettingsModal';
import { applyTheme, getStoredTheme } from './utils/themes';
import { initializeConfig } from './utils/config';
import { updateApiConfig } from './api';

const App = () => {
  const [currentView, setCurrentView] = useState('topics');
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [selectedPaperId, setSelectedPaperId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [configStatus, setConfigStatus] = useState('initializing');

  // Initialize theme and backend configuration on app load
  useEffect(() => {
    const initializeApp = async () => {
      // Apply stored theme
      const storedTheme = getStoredTheme();
      applyTheme(storedTheme);

      // Initialize backend configuration
      try {
        setConfigStatus('initializing');
        const backendUrl = await initializeConfig();
        updateApiConfig();
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
          />
        );
      case 'paper-detail':
        return (
          <PaperDetail
            paper={selectedPaper}
            paperId={selectedPaperId}
            topicName={selectedTopic}
            onBackToPapers={handleBackToPapers}
          />
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