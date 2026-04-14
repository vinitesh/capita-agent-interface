import React, { useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useChatState } from './hooks/useChatState';
import { useSocket } from './hooks/useSocket';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import LoginPage from './components/LoginPage';
import * as api from './services/api';
import './App.css';

function AppContent() {
  const { user, isLoading, isAuthenticated, isAdmin, logout } = useAuth();

  const {
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
  } = useChatState();

  const { connect, disconnect } = useSocket();
  const [error, setError] = React.useState(null);
  const [agents, setAgents] = React.useState([]);

  const contextIdRef = useRef(contextId);
  const activeTaskIdRef = useRef(activeTaskId);
  const agentUrlRef = useRef(agentUrl);
  const agentCardRef = useRef(agentCard);
  // webhookContextId is our local Socket.io room ID — stays fixed for the whole chat session
  const webhookContextIdRef = useRef(null);

  useEffect(() => { contextIdRef.current = contextId; }, [contextId]);
  useEffect(() => { activeTaskIdRef.current = activeTaskId; }, [activeTaskId]);
  useEffect(() => { agentUrlRef.current = agentUrl; }, [agentUrl]);
  useEffect(() => { agentCardRef.current = agentCard; }, [agentCard]);

  const onProgressUpdate = (data) => {
    setAgentStatus(data.status);
  };

  const handleConnect = async (urlInput) => {
    try {
      setError(null);
      const card = await api.discoverAgent(urlInput);
      setAgentCard(card);
      setAgentUrl(card.url || urlInput);
      const newContextId = uuidv4();
      setContextId(newContextId);
      contextIdRef.current = newContextId;
      webhookContextIdRef.current = newContextId; // fixed for this chat session
      connect(newContextId, onProgressUpdate);
      const sessionList = await api.listSessions();
      setSessions(sessionList);
      api.listAgents().then(setAgents).catch(() => {});
    } catch (err) {
      setError(err.message || 'Failed to connect to agent');
    }
  };

  const handleSendMessage = async (text) => {
    addMessage({ role: 'user', text });
    resetInputRequired();
    try {
      const result = await api.sendMessage({
        agentUrl: agentUrlRef.current,
        contextId: contextIdRef.current,
        userText: text,
        taskId: activeTaskIdRef.current,
        agentName: agentCardRef.current?.name || agentCard?.name || 'Unknown Agent',
        webhookContextId: webhookContextIdRef.current,
      });
      addMessage({ role: 'agent', text: result.text });
      setAgentStatus(null);

      if (result.contextId && result.contextId !== contextIdRef.current) {
        setContextId(result.contextId);
        contextIdRef.current = result.contextId;
      }

      if (result.state === 'input-required') {
        setActiveTask(result.taskId, true);
        activeTaskIdRef.current = result.taskId;
      } else if (result.state === 'completed') {
        setActiveTask(null, false);
        activeTaskIdRef.current = null;
      }
    } catch (err) {
      addMessage({ role: 'agent', text: `Error: ${err.message}` });
    }
  };

  const handleSessionSelect = async (selectedContextId) => {
    try {
      const session = await api.getSession(selectedContextId);
      restoreSession(session);
      disconnect();
      connect(session.contextId, onProgressUpdate);
      contextIdRef.current = session.contextId;
      webhookContextIdRef.current = session.contextId; // restored session uses its own contextId as webhook key
      activeTaskIdRef.current = session.activeTaskId || null;
      const card = await api.discoverAgent(session.agentUrl);
      setAgentCard(card);
      agentUrlRef.current = session.agentUrl;
    } catch (err) {
      setError(err.message || 'Failed to load session');
    }
  };

  const handleNewChat = () => {
    disconnect();
    const newContextId = uuidv4();
    setContextId(newContextId);
    contextIdRef.current = newContextId;
    webhookContextIdRef.current = newContextId; // new fixed webhook context for this chat
    setActiveTask(null, false);
    activeTaskIdRef.current = null;
    setAgentStatus(null);
    restoreSession({
      agentUrl: agentUrlRef.current,
      contextId: newContextId,
      messages: [],
      activeTaskId: null,
      isInputRequired: false,
    });
    connect(newContextId, onProgressUpdate);
    api.listSessions().then(setSessions).catch(() => {});
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    api.listSessions()
      .then((sessionList) => setSessions(sessionList))
      .catch(() => {});
    api.listAgents()
      .then((agentList) => setAgents(agentList))
      .catch(() => {});
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="app-loading">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="app-container">
      <Sidebar
        agentCard={agentCard}
        onConnect={handleConnect}
        onNewChat={handleNewChat}
        onSessionSelect={handleSessionSelect}
        sessions={sessions}
        agents={agents}
        error={error}
        user={user}
        onLogout={logout}
        isAdmin={isAdmin}
      />
      <ChatArea
        messages={messages}
        agentStatus={agentStatus}
        isInputRequired={isInputRequired}
        onSendMessage={handleSendMessage}
        contextId={contextId}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
