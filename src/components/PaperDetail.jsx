import { useState, useEffect, useRef } from 'react';
import { getPaperSummary, chatWithGemini, generatePaperSummary, deletePaper, deletePaperSummary, updateCitationCount, fetchAndUpdateCitation, translateText } from '../api';
import { parseMarkdownWithMath, extractTableOfContents } from '../utils/markdownRenderer';
import ChatBox from './ChatBox';
import ErrorBoundary from './ErrorBoundary';
import './PaperDetail.css';

const PaperDetail = ({ paper: initialPaper, paperId, topicName, onBackToPapers, onTocUpdate }) => {
  // Component for summary copy buttons
  const CopySummaryButtons = () => {
    const [activeTooltip, setActiveTooltip] = useState('');

    const showTooltip = (type) => {
      setActiveTooltip(type);
      setTimeout(() => setActiveTooltip(''), 2000);
    };

    const copyAsRichText = () => {
      if (summaryRef.current) {
        const html = summaryRef.current.innerHTML;
        const blob = new Blob([html], { type: 'text/html' });
        const data = new ClipboardItem({ 'text/html': blob });
        navigator.clipboard.write([data]).then(() => showTooltip('rich'));
      }
    };

    const copyAsMarkdown = () => {
      if (summary) {
        navigator.clipboard.writeText(summary).then(() => showTooltip('md'));
      }
    };

    const copyAsHtml = () => {
      if (summaryRef.current) {
        navigator.clipboard.writeText(summaryRef.current.innerHTML).then(() => showTooltip('html'));
      }
    };

    return (
      <div className="copy-buttons-container">
        <div className="copy-btn-wrapper">
          <button onClick={copyAsRichText} className="copy-btn" title="Copy as Rich Text">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M6 2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm0 2v16h12V9h-5V4H6zm10 2.5L18.5 9H16v-2.5z" /></svg>
          </button>
          {activeTooltip === 'rich' && <div className="tooltip">Copied as Rich Text!</div>}
        </div>
        <div className="copy-btn-wrapper">
          <button onClick={copyAsMarkdown} className="copy-btn" title="Copy as Markdown">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="3" ry="3" fill="none" stroke="currentColor" stroke-width="2" />
              <path d="M7 18V8L12 13L17 8V18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="miter" />
            </svg>
          </button>
          {activeTooltip === 'md' && <div className="tooltip">Copied as Markdown!</div>}
        </div>
        <div className="copy-btn-wrapper">
          <button onClick={copyAsHtml} className="copy-btn" title="Copy as HTML">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" /></svg>
          </button>
          {activeTooltip === 'html' && <div className="tooltip">Copied as HTML!</div>}
        </div>
      </div>
    );
  };

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
  const [isUpdatingCitation, setIsUpdatingCitation] = useState(false);
  const [translatedAbstract, setTranslatedAbstract] = useState('');
  const [isTranslated, setIsTranslated] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const summaryRef = useRef(null);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(paper.url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link: ', err);
    }
  };

  const handleTranslate = async () => {
    if (!paper.abstract) return;
    setIsTranslating(true);
    try {
      const translation = await translateText(paper.abstract);
      setTranslatedAbstract(translation);
      setIsTranslated(true);
    } catch (error) {
      console.error('Translation failed:', error);
      // Optionally, show an error to the user
    } finally {
      setIsTranslating(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [paperId]);

  useEffect(() => {
    setPaper(initialPaper);
    setIsEditingCitation(false); // Reset editing state when paper changes
    setIsTranslated(false);
    setTranslatedAbstract('');
    setIsTranslating(false);
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

  useEffect(() => {
    if (summaryRef.current && window.MathJax) {
      window.MathJax.typesetPromise([summaryRef.current]).catch((err) => {
        console.error('MathJax rendering error:', err);
      });
    }
  }, [summary, isGeneratingSummary]);

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

      if (!response.body) {
        throw new Error("Streaming not supported");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantResponse = '';

      // Add a placeholder for the assistant's message
      setChatHistory(prevHistory => [...prevHistory, { role: 'assistant', content: '' }]);

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
                assistantResponse += data;
                // Update the last message in the history
                setChatHistory(prevHistory => {
                  const updatedHistory = [...prevHistory];
                  updatedHistory[updatedHistory.length - 1].content = assistantResponse;
                  return updatedHistory;
                });
              }
            } catch (e) {
              console.warn('Failed to parse chat stream chunk:', line);
            }
          }
        }
      }
      reader.releaseLock();

    } catch (error) {
      console.error('Chat error:', error);
      setChatHistory(prevHistory => {
        const newHistory = [...prevHistory];
        // If the last message is an empty assistant message (placeholder), replace it.
        if (newHistory.length > 0 && newHistory[newHistory.length - 1].role === 'assistant' && newHistory[newHistory.length - 1].content === '') {
          newHistory[newHistory.length - 1].content = 'Sorry, I encountered an error. Please try again.';
        } else {
          // Otherwise, add a new error message
          newHistory.push({ role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' });
        }
        return newHistory;
      });
    } finally {
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

  const handleAutoUpdateCitation = async () => {
    setIsUpdatingCitation(true);

    let success = true;

    try {
      const updatedData = await fetchAndUpdateCitation(topicName, paperId);
      setPaper(updatedData.paper);
      if (updatedData.message && updatedData.message.includes('Could not find')) {
        success = false;
      }
    } catch (error) {
      success = false;
    } finally {
      setIsUpdatingCitation(false);
    }

    if (!success) {
      openScholarSearch();
    }
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
              className="paper-delete-button"
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
                        <span className="citation-count">{paper.citation >= 100 ? '🔖' : '🏷️'}{paper.citation.toLocaleString()}</span>
                      </div>
                    ) : (
                      <div className="citation-add" onClick={handleStartEditingCitation} title="Add citation count">
                        <span className="citation-count">🏷️?</span>
                      </div>
                    )}
                    <button onClick={handleAutoUpdateCitation} disabled={isUpdatingCitation || isEditingCitation} className="citation-update-button" title="Update citation count from Semantic Scholar">
                      {isUpdatingCitation ? '⏳' : '🔃'}
                    </button>
                  </>
                )}
              </div>
              <div className="paper-url-container">
                <a href={paper.url} target="_blank" rel="noopener noreferrer" itemProp="url" className="paper-link">{paper.url}</a>
                <div className="copy-btn-wrapper">
                  <button onClick={handleCopyLink} className="copy-btn" title="Copy link to clipboard">
                    🔗
                  </button>
                  {linkCopied && <div className="tooltip">Copied!</div>}
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="paper-abstract">
          <h2>Abstract</h2>
          <div itemProp="abstract">
            <p>{isTranslated ? translatedAbstract : paper.abstract}</p>
          </div>
          <div className="abstract-actions">
            {isTranslating ? (
              <div className="loading-spinner"></div>
            ) : isTranslated ? (
              <button onClick={() => setIsTranslated(false)} className="translate-button" title="Show Original">
                원문
              </button>
            ) : (
              <button onClick={handleTranslate} className="translate-button" title="Translate to Korean">
                번역
              </button>
            )}
          </div>
        </section>

        <section className={`paper-summary${isGeneratingSummary ? ' generating-in-progress' : ''}`}>
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
                  <main className="formatted-summary" itemProp="description" ref={summaryRef}>
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
                <div className="summary-actions">
                  <CopySummaryButtons />
                  <button
                    onClick={handleDeleteSummary}
                    disabled={isDeletingSummary}
                    className="delete-summary-button"
                    title="Delete summary"
                  >
                    {isDeletingSummary ? '⏳' : '×'}
                  </button>
                </div>
              </div>
              <main className="formatted-summary" itemProp="description" ref={summaryRef}>
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
