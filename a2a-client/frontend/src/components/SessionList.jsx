import React, { useState } from 'react';

const DEFAULT_VISIBLE = 5;

function formatDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleString();
}

function truncate(text, maxLength = 50) {
  if (!text) return '';
  return text.length > maxLength ? text.slice(0, maxLength) + '…' : text;
}

export default function SessionList({ sessions, onSessionSelect }) {
  const [showAll, setShowAll] = useState(false);

  if (!sessions || sessions.length === 0) {
    return (
      <div className="session-list">
        <h4 className="session-list-title">Sessions</h4>
        <p className="session-list-empty">No previous sessions</p>
      </div>
    );
  }

  const visible = showAll ? sessions : sessions.slice(0, DEFAULT_VISIBLE);
  const hasMore = sessions.length > DEFAULT_VISIBLE;

  return (
    <div className="session-list">
      <h4 className="session-list-title">Sessions</h4>
      <ul className="session-list-items">
        {visible.map((session) => (
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
      {hasMore && (
        <button
          className="session-list-toggle"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? 'Show less' : `View all (${sessions.length})`}
        </button>
      )}
    </div>
  );
}
