import { useState, useEffect, useRef } from 'react';
import { parseMarkdownWithMath } from '../utils/markdownRenderer';

const ChatBox = ({ onSendMessage, chatHistory, isLoading, onClearHistory }) => {
  const [message, setMessage] = useState('');
  const chatHistoryRef = useRef(null);

  useEffect(() => {
    // Scroll to the bottom of the chat history when it updates
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [chatHistory, isLoading]);

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

  return (
    <div className="chat-box">
      <div className="chat-header">
        <h4>Chat with Gemini</h4>
        {chatHistory.length > 0 && (
          <button onClick={onClearHistory} className="chat-clear-btn" aria-label="Clear chat history">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
          </button>
        )}
      </div>
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
        <input
          type="text"
          value={message}
          onChange={handleInputChange}
          placeholder="Ask about this paper..."
          disabled={isLoading}
          className="chat-input"
        />
        <button type="submit" disabled={isLoading} className="chat-send-btn" aria-label="Send message">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </form>
    </div>
  );
};

export default ChatBox;
