import { useState } from 'react';
import TopicList from './components/TopicList';
import PaperList from './components/PaperList';
import PaperDetail from './components/PaperDetail';

const App = () => {
  const [currentView, setCurrentView] = useState('topics');
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [selectedPaperId, setSelectedPaperId] = useState(null);

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
          <h1>ArxiView - Research Paper Reader</h1>
        </div>
      </header>
      
      <main className="container">
        {renderCurrentView()}
      </main>
    </div>
  );
};

export default App;