import React, { useState } from 'react';
import SessionList from './SessionList';
import AgentList from './AgentList';

const STORAGE_KEY = 'a2a-agent-url';

export default function Sidebar({ agentCard, onConnect, onNewChat, onSessionSelect, sessions, agents, error }) {
  const [urlInput, setUrlInput] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || '';
  });
  const [showAgentList, setShowAgentList] = useState(false);

  const handleConnect = () => {
    if (urlInput.trim()) {
      localStorage.setItem(STORAGE_KEY, urlInput.trim());
      onConnect(urlInput.trim());
      setShowAgentList(false);
    }
  };

  const handleAgentSelect = (agentUrl) => {
    setUrlInput(agentUrl);
    localStorage.setItem(STORAGE_KEY, agentUrl);
    onConnect(agentUrl);
    setShowAgentList(false);
  };

  return (
    <div className="sidebar">
      <h2 className="sidebar-title">A2A Chat</h2>

      <div className="sidebar-connect">
        <input
          type="text"
          className="sidebar-url-input"
          placeholder="Agent Base URL"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
        />
        <button className="sidebar-connect-btn" onClick={handleConnect}>
          Connect
        </button>
      </div>

      {error && <p className="sidebar-error">{error}</p>}

      {agentCard && (
        <div className="sidebar-agent-info">
          <div className="sidebar-agent-header">
            <h3 className="sidebar-agent-name">{agentCard.name}</h3>
            <div className="sidebar-agent-actions">
              <button className="sidebar-new-chat-btn" onClick={onNewChat}>
                + New Chat
              </button>
              <button
                className="sidebar-switch-agent-btn"
                onClick={() => setShowAgentList(!showAgentList)}
              >
                {showAgentList ? 'Hide Agents' : 'Switch Agent'}
              </button>
            </div>
          </div>
          {agentCard.description && (
            <p className="sidebar-agent-desc">{agentCard.description}</p>
          )}
          {agentCard.skills && agentCard.skills.length > 0 && (
            <ul className="sidebar-agent-skills">
              {agentCard.skills.map((skill, index) => (
                <li key={index}>{skill.name || skill}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {(showAgentList || !agentCard) && (
        <AgentList agents={agents} onAgentSelect={handleAgentSelect} />
      )}

      <SessionList sessions={sessions} onSessionSelect={onSessionSelect} />
    </div>
  );
}
