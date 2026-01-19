import { useState, useEffect, useRef } from 'react';
import { parseMarkdownWithMath } from '../utils/markdownRenderer';
import prompts from '../../prompt.json';
import './ChatBox.css';

const CopyButtons = ({ content, messageContentRefs, index }) => {
  const [activeTooltip, setActiveTooltip] = useState('');

  const showTooltip = (type) => {
    setActiveTooltip(type);
    setTimeout(() => setActiveTooltip(''), 2000);
  };

  const copyAsRichText = () => {
    if (messageContentRefs.current && messageContentRefs.current[index]) {
      console.log("copyAsRichText");
      const html = messageContentRefs.current[index].innerHTML;
      const blob = new Blob([html], { type: 'text/html' });
      const data = new ClipboardItem({ 'text/html': blob });
      navigator.clipboard.write([data]).then(() => showTooltip('rich'));
    }
  };

  const copyAsMarkdown = () => {
    console.log("copyAsMarkdown");
    navigator.clipboard.writeText(content).then(() => showTooltip('md'));
  };

  const copyAsHtml = () => {
    if (messageContentRefs.current && messageContentRefs.current[index]) {
      console.log("copyAsHtml");
      navigator.clipboard.writeText(messageContentRefs.current[index].innerHTML).then(() => showTooltip('html'));
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
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h2v10H7V7zm4 0h2v4h2V7h2v10h-2v-4h-2v4h-2V7z" /></svg>
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
// END: CopyButtons Component

const ChatBox = ({ onSendMessage, chatHistory, isLoading, onClearHistory }) => {
  const [message, setMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  const chatHistoryRef = useRef(null);
  const inputRef = useRef(null);
  const messageContentRefs = useRef({});

  useEffect(() => {
    if (isExpanded && chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [chatHistory, isLoading, isExpanded]);

  const handleInputChange = (e) => {
    setMessage(e.target.value);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handlePromptSelect = (prompt) => {
    setMessage(prompt.value);
    setShowPrompts(false);
    inputRef.current.focus();
  };

  const toggleMaximize = (e) => {
    e.stopPropagation();
    setIsMaximized(!isMaximized);
  };

  return (
    <div
      className={`chat-container ${isExpanded ? 'expanded' : 'collapsed'} ${isMaximized ? 'maximized' : ''}`}
      tabIndex={-1}
    >
      <div className="chat-box">
        <div className="chat-header">
          <div className="chat-header-left">
            {isExpanded && (
              <button
                onClick={toggleMaximize}
                className="chat-maximize-btn"
                aria-label={isMaximized ? 'Minimize chat' : 'Maximize chat'}
              >
                {isMaximized ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                  </svg>
                )}
              </button>
            )}
            <h4>Chat with Gemini</h4>
          </div>
          <div className="chat-controls">
            {chatHistory.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); onClearHistory(); }}
                className="chat-clear-btn"
                aria-label="Clear chat history"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                </svg>
              </button>
            )}
            {!isMaximized && (
              <button
                onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                className="chat-expand-btn"
                aria-label={isExpanded ? 'Collapse chat' : 'Expand chat'}
              >
                {isExpanded ? '▼' : '▲'}
              </button>
            )}
          </div>
        </div>
        {isExpanded && (
          <>
            <div className="chat-history" ref={chatHistoryRef}>
              {chatHistory.map((chat, index) => (
                <div key={index} className={`chat-message-wrapper ${chat.role}`}>
                  <div className="chat-message">
                    <div
                      className="message-content"
                      ref={el => messageContentRefs.current[index] = el}
                    >
                      {chat.role === 'assistant' ? parseMarkdownWithMath(chat.content) : chat.content}
                    </div>
                    {chat.role === 'assistant' && (
                      <CopyButtons
                        content={chat.content}
                        messageContentRefs={messageContentRefs}
                        index={index}
                      />
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="chat-message-wrapper assistant">
                  <div className="chat-message">
                    <div className="message-content loading-dots">
                      <span>.</span><span>.</span><span>.</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <form onSubmit={handleSendMessage} className="chat-input-form">
              <div className="chat-input-container">
                <button
                  type="button"
                  className="prompt-menu-btn"
                  onClick={() => setShowPrompts(!showPrompts)}
                  aria-label="Toggle prompt menu"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
                  </svg>
                </button>
                {showPrompts && (
                  <div className="prompt-menu">
                    {prompts.map((prompt) => (
                      <button
                        key={prompt.id}
                        type="button"
                        className="prompt-item"
                        onClick={() => handlePromptSelect(prompt)}
                      >
                        {prompt.label}
                      </button>
                    ))}
                  </div>
                )}
                <input
                  ref={inputRef}
                  type="text"
                  value={message}
                  onChange={handleInputChange}
                  placeholder="Ask about this paper..."
                  disabled={isLoading}
                  className="chat-input"
                />
              </div>
              <button type="submit" disabled={isLoading} className="chat-send-btn" aria-label="Send message">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatBox;
