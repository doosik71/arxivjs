import React, { useState, useEffect, useRef } from 'react';
import { getPaperSummary, getPaperHighlights, savePaperHighlights, chatWithPaper, generatePaperSummary, deletePaper, deletePaperSummary, updateCitationCount, fetchAndUpdateCitation, translateText } from '../api';
import { parseMarkdownWithMath, extractTableOfContents } from '../utils/markdownRenderer';
import { getSavedConfig } from '../utils/config';
import { getPaperId } from '../utils/paperId';
import ChatBox from './ChatBox';
import ErrorBoundary from './ErrorBoundary';
import './PaperDetail.css';

const HIGHLIGHT_COLORS = [
  { name: 'sun', value: 'sun', hex: '#fff3a3' },
  { name: 'amber', value: 'amber', hex: '#ffd8a8' },
  { name: 'rose', value: 'rose', hex: '#ffc9de' },
  { name: 'mint', value: 'mint', hex: '#c3fae8' },
  { name: 'sky', value: 'sky', hex: '#b3e5fc' },
  { name: 'violet', value: 'violet', hex: '#d0bfff' },
  { name: 'stone', value: 'stone', hex: '#dee2e6' }
];

const BLOCK_HIGHLIGHT_TAGS = new Set(['p', 'li', 'blockquote', 'td', 'th', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
const EXCLUDED_HIGHLIGHT_SELECTOR = 'pre, code, mjx-container, .MathJax, .latex-math-1, .latex-math-2';

const normalizeHighlightText = (text) => (
  typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : ''
);

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const MATH_SEGMENT_REGEX = /\$\$[\s\S]+?\$\$|\$([^\n\r$]+?)\$/g;

const findHighlightByText = (highlights, text) => {
  const normalizedText = normalizeHighlightText(text);
  return highlights.find((highlight) => normalizeHighlightText(highlight.text) === normalizedText) || null;
};

const buildHighlightRenderKey = (paperId, highlights) => {
  const signature = highlights
    .map((highlight) => `${normalizeHighlightText(highlight.text)}:${highlight.color}`)
    .join('|');

  return `${paperId || 'paper'}::${signature}`;
};

const isExcludedHighlightNode = (node) => {
  if (!React.isValidElement(node)) {
    return false;
  }

  const tagName = typeof node.type === 'string' ? node.type.toLowerCase() : '';
  const className = typeof node.props?.className === 'string' ? node.props.className : '';

  return tagName === 'pre'
    || tagName === 'code'
    || tagName === 'mjx-container'
    || className.includes('latex-math-')
    || className.includes('MathJax');
};

const isExcludedDomNode = (node) => {
  if (!node) {
    return false;
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    return node.matches?.(EXCLUDED_HIGHLIGHT_SELECTOR) || false;
  }

  if (node.nodeType === Node.TEXT_NODE) {
    return node.parentElement?.closest?.(EXCLUDED_HIGHLIGHT_SELECTOR) || false;
  }

  return false;
};

const collectSelectableTextFromDom = (node) => {
  if (!node) {
    return '';
  }

  if (isExcludedDomNode(node)) {
    return ' ';
  }

  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || '';
  }

  if (!node.childNodes?.length) {
    return '';
  }

  return Array.from(node.childNodes)
    .map((child) => collectSelectableTextFromDom(child))
    .join('');
};

const extractHighlightTextFromRange = (range) => {
  if (!range) {
    return '';
  }

  const fragment = range.cloneContents();
  return normalizeHighlightText(collectSelectableTextFromDom(fragment));
};

const collectHighlightableText = (node) => {
  if (typeof node === 'string') {
    return node.replace(MATH_SEGMENT_REGEX, ' ');
  }

  if (typeof node === 'number' || node == null || !React.isValidElement(node)) {
    return '';
  }

  if (isExcludedHighlightNode(node)) {
    return ' ';
  }

  return React.Children.toArray(node.props.children)
    .map((child) => collectHighlightableText(child))
    .join('');
};

const splitTextIntoMathAwareSegments = (text) => {
  if (!text) {
    return [];
  }

  const segments = [];
  let lastIndex = 0;
  let match;
  MATH_SEGMENT_REGEX.lastIndex = 0;

  while ((match = MATH_SEGMENT_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        raw: text.slice(lastIndex, match.index),
        display: text.slice(lastIndex, match.index)
      });
    }

    segments.push({
      type: 'math',
      raw: match[0],
      display: ' '
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      raw: text.slice(lastIndex),
      display: text.slice(lastIndex)
    });
  }

  return segments;
};

const buildHighlightMap = (text, highlights) => {
  const map = new Array(text.length).fill(null);

  highlights.forEach((highlight) => {
    const normalizedText = normalizeHighlightText(highlight?.text);
    if (!normalizedText) {
      return;
    }

    const pattern = escapeRegExp(normalizedText).replace(/\s+/g, '\\s+');
    const regex = new RegExp(pattern, 'g');
    let match;

    while ((match = regex.exec(text)) !== null) {
      const endIndex = match.index + match[0].length;
      for (let index = match.index; index < endIndex; index += 1) {
        map[index] = highlight;
      }
    }
  });

  return map;
};

const splitTextWithHighlightMap = (text, highlightMap, startOffset, keyPrefix) => {
  if (!text) {
    return text;
  }

  const segments = [];
  const mathAwareSegments = splitTextIntoMathAwareSegments(text);
  let segmentIndex = 0;
  let offset = startOffset;

  mathAwareSegments.forEach((segment) => {
    if (segment.type === 'math') {
      segments.push(segment.raw);
      offset += segment.display.length;
      return;
    }

    let currentText = '';
    let currentHighlight = highlightMap[offset] || null;

    for (let index = 0; index < segment.raw.length; index += 1) {
      const nextHighlight = highlightMap[offset + index] || null;
      if (nextHighlight !== currentHighlight) {
        if (currentText) {
          segments.push(
            currentHighlight ? (
              <mark
                key={`${keyPrefix}-highlight-${segmentIndex}`}
                className={`summary-highlight summary-highlight-${currentHighlight.color}`}
                data-highlight-text={currentHighlight.text}
                data-highlight-color={currentHighlight.color}
                tabIndex={0}
                role="button"
              >
                {currentText}
              </mark>
            ) : currentText
          );
          segmentIndex += 1;
        }
        currentText = '';
        currentHighlight = nextHighlight;
      }

      currentText += segment.raw[index];
    }

    if (currentText) {
      segments.push(
        currentHighlight ? (
          <mark
            key={`${keyPrefix}-highlight-${segmentIndex}`}
            className={`summary-highlight summary-highlight-${currentHighlight.color}`}
            data-highlight-text={currentHighlight.text}
            data-highlight-color={currentHighlight.color}
            tabIndex={0}
            role="button"
          >
            {currentText}
          </mark>
        ) : currentText
      );
      segmentIndex += 1;
    }

    offset += segment.display.length;
  });

  return segments.length ? segments : text;
};

const applyHighlightMapToNode = (node, highlightMap, state, keyPrefix = 'node') => {
  if (typeof node === 'string') {
    const startOffset = state.offset;
    state.offset += node.replace(MATH_SEGMENT_REGEX, ' ').length;
    return splitTextWithHighlightMap(node, highlightMap, startOffset, keyPrefix);
  }

  if (typeof node === 'number' || node == null) {
    return node;
  }

  if (!React.isValidElement(node)) {
    return node;
  }

  if (isExcludedHighlightNode(node)) {
    state.offset += 1;
    return node;
  }

  const children = React.Children.toArray(node.props.children).flatMap((child, index) => {
    const transformed = applyHighlightMapToNode(child, highlightMap, state, `${keyPrefix}-${index}`);
    return Array.isArray(transformed) ? transformed : [transformed];
  });

  return React.cloneElement(node, { ...node.props, key: node.key ?? keyPrefix }, children);
};

const applyHighlightsToBlockNode = (node, highlights, keyPrefix = 'block') => {
  const flatText = collectHighlightableText(node);
  if (!flatText) {
    return node;
  }

  const highlightMap = buildHighlightMap(flatText, highlights);
  if (!highlightMap.some(Boolean)) {
    return node;
  }

  const state = { offset: 0 };
  const children = React.Children.toArray(node.props.children).flatMap((child, index) => {
    const transformed = applyHighlightMapToNode(child, highlightMap, state, `${keyPrefix}-${index}`);
    return Array.isArray(transformed) ? transformed : [transformed];
  });

  return React.cloneElement(node, { ...node.props, key: node.key ?? keyPrefix }, children);
};

const applyHighlightsRecursively = (node, highlights, keyPrefix = 'node') => {
  if (typeof node === 'string' || typeof node === 'number' || node == null) {
    return node;
  }

  if (!React.isValidElement(node) || isExcludedHighlightNode(node)) {
    return node;
  }

  const tagName = typeof node.type === 'string' ? node.type.toLowerCase() : '';
  if (BLOCK_HIGHLIGHT_TAGS.has(tagName)) {
    return applyHighlightsToBlockNode(node, highlights, keyPrefix);
  }

  const children = React.Children.toArray(node.props.children).flatMap((child, index) => {
    const transformed = applyHighlightsRecursively(child, highlights, `${keyPrefix}-${index}`);
    return Array.isArray(transformed) ? transformed : [transformed];
  });

  return React.cloneElement(node, { ...node.props, key: node.key ?? keyPrefix }, children);
};

const getEngineLabel = (engine) => {
  if (engine === 'ollama') {
    return 'Ollama';
  }
  if (engine === 'gemini') {
    return 'Gemini';
  }
  return engine || 'AI';
};

const PaperDetail = ({ paper: initialPaper, paperId, topicName, onBackToPapers, onTocUpdate }) => {
  const selectedEngine = getSavedConfig().summaryEngine || 'gemini';
  const engineLabel = getEngineLabel(selectedEngine);

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
  const [highlights, setHighlights] = useState([]);
  const [isSavingHighlight, setIsSavingHighlight] = useState(false);
  const [highlightPopover, setHighlightPopover] = useState({
    open: false,
    text: '',
    x: 0,
    y: 0
  });
  const summaryRef = useRef(null);
  const popoverRef = useRef(null);
  const effectivePaperId = paperId || getPaperId(initialPaper);

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
      const translation = await translateText(paper.abstract, selectedEngine);
      setTranslatedAbstract(translation);
      setIsTranslated(true);
    } catch (error) {
      console.error('Translation failed:', error);
      // Optionally, show an error to the user
    } finally {
      setIsTranslating(false);
    }
  };

  const closeHighlightPopover = () => {
    setHighlightPopover((prev) => ({ ...prev, open: false }));
  };

  const clearSelection = () => {
    const selection = window.getSelection?.();
    if (selection && selection.rangeCount > 0) {
      selection.removeAllRanges();
    }
  };

  const openHighlightPopover = (text, rect) => {
    const normalizedText = normalizeHighlightText(text);
    if (!normalizedText || !rect) {
      return;
    }

    setHighlightPopover({
      open: true,
      text: normalizedText,
      x: rect.left + window.scrollX + (rect.width / 2),
      y: rect.bottom + window.scrollY + 8
    });
  };

  const persistHighlights = async (nextHighlights) => {
    setIsSavingHighlight(true);
    try {
      const savedHighlights = await savePaperHighlights(topicName, effectivePaperId, nextHighlights);
      setHighlights(savedHighlights);
      return savedHighlights;
    } catch (error) {
      console.error('Failed to save highlights:', error);
      alert('Failed to save highlight. Please try again.');
      throw error;
    } finally {
      setIsSavingHighlight(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [effectivePaperId]);

  useEffect(() => {
    setPaper(initialPaper);
    setIsEditingCitation(false); // Reset editing state when paper changes
    setIsTranslated(false);
    setTranslatedAbstract('');
    setIsTranslating(false);
    setHighlights([]);
    closeHighlightPopover();
  }, [initialPaper]);

  useEffect(() => {
    if (effectivePaperId && topicName) {
      loadSummary();
    }
  }, [effectivePaperId, topicName]);

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
  }, [summary, highlights, isGeneratingSummary]);

  useEffect(() => {
    if (!highlightPopover.open) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (popoverRef.current?.contains(event.target)) {
        return;
      }

      if (event.target.closest?.('.summary-highlight')) {
        return;
      }

      closeHighlightPopover();
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeHighlightPopover();
        clearSelection();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [highlightPopover.open]);

  const loadSummary = async () => {
    try {
      setLoadingSummary(true);
      setSummaryError(null);
      const summaryData = await getPaperSummary(topicName, effectivePaperId);
      setSummary(summaryData);
      if (summaryData) {
        const highlightData = await getPaperHighlights(topicName, effectivePaperId);
        setHighlights(highlightData);
      } else {
        setHighlights([]);
      }
    } catch (err) {
      setSummaryError('Failed to load summary');
      console.error('Error loading summary:', err);
      setHighlights([]);
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleGenerateSummary = async () => {
    try {
      setIsGeneratingSummary(true);
      setSummaryError(null);
      setHighlights([]);
      closeHighlightPopover();

      const response = await generatePaperSummary(topicName, paper, selectedEngine);

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
      setHighlights([]);
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
      const response = await chatWithPaper(topicName, effectivePaperId, newHistory, selectedEngine);

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
      await deletePaper(topicName, effectivePaperId);
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
      await deletePaperSummary(topicName, effectivePaperId);
      setSummary(null); // Clear the summary from state
      setHighlights([]);
      setSummaryError(null); // Clear any errors
      closeHighlightPopover();
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
      const updatedData = await updateCitationCount(topicName, effectivePaperId, count);
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
      const updatedData = await fetchAndUpdateCitation(topicName, effectivePaperId);
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

  const handleHighlightColorSelect = async (color) => {
    const text = normalizeHighlightText(highlightPopover.text);
    if (!text) {
      return;
    }

    const nextHighlights = [
      ...highlights.filter((highlight) => normalizeHighlightText(highlight.text) !== text),
      { text, color }
    ];

    await persistHighlights(nextHighlights);
    clearSelection();
    closeHighlightPopover();
  };

  const handleHighlightDelete = async () => {
    const text = normalizeHighlightText(highlightPopover.text);
    if (!text) {
      return;
    }

    const nextHighlights = highlights.filter((highlight) => normalizeHighlightText(highlight.text) !== text);
    await persistHighlights(nextHighlights);
    clearSelection();
    closeHighlightPopover();
  };

  const handleSummaryMouseUp = () => {
    if (isGeneratingSummary) {
      return;
    }

    window.setTimeout(() => {
      const selection = window.getSelection?.();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        return;
      }

      const range = selection.getRangeAt(0);
      const container = summaryRef.current;
      const normalizedText = extractHighlightTextFromRange(range);

      if (!container || !normalizedText) {
        clearSelection();
        return;
      }

      if (!container.contains(range.commonAncestorContainer)) {
        return;
      }

      openHighlightPopover(normalizedText, range.getBoundingClientRect());
    }, 0);
  };

  const handleSummaryClick = (event) => {
    const highlightElement = event.target.closest?.('.summary-highlight');
    if (!highlightElement) {
      return;
    }

    event.preventDefault();
    clearSelection();
    openHighlightPopover(
      highlightElement.dataset.highlightText,
      highlightElement.getBoundingClientRect()
    );
  };

  const formatSummary = (summaryText) => {
    if (!summaryText) return null;
    const parsedSummary = parseMarkdownWithMath(summaryText);
    if (!highlights.length) {
      return parsedSummary;
    }

    return parsedSummary.map((node, index) => applyHighlightsRecursively(node, highlights, `summary-${index}`));
  };

  const activeHighlight = findHighlightByText(highlights, highlightPopover.text);
  const summaryRenderKey = buildHighlightRenderKey(effectivePaperId, highlights);

  const arxivIdMatch = paper?.url?.match(/(?:abs|pdf)\/([^/?#]+)(?:\.pdf)?/);
  const arxivId = arxivIdMatch?.[1];
  const paperLinks = arxivId ? [
    { label: 'arxiv', href: `https://arxiv.org/abs/${arxivId}` },
    { label: 'pdf', href: `https://arxiv.org/pdf/${arxivId}` },
    { label: 'ar5iv', href: `https://ar5iv.labs.arxiv.org/html/${arxivId}` },
    { label: 'alphaxiv', href: `https://www.alphaxiv.org/abs/${arxivId}` },
  ] : [
    { label: 'arxiv', href: paper.url },
  ];

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
                <span className="paper-link-list">
                  {paperLinks.map(({ label, href }, index) => (
                    <a
                      key={`${label}-${href}`}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      itemProp={index === 0 ? 'url' : undefined}
                      className="paper-link"
                    >
                      {label}
                    </a>
                  ))}
                  <button
                    onClick={openScholarSearch}
                    className="paper-link paper-link-button"
                    title="Search on Google Scholar"
                    type="button"
                  >
                    scholar
                  </button>
                </span>
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
              <button onClick={handleTranslate} className="translate-button" title={`Translate to Korean with ${engineLabel}`}>
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
                  <main
                    key={`preview-${summaryRenderKey}`}
                    className="formatted-summary"
                    itemProp="description"
                    ref={summaryRef}
                    onMouseUp={handleSummaryMouseUp}
                    onClick={handleSummaryClick}
                  >
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
              <main
                key={`summary-${summaryRenderKey}`}
                className="formatted-summary"
                itemProp="description"
                ref={summaryRef}
                onMouseUp={handleSummaryMouseUp}
                onClick={handleSummaryClick}
              >
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
                title={`Generate summary with ${engineLabel}`}
              >
                {`Generate Summary with ${engineLabel}`}
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
          engineLabel={engineLabel}
        />
      )}
      {highlightPopover.open && (
        <div
          ref={popoverRef}
          className="highlight-popover"
          style={{
            left: `${highlightPopover.x}px`,
            top: `${highlightPopover.y}px`
          }}
        >
          <div className="highlight-popover-title">Highlight</div>
          <div className="highlight-color-grid">
            {HIGHLIGHT_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                className={`highlight-color-button${activeHighlight?.color === color.value ? ' is-active' : ''}`}
                style={{ '--highlight-swatch': color.hex }}
                onClick={() => handleHighlightColorSelect(color.value)}
                disabled={isSavingHighlight}
                aria-label={`Highlight with ${color.name}`}
                title={color.name}
              />
            ))}
          </div>
          {activeHighlight && (
            <button
              type="button"
              className="highlight-delete-button"
              onClick={handleHighlightDelete}
              disabled={isSavingHighlight}
            >
              Delete highlight
            </button>
          )}
        </div>
      )}
    </article>
  );
};

export default PaperDetail;
