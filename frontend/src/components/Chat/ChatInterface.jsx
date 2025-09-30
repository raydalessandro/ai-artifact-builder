import React, { useState, useRef, useEffect } from 'react';
import { useAnythingLLM } from '../../hooks/useAnythingLLM';
import { Send, Loader2, AlertCircle } from 'lucide-react';
import './ChatInterface.css';

export const ChatInterface = ({ projectId, onFilesGenerated }) => {
  const { messages, sendMessage, isLoading, error } = useAnythingLLM(projectId);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue;
    setInputValue('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const response = await sendMessage(userMessage, {
        context: 'relevant',
        mode: 'chat'
      });

      // Notify parent if files were generated
      if (response && response.generatedFiles && response.generatedFiles.length > 0) {
        onFilesGenerated?.(response.generatedFiles);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  };

  const suggestedPrompts = [
    "Create a React component with form validation",
    "Add authentication to the backend API",
    "Implement a responsive navigation bar",
    "Create unit tests for existing components",
    "Refactor code following best practices"
  ];

  return (
    <div className="chat-interface">
      {/* Header */}
      <div className="chat-header">
        <h2>AI Assistant</h2>
        <div className="chat-status">
          <span className="status-dot"></span>
          <span>Claude Sonnet 4.5 + RAG</span>
        </div>
      </div>

      {/* Messages */}
      <div className="messages-container">
        {messages.length === 0 && (
          <div className="empty-state">
            <h3>👋 Hi! I'm your AI coding assistant</h3>
            <p>Ask me to create components, write code, or help with your project.</p>
            
            <div className="suggested-prompts">
              <p className="prompts-title">Try these:</p>
              {suggestedPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputValue(prompt)}
                  className="prompt-suggestion"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, idx) => (
          <div key={idx} className={`message ${message.role}`}>
            <div className="message-avatar">
              {message.role === 'user' ? '👤' : '🤖'}
            </div>
            <div className="message-content">
              <div className="message-text">
                {message.content}
              </div>
              
              {message.generatedFiles && message.generatedFiles.length > 0 && (
                <div className="generated-files">
                  <p className="files-title">📁 Generated Files:</p>
                  <ul>
                    {message.generatedFiles.map((file, i) => (
                      <li key={i}>
                        <code>{file.path}</code>
                        <span className="file-language">{file.language}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message assistant">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <div className="loading-indicator">
                <Loader2 className="spin" size={16} />
                <span>Thinking...</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="error-message">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input-container">
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything about your project..."
          disabled={isLoading || !projectId}
          rows={1}
        />
        <button
          onClick={handleSend}
          disabled={!inputValue.trim() || isLoading || !projectId}
          className="send-button"
        >
          {isLoading ? (
            <Loader2 className="spin" size={20} />
          ) : (
            <Send size={20} />
          )}
        </button>
      </div>
    </div>
  );
};
