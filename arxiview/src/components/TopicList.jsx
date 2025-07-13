import { useState, useEffect } from 'react';
import { getTopics } from '../api';

const TopicList = ({ onTopicSelect }) => {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadTopics();
  }, []);

  const loadTopics = async () => {
    try {
      setLoading(true);
      const data = await getTopics();
      setTopics(data);
    } catch (err) {
      setError('Failed to load topics');
      console.error('Error loading topics:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTopics = topics.filter(topic =>
    topic.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  if (loading) {
    return <div className="loading">Loading topics...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div>
      <h2>Research Topics</h2>
      
      {topics.length > 0 && (
        <div className="search-container">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search topics..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="search-input"
            />
            {searchQuery && (
              <button 
                onClick={clearSearch}
                className="search-clear"
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>
          {searchQuery && (
            <div className="search-info">
              {filteredTopics.length} of {topics.length} topics found
            </div>
          )}
        </div>
      )}

      {topics.length === 0 ? (
        <div className="loading">
          No topics found. Topics will appear here when they are created in the main ArxivJS application.
        </div>
      ) : filteredTopics.length === 0 ? (
        <div className="no-results">
          No topics match your search "{searchQuery}".
        </div>
      ) : (
        <div className="topic-grid">
          {filteredTopics.map((topic) => (
            <div
              key={topic}
              className="topic-card"
              onClick={() => onTopicSelect(topic)}
            >
              <h3>{topic}</h3>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TopicList;