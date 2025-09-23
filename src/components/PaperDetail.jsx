import { useState, useEffect } from 'react';
import { getPaperSummary, chatWithGemini, generatePaperSummary, deletePaper, deletePaperSummary, updateCitationCount } from '../api';
import { parseMarkdownWithMath, extractTableOfContents } from '../utils/markdownRenderer';
import ChatBox from './ChatBox';
import ErrorBoundary from './ErrorBoundary';

const PaperDetail = ({ paper: initialPaper, paperId, topicName, onBackToPapers, onTocUpdate }) => {
  const [paper, setPaper] = useState(initialPaper);
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingSummary, setIsDeletingSummary] = useState(false);
  const [isEditingCitation, setIsEditingCitation] = useState(false);
  const [citationInput, setCitationInput] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [paperId]);

  useEffect(() => {
    setPaper(initialPaper);
    setIsEditingCitation(false); // Reset editing state when paper changes
  }, [initialPaper]);

  useEffect(() => {
    if (paperId && topicName) {
      loadSummary();
    }
  }, [paperId, topicName]);

  // Update page metadata for immersive reader
  useEffect(() => {
    if (paper) {
      // Update document title
      document.title = `${paper.title} - ArxiView`;

      // Update meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content',
          paper.abstract ? paper.abstract.substring(0, 160) + '...' :
            `Research paper: ${paper.title} by ${paper.authors}`
        );
      }

      // Update Open Graph metadata
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        ogTitle.setAttribute('content', paper.title);
      }

      const ogDescription = document.querySelector('meta[property="og:description"]');
      if (ogDescription) {
        ogDescription.setAttribute('content',
          paper.abstract ? paper.abstract.substring(0, 200) + '...' :
            `Research paper by ${paper.authors}, published in ${paper.year}`
        );
      }

      // Add article metadata
      const articleAuthor = document.querySelector('meta[property="article:author"]');
      if (articleAuthor) {
        articleAuthor.setAttribute('content', paper.authors);
      }

      // Add publication date if available
      let articlePublished = document.querySelector('meta[property="article:published_time"]');
      if (!articlePublished) {
        articlePublished = document.createElement('meta');
        articlePublished.setAttribute('property', 'article:published_time');
        document.head.appendChild(articlePublished);
      }
      articlePublished.setAttribute('content', `${paper.year}-01-01`);
    }

    // Cleanup on unmount
    return () => {
      document.title = 'ArxiView - Paper Reader';
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content',
          'A read-only interface for browsing and viewing research papers and AI-generated summaries'
        );
      }
    };
  }, [paper]);

  useEffect(() => {
    if (summary) {
      const headers = extractTableOfContents(summary);
      onTocUpdate(headers);
    }
    // Clear TOC when component unmounts or summary is cleared
    return () => {
      onTocUpdate([]);
    };
  }, [summary, onTocUpdate]);

  const loadSummary = async () => {
    try {
      setLoadingSummary(true);
      setSummaryError(null);
      const summaryData = await getPaperSummary(topicName, paperId);
      setSummary(summaryData);
    } catch (err) {
      setSummaryError('Failed to load summary');
      console.error('Error loading summary:', err);
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleGenerateSummary = async () => {
    try {
      setIsGeneratingSummary(true);
      setSummaryError(null);

      const response = await generatePaperSummary(topicName, paper);

      // Check if streaming is supported
      if (!response.body || !response.body.getReader) {
        // Fallback to regular response
        const text = await response.text();
        setSummary(text);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let summaryText = '';

      setSummary(''); // Clear existing summary to show streaming

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonData = line.substring(6).trim();
                if (jsonData && jsonData !== '[DONE]') {
                  const data = JSON.parse(jsonData);
                  summaryText += data;
                  setSummary(summaryText);
                }
              } catch (e) {
                // Ignore invalid JSON chunks
                console.warn('Failed to parse chunk:', line);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

    } catch (err) {
      setSummaryError('Failed to generate summary: ' + (err.message || 'Unknown error'));
      console.error('Error generating summary:', err);
      setSummary(null); // Clear partial summary on error
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleClearChatHistory = () => {
    setChatHistory([]);
  };

  const handleSendMessage = async (message) => {
    const newHistory = [...chatHistory, { role: 'user', content: message }];
    setChatHistory(newHistory);
    setIsChatLoading(true);

    try {
      const response = await chatWithGemini(topicName, paperId, newHistory);
      setChatHistory([...newHistory, { role: 'assistant', content: response.message }]);
    } catch (error) {
      console.error('Chat error:', error);
      setChatHistory([...newHistory, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    }
    finally {
      setIsChatLoading(false);
    }
  };

  const handleDeletePaper = async () => {
    if (!confirm(`Are you sure you want to delete "${paper.title}"?`)) {
      return;
    }

    try {
      setIsDeleting(true);
      await deletePaper(topicName, paperId);
      onBackToPapers(); // Navigate back to paper list
    } catch (error) {
      console.error('Error deleting paper:', error);
      alert('Failed to delete paper. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSummary = async () => {
    if (!confirm('Are you sure you want to delete the summary? This will only delete the AI-generated summary, not the paper itself.')) {
      return;
    }

    try {
      setIsDeletingSummary(true);
      await deletePaperSummary(topicName, paperId);
      setSummary(null); // Clear the summary from state
      setSummaryError(null); // Clear any errors
    } catch (error) {
      console.error('Error deleting summary:', error);
      alert('Failed to delete summary. Please try again.');
    } finally {
      setIsDeletingSummary(false);
    }
  };

  const handleSaveCitation = async () => {
    const count = parseInt(citationInput, 10);
    if (isNaN(count) || count < 0) {
      alert('Please enter a valid non-negative number.');
      return;
    }
    try {
      const updatedData = await updateCitationCount(topicName, paperId, count);
      setPaper(updatedData.paper);
      setIsEditingCitation(false);
      setCitationInput('');
    } catch (error) {
      console.error('Failed to update citation count:', error);
      alert('Failed to save citation count. Please try again.');
    }
  };

  const openScholarSearch = () => {
    const scholarUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(paper.title)}`;
    window.open(scholarUrl, '_blank', 'noopener,noreferrer');
  };

  const handleStartEditingCitation = () => {
    setCitationInput(paper.citation !== undefined ? paper.citation.toString() : '');
    setIsEditingCitation(true);
  };

  const handleCancelEditingCitation = () => {
    setIsEditingCitation(false);
    setCitationInput('');
  };

  const formatSummary = (summaryText) => {
    if (!summaryText) return null;
    return parseMarkdownWithMath(summaryText);
  };

  return (
    <article>
      <nav className="breadcrumb">
        <a href="#" onClick={(e) => { e.preventDefault(); onBackToPapers(); }}>
          ← Back to {topicName}
        </a>
        {' / '}
        <strong
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{ cursor: 'pointer' }}
          title="Click to scroll to top"
        >
          {paper.title}
        </strong>
      </nav>

      <div className="paper-detail">
        <header>
          <div className="paper-header">
            <h1>{paper.title}</h1>
            <button
              onClick={handleDeletePaper}
              disabled={isDeleting}
              className="delete-button"
              title="Delete paper"
            >
              {isDeleting ? '⏳' : '×'}
            </button>
          </div>

          <div className="paper-meta" itemScope itemType="https://schema.org/ScholarlyArticle">
            <meta itemProp="name" content={paper.title} />
            <div>
              <span itemProp="author">{paper.authors}</span>
              <span className="paper-year"><time itemProp="datePublished">{paper.year}</time></span>
              <div className="citation-info">
                {isEditingCitation ? (
                  <>
                    <input
                      type="number"
                      value={citationInput}
                      onChange={(e) => setCitationInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveCitation();
                        }
                      }}
                      placeholder="Enter count"
                      className="citation-input-inline"
                      autoFocus
                    />
                    <button onClick={handleSaveCitation} className="citation-button-save">Save</button>
                    <button onClick={handleCancelEditingCitation} className="citation-button-cancel">Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={openScholarSearch} className="scholar-search-button" title="Search on Google Scholar" type="button">🎓</button>
                    {paper.citation !== undefined ? (
                      <div className="citation-display" onClick={handleStartEditingCitation} title="Click to edit citation count">
                        <span className="citation-count">🔖{paper.citation.toLocaleString()}</span>
                      </div>
                    ) : (
                      <div className="citation-add" onClick={handleStartEditingCitation} title="Add citation count">
                        <span className="citation-count">🔖N/A</span>
                      </div>
                    )}
                  </>
                )}
              </div>
              <a href={paper.url} target="_blank" rel="noopener noreferrer" itemProp="url" className="paper-link">{paper.url}</a>
            </div>
          </div>
        </header>

        <section className="paper-abstract">
          <h2>Abstract</h2>
          <div itemProp="abstract">
            <p>{paper.abstract}</p>
          </div>
        </section>

        <section className="paper-summary">
          {loadingSummary ? (
            <div className="loading">Loading summary...</div>
          ) : summaryError ? (
            <div className="error">{summaryError}</div>
          ) : isGeneratingSummary ? (
            <div className="generating-summary">
              <div className="loading">
                Generating AI summary...
                <div className="spinner"></div>
              </div>
              {summary && (
                <div className="summary-preview">
                  <main className="formatted-summary" itemProp="description">
                    <ErrorBoundary>
                      {formatSummary(summary)}
                    </ErrorBoundary>
                  </main>
                </div>
              )}
            </div>
          ) : summary ? (
            <div className="summary-view">
              <div className="summary-header">
                <h2>Summary</h2>
                <button
                  onClick={handleDeleteSummary}
                  disabled={isDeletingSummary}
                  className="delete-summary-button"
                  title="Delete summary"
                >
                  {isDeletingSummary ? '⏳' : '×'}
                </button>
              </div>
              <main className="formatted-summary" itemProp="description">
                <ErrorBoundary>
                  {formatSummary(summary)}
                </ErrorBoundary>
              </main>
            </div>
          ) : (
            <div className="no-summary">
              <p>No summary available yet.</p>
              <button
                onClick={handleGenerateSummary}
                disabled={isGeneratingSummary}
                className="summarize-button"
              >
                Generate Summary
              </button>
            </div>
          )}
        </section>
      </div>
      {summary && !summaryError && (
        <ChatBox
          onSendMessage={handleSendMessage}
          chatHistory={chatHistory}
          isLoading={isChatLoading}
          onClearHistory={handleClearChatHistory}
        />
      )}
    </article>
  );
};

export default PaperDetail;
