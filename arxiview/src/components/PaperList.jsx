import { useState, useEffect } from 'react';
import { getPapers } from '../api';

const PaperList = ({ topicName, onPaperSelect, onBackToTopics }) => {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (topicName) {
      loadPapers();
    }
  }, [topicName]);

  const loadPapers = async () => {
    try {
      setLoading(true);
      const data = await getPapers(topicName);
      setPapers(data);
    } catch (err) {
      setError('Failed to load papers');
      console.error('Error loading papers:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading papers...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div>
      <div className="breadcrumb">
        <a href="#" onClick={(e) => { e.preventDefault(); onBackToTopics(); }}>
          ← Back to Topics
        </a>
        {' / '}
        <strong>{topicName}</strong>
      </div>
      
      <h2>Papers in {topicName}</h2>
      
      {papers.length === 0 ? (
        <div className="loading">
          No papers found in this topic. Papers will appear here when they are added in the main ArxivJS application.
        </div>
      ) : (
        <div className="paper-list">
          {papers.map((paper) => {
            const paperId = btoa(paper.url);
            return (
              <div
                key={paperId}
                className="paper-item"
                onClick={() => onPaperSelect(paper, paperId)}
              >
                <div className="paper-title">{paper.title}</div>
                <div className="paper-authors">{paper.authors}</div>
                <div className="paper-year">{paper.year}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PaperList;