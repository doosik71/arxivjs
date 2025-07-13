import { useState, useEffect } from 'react';
import { getPaperSummary } from '../api';
import { parseMarkdownWithMath, extractTableOfContents } from '../utils/markdownRenderer';
import TableOfContents from './TableOfContents';

const PaperDetail = ({ paper, paperId, topicName, onBackToPapers }) => {
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState(null);

  useEffect(() => {
    if (paperId && topicName) {
      loadSummary();
    }
  }, [paperId, topicName]);

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

  const formatSummary = (summaryText) => {
    if (!summaryText) return null;
    return parseMarkdownWithMath(summaryText);
  };

  const getTOCHeaders = (summaryText) => {
    if (!summaryText) return [];
    return extractTableOfContents(summaryText);
  };

  return (
    <div>
      <div className="breadcrumb">
        <a href="#" onClick={(e) => { e.preventDefault(); onBackToPapers(); }}>
          ← Back to {topicName}
        </a>
        {' / '}
        <strong>{paper.title}</strong>
      </div>

      <div className="paper-detail">
        <h2>{paper.title}</h2>
        
        <div className="paper-meta">
          <p><strong>Authors:</strong> {paper.authors}</p>
          <p><strong>Year:</strong> {paper.year}</p>
          <p><strong>URL:</strong> <a href={paper.url} target="_blank" rel="noopener noreferrer">{paper.url}</a></p>
        </div>

        <div className="paper-abstract">
          <h3>Abstract</h3>
          <p>{paper.abstract}</p>
        </div>

        <div className="paper-summary">
          <h3>AI Summary</h3>
          {loadingSummary ? (
            <div className="loading">Loading summary...</div>
          ) : summaryError ? (
            <div className="error">{summaryError}</div>
          ) : summary ? (
            <div className="summary-with-toc">
              {getTOCHeaders(summary).length > 0 && (
                <TableOfContents headers={getTOCHeaders(summary)} />
              )}
              <div className="formatted-summary">{formatSummary(summary)}</div>
            </div>
          ) : (
            <div className="no-summary">
              No summary available. Generate a summary in the main ArxivJS application.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaperDetail;