import React from 'react';

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString();
}

function truncate(text, maxLength = 50) {
  if (!text) return '';
  return text.length > maxLength ? text.slice(0, maxLength) + '…' : text;
}

export default function SessionList({ sessions, onSessionSelect }) {
  if (!sessions || sessions.length === 0) {
    return (
      <div className="session-list">
        <h4 className="session-list-title">Sessions</h4>
        <p className="session-list-empty">No previous sessions</p>
      </div>
    );
  }

  return (
    <div className="session-list">
      <h4 className="session-list-title">Sessions</h4>
      <ul className="session-list-items">
        {sessions.map((session) => (
          <li
            key={session.contextId}
            className="session-list-item"
            onClick={() => onSessionSelect(session.contextId)}
          >
            <span className="session-agent-name">{session.agentName || 'Unknown Agent'}</span>
            <span className="session-updated">{formatDate(session.updatedAt)}</span>
            <span className="session-preview">{truncate(session.lastMessage)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
