import { useState } from 'react';

export function useChatState() {
  const [agentUrl, setAgentUrl] = useState(null);
  const [contextId, setContextId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [agentStatus, setAgentStatus] = useState(null);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [isInputRequired, setIsInputRequired] = useState(false);
  const [agentCard, setAgentCard] = useState(null);
  const [sessions, setSessions] = useState([]);

  const addMessage = (message) => {
    setMessages((prev) => [...prev, { role: message.role, text: message.text }]);
  };

  const setActiveTask = (taskId, isRequired) => {
    setActiveTaskId(taskId);
    setIsInputRequired(isRequired);
  };

  const resetInputRequired = () => {
    setIsInputRequired(false);
  };

  const restoreSession = (session) => {
    setAgentUrl(session.agentUrl);
    setContextId(session.contextId);
    setMessages(session.messages || []);
    setActiveTaskId(session.activeTaskId || null);
    setIsInputRequired(session.isInputRequired || false);
    setAgentCard(session.agentCard || null);
  };

  return {
    agentUrl,
    contextId,
    messages,
    agentStatus,
    activeTaskId,
    isInputRequired,
    agentCard,
    sessions,
    setAgentUrl,
    setContextId,
    addMessage,
    setAgentStatus,
    setActiveTask,
    resetInputRequired,
    restoreSession,
    setSessions,
    setAgentCard,
  };
}
