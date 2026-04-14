import React from 'react';

export default function StatusIndicator({ agentStatus }) {
  if (!agentStatus) {
    return null;
  }

  return (
    <div className="status-indicator">
      ⏳ Agent is: {agentStatus}
    </div>
  );
}
