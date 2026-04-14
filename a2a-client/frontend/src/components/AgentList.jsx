import React from 'react';

function formatDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString();
}

export default function AgentList({ agents, onAgentSelect }) {
  if (!agents || agents.length === 0) {
    return null;
  }

  return (
    <div className="agent-list">
      <h4 className="agent-list-title">Recent Agents</h4>
      <ul className="agent-list-items">
        {agents.map((agent) => (
          <li
            key={agent.agentUrl}
            className="agent-list-item"
            onClick={() => onAgentSelect(agent.agentUrl)}
          >
            <span className="agent-list-name">{agent.agentName}</span>
            <span className="agent-list-date">{formatDate(agent.lastConnected)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
