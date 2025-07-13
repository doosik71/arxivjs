import { useState, useEffect } from 'react';
import { getTopics } from '../api';

// Utility function to highlight search terms in text
const highlightText = (text, searchQuery) => {
  if (!searchQuery.trim()) return text;
  
  const searchTerm = searchQuery.toLowerCase();
  const textLower = text.toLowerCase();
  
  if (!textLower.includes(searchTerm)) return text;
  
  // Find all occurrences of the search term
  const parts = [];
  let lastIndex = 0;
  let index = textLower.indexOf(searchTerm, lastIndex);
  
  while (index !== -1) {
    // Add text before the match
    if (index > lastIndex) {
      parts.push(text.substring(lastIndex, index));
    }
    
    // Add the highlighted match
    parts.push(
      <mark key={`${index}-${searchTerm}`} className="search-highlight">
        {text.substring(index, index + searchTerm.length)}
      </mark>
    );
    
    lastIndex = index + searchTerm.length;
    index = textLower.indexOf(searchTerm, lastIndex);
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts;
};

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
              <h3>{highlightText(topic, searchQuery)}</h3>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TopicList;