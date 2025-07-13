import { useState, useEffect } from 'react';
import { getPaperSummary, chatWithGemini } from '../api';
import { parseMarkdownWithMath, extractTableOfContents } from '../utils/markdownRenderer';
import TableOfContents from './TableOfContents';
import ChatBox from './ChatBox';

const PaperDetail = ({ paper, paperId, topicName, onBackToPapers }) => {
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

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

  const loadSummary = async () => {
    try {
      setLoadingSummary(true);
      const summaryData = await getPaperSummary(topicName, paperId);
      setSummary(summaryData);
    } catch (err) {
      setSummaryError('Failed to load summary');
      console.error('Error loading summary:', err);
    } finally {
      setLoadingSummary(false);
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
    } finally {
      setIsChatLoading(false);
    }
  };

  const formatSummary = (summaryText) => {
    if (!summaryText) return null;
    return parseMarkdownWithMath(summaryText);
  };

  const getTOCHeaders = (summaryText) => {
    if (!summaryText) return [];
    return extractTableOfContents(summaryText);
  };

  return (
    <article>
      <nav className="breadcrumb">
        <a href="#" onClick={(e) => { e.preventDefault(); onBackToPapers(); }}>
          ← Back to {topicName}
        </a>
        {' / '}
        <strong>{paper.title}</strong>
      </nav>

      <div className="paper-detail">
        <header>
          <h1>{paper.title}</h1>
          
          <div className="paper-meta" itemScope itemType="https://schema.org/ScholarlyArticle">
            <meta itemProp="name" content={paper.title} />
            <p><strong>Authors:</strong> <span itemProp="author">{paper.authors}</span></p>
            <p><strong>Year:</strong> <time itemProp="datePublished">{paper.year}</time></p>
            <p><strong>URL:</strong> <a href={paper.url} target="_blank" rel="noopener noreferrer" itemProp="url">{paper.url}</a></p>
          </div>
        </header>

        <section className="paper-abstract">
          <h2>Abstract</h2>
          <div itemProp="abstract">
            <p>{paper.abstract}</p>
          </div>
        </section>

        <section className="paper-summary">
          <h2>AI Summary</h2>
          {loadingSummary ? (
            <div className="loading">Loading summary...</div>
          ) : summaryError ? (
            <div className="error">{summaryError}</div>
          ) : summary ? (
            <div className="summary-view">
              <main className="formatted-summary" itemProp="description">
                {formatSummary(summary)}
              </main>
              <aside className="sidebar">
                {getTOCHeaders(summary).length > 0 && (
                  <TableOfContents headers={getTOCHeaders(summary)} />
                )}
                <ChatBox
                  onSendMessage={handleSendMessage}
                  chatHistory={chatHistory}
                  isLoading={isChatLoading}
                  onClearHistory={handleClearChatHistory}
                />
              </aside>
            </div>
          ) : (
            <div className="no-summary">
              No summary available. Generate a summary in the main ArxiView application.
            </div>
          )}
        </section>
      </div>
    </article>
  );
};

export default PaperDetail;