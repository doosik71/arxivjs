import { useState, useEffect } from 'react';
import { getTopics, createTopic, deleteTopic } from '../api';

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
  const [newTopicName, setNewTopicName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

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

  const handleCreateTopic = async (e) => {
    e.preventDefault();
    if (!newTopicName.trim()) return;

    try {
      setIsCreating(true);
      await createTopic(newTopicName.trim());
      setNewTopicName('');
      await loadTopics();
    } catch (err) {
      setError('Failed to create topic: ' + (err.response?.data?.message || err.message));
      console.error('Error creating topic:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTopic = async (topicName) => {
    if (!window.confirm(`Are you sure you want to delete topic "${topicName}"?`)) {
      return;
    }

    try {
      await deleteTopic(topicName);
      await loadTopics();
    } catch (err) {
      const errorMessage = 'Failed to delete topic: ' + (err.response?.data?.message || err.message);
      window.alert(errorMessage);
      console.error('Error deleting topic:', err);
    }
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
      
      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)} className="error-close">×</button>
        </div>
      )}
      
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
          No topics found. Create your first topic using the form below.
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
            >
              <h3 onClick={() => onTopicSelect(topic)}>{highlightText(topic, searchQuery)}</h3>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteTopic(topic);
                }}
                className="delete-button"
                title="Delete topic"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create Topic Form - moved to bottom */}
      <form onSubmit={handleCreateTopic} className="add-topic-form">
        <div className="form-group">
          <input
            type="text"
            placeholder="Enter new topic name..."
            value={newTopicName}
            onChange={(e) => setNewTopicName(e.target.value)}
            className="topic-input"
            disabled={isCreating}
          />
          <button 
            type="submit" 
            disabled={!newTopicName.trim() || isCreating}
            className="add-button"
          >
            {isCreating ? 'Creating...' : 'Add Topic'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TopicList;