import { useState, useCallback } from 'react';
import { apiService } from '../services/api';

export const useAnythingLLM = (projectId) => {
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);

  const sendMessage = useCallback(async (content, options = {}) => {
    if (!projectId) {
      setError('No project selected');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Add user message immediately for better UX
      const userMessage = {
        role: 'user',
        content,
        timestamp: Date.now()
      };
      setMessages((prev) => [...prev, userMessage]);

      // Send to backend
      const response = await apiService.chat.send(
        projectId,
        content,
        options.context || 'relevant',
        options.mode || 'chat'
      );

      // Add assistant message
      const assistantMessage = {
        role: 'assistant',
        content: response.data.message,
        generatedFiles: response.data.generatedFiles || [],
        thinking: response.data.thinking,
        timestamp: Date.now()
      };

      setMessages((prev) => [...prev, assistantMessage]);

      return assistantMessage;

    } catch (err) {
      console.error('Error sending message:', err);
      setError(err.message || 'Failed to send message');
      
      // Remove user message on error
      setMessages((prev) => prev.slice(0, -1));
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const loadHistory = useCallback(async () => {
    if (!projectId) return;

    try {
      const response = await apiService.chat.history(projectId);
      
      const formattedMessages = response.data.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        generatedFiles: msg.metadata?.files || [],
        timestamp: new Date(msg.created_at).getTime()
      }));

      setMessages(formattedMessages);

    } catch (err) {
      console.error('Error loading history:', err);
      setError('Failed to load chat history');
    }
  }, [projectId]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    sendMessage,
    loadHistory,
    clearMessages,
    isLoading,
    error
  };
};
