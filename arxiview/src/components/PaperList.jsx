import { useState, useEffect } from 'react';
import { getPapers } from '../api';
import TableOfContents from './TableOfContents';

// Utility function to highlight search terms in text
const highlightText = (text, searchQuery, searchField, currentField) => {
  if (!searchQuery.trim()) return text;
  
  // Only highlight if we're searching in 'all' fields or the current field matches
  if (searchField !== 'all' && searchField !== currentField) return text;
  
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

const PaperList = ({ topicName, onPaperSelect, onBackToTopics }) => {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState('all');

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

  const filterPapers = (papers, query, field) => {
    if (!query.trim()) return papers;
    
    const searchTerm = query.toLowerCase();
    
    return papers.filter(paper => {
      switch (field) {
        case 'title':
          return paper.title.toLowerCase().includes(searchTerm);
        case 'authors':
          return paper.authors.toLowerCase().includes(searchTerm);
        case 'year':
          return paper.year.toString().includes(searchTerm);
        case 'abstract':
          return paper.abstract.toLowerCase().includes(searchTerm);
        case 'all':
        default:
          return (
            paper.title.toLowerCase().includes(searchTerm) ||
            paper.authors.toLowerCase().includes(searchTerm) ||
            paper.year.toString().includes(searchTerm) ||
            paper.abstract.toLowerCase().includes(searchTerm)
          );
      }
    });
  };

  const filteredPapers = filterPapers(papers, searchQuery, searchField);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleFieldChange = (e) => {
    setSearchField(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchField('all');
  };

  const groupPapersByYear = (papers) => {
    const grouped = papers.reduce((acc, paper) => {
      const year = paper.year;
      if (!acc[year]) {
        acc[year] = [];
      }
      acc[year].push(paper);
      return acc;
    }, {});

    // Sort years in descending order
    const sortedYears = Object.keys(grouped).sort((a, b) => parseInt(b) - parseInt(a));
    
    return sortedYears.map(year => ({
      year: parseInt(year),
      papers: grouped[year].sort((a, b) => a.title.localeCompare(b.title))
    }));
  };

  const groupedPapers = groupPapersByYear(filteredPapers);
  const tocHeaders = groupedPapers.map(({ year }) => ({
    id: `year-${year}`,
    text: `${year}`,
    level: 1,
  }));


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
      
      {papers.length > 0 && (
        <div className="search-container">
          <div className="paper-search-controls">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search papers..."
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
            <select 
              value={searchField} 
              onChange={handleFieldChange}
              className="search-field-select"
            >
              <option value="all">All Fields</option>
              <option value="title">Title</option>
              <option value="authors">Authors</option>
              <option value="year">Year</option>
              <option value="abstract">Abstract</option>
            </select>
          </div>
          
          {searchQuery && (
            <div className="search-info">
              {filteredPapers.length} of {papers.length} papers found
              {searchField !== 'all' && ` in ${searchField}`}
            </div>
          )}
        </div>
      )}

      {papers.length === 0 ? (
        <div className="loading">
          No papers found in this topic. Papers will appear here when they are added in the main ArxivJS application.
        </div>
      ) : filteredPapers.length === 0 ? (
        <div className="no-results">
          No papers match your search "{searchQuery}"
          {searchField !== 'all' && ` in ${searchField}`}.
        </div>
      ) : (
        <div className="paper-list-view">
          <div className="paper-list-container">
            {groupedPapers.map(({ year, papers }) => (
              <div key={year} id={`year-${year}`} className="year-group">
                <div className="year-header">
                  <h3 className="year-title">{year}</h3>
                  <span className="year-count">({papers.length} paper{papers.length !== 1 ? 's' : ''})</span>
                </div>
                <div className="paper-list">
                  {papers.map((paper) => {
                    const paperId = btoa(paper.url);
                    return (
                      <div
                        key={paperId}
                        className="paper-item"
                        onClick={() => onPaperSelect(paper, paperId)}
                      >
                        <div className="paper-title">
                          {highlightText(paper.title, searchQuery, searchField, 'title')}
                        </div>
                        <div className="paper-authors">
                          {highlightText(paper.authors, searchQuery, searchField, 'authors')}
                        </div>
                        <div className="paper-year">
                          {highlightText(paper.year.toString(), searchQuery, searchField, 'year')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <TableOfContents headers={tocHeaders} />
        </div>
      )}
    </div>
  );
};

export default PaperList;