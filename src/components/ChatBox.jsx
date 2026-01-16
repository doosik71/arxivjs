import { useState, useEffect, useRef } from 'react';
import { parseMarkdownWithMath } from '../utils/markdownRenderer';
import prompts from '../../prompt.json';

const ChatBox = ({ onSendMessage, chatHistory, isLoading, onClearHistory }) => {
  const [message, setMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  const chatHistoryRef = useRef(null);
  const inputRef = useRef(null);

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
                    <div className="message-content">
                      {chat.role === 'assistant' ? parseMarkdownWithMath(chat.content) : chat.content}
                    </div>
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
