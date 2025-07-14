import { useState, useEffect } from 'react';
import { getPapers, searchArxivPapers, savePaperToTopic, deletePaper, getTopics, movePaper } from '../api';
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

  // New paper search states
  const [arxivSearchQuery, setArxivSearchQuery] = useState('');
  const [arxivSearchYear, setArxivSearchYear] = useState('');
  const [arxivSearchCount, setArxivSearchCount] = useState(100);
  const [arxivSearchResults, setArxivSearchResults] = useState([]);
  const [arxivSearchLoading, setArxivSearchLoading] = useState(false);
  const [arxivSearchError, setArxivSearchError] = useState(null);
  const [showArxivSearch, setShowArxivSearch] = useState(false);
  const [addedPapers, setAddedPapers] = useState(new Set());

  // Move paper states
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [availableTopics, setAvailableTopics] = useState([]);
  const [loadingTopics, setLoadingTopics] = useState(false);

  useEffect(() => {
    if (topicName) {
      loadPapers();
      // Set topic name as default search query
      setArxivSearchQuery(topicName);
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

  // ArXiv search functions
  const handleArxivSearch = async (e) => {
    e.preventDefault();
    if (!arxivSearchQuery.trim()) return;

    try {
      setArxivSearchLoading(true);
      setArxivSearchError(null);
      const results = await searchArxivPapers(arxivSearchQuery, arxivSearchYear, arxivSearchCount);

      // Check which papers already exist in the current topic
      const existingPaperUrls = new Set(papers.map(paper => paper.url));
      const alreadyAddedUrls = results
        .filter(result => existingPaperUrls.has(result.url))
        .map(result => result.url);

      // Add existing papers to addedPapers Set to hide their Add buttons
      if (alreadyAddedUrls.length > 0) {
        setAddedPapers(prev => {
          const newSet = new Set(prev);
          alreadyAddedUrls.forEach(url => newSet.add(url));
          return newSet;
        });
      }

      setArxivSearchResults(results);
    } catch (err) {
      setArxivSearchError('Failed to search papers: ' + (err.response?.data?.message || err.message));
      console.error('Error searching papers:', err);
    } finally {
      setArxivSearchLoading(false);
    }
  };

  const handleAddPaper = async (paper) => {
    try {
      await savePaperToTopic(topicName, paper);

      // Mark this paper as added to hide its Add button
      setAddedPapers(prev => new Set(prev).add(paper.url));
    } catch (err) {
      window.alert('Failed to add paper: ' + (err.response?.data?.message || err.message));
      console.error('Error adding paper:', err);
    }
  };

  const clearArxivSearch = () => {
    setArxivSearchQuery('');
    setArxivSearchYear('');
    setArxivSearchCount(100);
    setArxivSearchResults([]);
    setArxivSearchError(null);
    setAddedPapers(new Set());
  };

  const handleRefreshPapers = async () => {
    await loadPapers();

    // After refreshing, check if there are search results and update addedPapers accordingly
    if (arxivSearchResults.length > 0) {
      const refreshedPapers = await getPapers(topicName);
      const existingPaperUrls = new Set(refreshedPapers.map(paper => paper.url));
      const alreadyAddedUrls = arxivSearchResults
        .filter(result => existingPaperUrls.has(result.url))
        .map(result => result.url);

      // Update addedPapers with papers that exist in the refreshed list
      setAddedPapers(new Set(alreadyAddedUrls));
    } else {
      // Reset addedPapers if no search results
      setAddedPapers(new Set());
    }
  };

  const toggleArxivSearch = () => {
    setShowArxivSearch(!showArxivSearch);
    if (showArxivSearch) {
      clearArxivSearch();
    }
  };

  // Generate year options for the last 10 years
  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i < 10; i++) {
      const start = currentYear - (i * 3);
      const end = start - 2;
      years.push(`${end}~${start}`);
    }
    return years;
  };

  const handleDeletePaper = async (paper) => {
    const paperId = btoa(paper.url);

    if (!window.confirm(`Are you sure you want to delete this paper?\n\n"${paper.title}"`)) {
      return;
    }

    try {
      // Store current scroll position
      const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;

      await deletePaper(topicName, paperId);
      await loadPapers(); // Reload the papers list

      // Restore scroll position after a brief delay to allow for re-render
      setTimeout(() => {
        window.scrollTo(0, scrollPosition);
      }, 50);
    } catch (err) {
      window.alert('Failed to delete paper: ' + (err.response?.data?.message || err.message));
      console.error('Error deleting paper:', err);
    }
  };

  const handleMovePaper = async (paper) => {
    setSelectedPaper(paper);
    setLoadingTopics(true);
    setShowMoveModal(true);

    try {
      const topics = await getTopics();
      // Filter out the current topic and transform to objects with name and count
      const filteredTopics = topics
        .filter(topic => topic !== topicName)
        .map(async (topic) => {
          try {
            const topicPapers = await getPapers(topic);
            return {
              name: topic,
              count: topicPapers.length
            };
          } catch (error) {
            console.error(`Error getting papers for topic ${topic}:`, error);
            return {
              name: topic,
              count: 0
            };
          }
        });

      // Wait for all async operations to complete
      const resolvedTopics = await Promise.all(filteredTopics);
      setAvailableTopics(resolvedTopics);
    } catch (err) {
      window.alert('Failed to load topics: ' + (err.response?.data?.message || err.message));
      console.error('Error loading topics:', err);
      setShowMoveModal(false);
    } finally {
      setLoadingTopics(false);
    }
  };

  const handleMoveToTopic = async (targetTopicName) => {
    if (!selectedPaper) return;

    const paperId = btoa(selectedPaper.url);

    try {
      // Store current scroll position
      const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;

      await movePaper(topicName, targetTopicName, paperId);
      await loadPapers(); // Reload the papers list

      // Restore scroll position after a brief delay to allow for re-render
      setTimeout(() => {
        window.scrollTo(0, scrollPosition);
      }, 50);

      setShowMoveModal(false);
      setSelectedPaper(null);
    } catch (err) {
      window.alert('Failed to move paper: ' + (err.response?.data?.message || err.message));
      console.error('Error moving paper:', err);
    }
  };

  const closeMoveModal = () => {
    setShowMoveModal(false);
    setSelectedPaper(null);
    setAvailableTopics([]);
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
  const tocHeaders = [
    ...groupedPapers.map(({ year }) => ({
      id: `year-${year}`,
      text: `${year}`,
      level: 1,
    })),
    {
      id: 'arxiv-search',
      text: 'Search',
      level: 1,
    }
  ];


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
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          style={{ textDecoration: 'none', color: 'inherit', fontWeight: 'bold' }}
        >
          {topicName}
        </a>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Papers in {topicName}</h2>
        <button
          onClick={handleRefreshPapers}
          disabled={loading}
          className="arxiv-search-button"
          title="Refresh paper list"
          style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
        >
          {loading ? '🔄' : '↻'} Refresh
        </button>
      </div>

      {papers.length > 0 && (
        <div className="paper-search-container">
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
                      >
                        <div
                          className="paper-content"
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
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMovePaper(paper);
                          }}
                          className="paper-move-button"
                          title="Move paper to another topic"
                        >
                          ➤
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePaper(paper);
                          }}
                          className="paper-delete-button"
                          title="Delete paper"
                        >
                          ×
                        </button>
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

      {/* ArXiv Paper Search Interface */}
      <div id="arxiv-search" className="arxiv-search-section">
        <button
          onClick={toggleArxivSearch}
          className="arxiv-search-toggle"
        >
          {showArxivSearch ? '< Hide' : 'Search >'}
        </button>

        {showArxivSearch && (
          <div className="arxiv-search-container">
            <h3>Search ArXiv Papers</h3>

            <form onSubmit={handleArxivSearch} className="arxiv-search-form">
              <div className="arxiv-search-controls">
                <input
                  type="text"
                  placeholder="Enter search keywords..."
                  value={arxivSearchQuery}
                  onChange={(e) => setArxivSearchQuery(e.target.value)}
                  className="arxiv-search-input"
                  disabled={arxivSearchLoading}
                />
                <select
                  value={arxivSearchYear}
                  onChange={(e) => setArxivSearchYear(e.target.value)}
                  className="arxiv-year-select"
                  disabled={arxivSearchLoading}
                >
                  <option value="">All Years</option>
                  {generateYearOptions().map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                <select
                  value={arxivSearchCount}
                  onChange={(e) => setArxivSearchCount(parseInt(e.target.value))}
                  className="arxiv-count-select"
                  disabled={arxivSearchLoading}
                >
                  <option value={50}>50 papers</option>
                  <option value={100}>100 papers</option>
                  <option value={200}>200 papers</option>
                  <option value={500}>500 papers</option>
                </select>
                <button
                  type="submit"
                  disabled={!arxivSearchQuery.trim() || arxivSearchLoading}
                  className="arxiv-search-button"
                >
                  {arxivSearchLoading ? 'Searching...' : 'Search'}
                </button>
                {(arxivSearchQuery || arxivSearchResults.length > 0) && (
                  <button
                    type="button"
                    onClick={clearArxivSearch}
                    className="arxiv-clear-button"
                  >
                    Clear
                  </button>
                )}
              </div>
            </form>

            {arxivSearchError && (
              <div className="arxiv-search-error">
                {arxivSearchError}
              </div>
            )}

            {arxivSearchResults.length > 0 && (
              <div className="arxiv-search-results">
                <h4>Search Results ({arxivSearchResults.length} papers found)</h4>
                <div className="arxiv-results-list">
                  {arxivSearchResults.map((paper, index) => (
                    <div key={index} className="arxiv-result-item">
                      <div className="arxiv-paper-number-tag">
                        {index + 1}
                      </div>
                      <div className="arxiv-paper-info">
                        <div
                          className="arxiv-paper-title"
                          style={{
                            color: addedPapers.has(paper.url) ? 'var(--color-text-secondary)' : 'var(--color-primary)',
                            opacity: addedPapers.has(paper.url) ? 0.6 : 1
                          }}
                        >
                          {paper.title}
                        </div>
                        <div className="arxiv-paper-authors">{paper.authors}</div>
                        <div className="arxiv-paper-meta">
                          <span className="arxiv-paper-year">{paper.year}</span>
                          <a
                            href={paper.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="arxiv-paper-link"
                          >
                            View on ArXiv
                          </a>
                        </div>
                        {paper.abstract && (
                          <div className="arxiv-paper-abstract">
                            {paper.abstract.substring(0, 300)}
                            {paper.abstract.length > 300 && '...'}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleAddPaper(paper)}
                        className="arxiv-add-button"
                        disabled={addedPapers.has(paper.url)}
                        title={addedPapers.has(paper.url) ? "Already added" : "Add to this topic"}
                      >
                        {addedPapers.has(paper.url) ? 'Added' : 'Add'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Move Paper Modal */}
      {showMoveModal && (
        <div className="modal-overlay" onClick={closeMoveModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Move Paper to Topic</h3>
              <button className="modal-close" onClick={closeMoveModal}>×</button>
            </div>
            <div className="modal-body">
              {selectedPaper && (
                <div className="selected-paper-info">
                  <p><strong>Paper:</strong> {selectedPaper.title}</p>
                  <p><strong>Current Topic:</strong> {topicName}</p>
                </div>
              )}

              {loadingTopics ? (
                <div className="loading">Loading topics...</div>
              ) : availableTopics.length === 0 ? (
                <div className="no-topics">No other topics available</div>
              ) : (
                <div className="topic-selection">
                  <p>Select destination topic:</p>
                  <div className="topic-list">
                    {availableTopics.map((topic) => (
                      <button
                        key={topic.name}
                        onClick={() => handleMoveToTopic(topic.name)}
                        className="topic-item-button"
                      >
                        <div className="topic-name">{topic.name}</div>
                        <div className="topic-count">({topic.count} papers)</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaperList;