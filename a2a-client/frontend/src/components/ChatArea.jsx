import React from 'react';
import MessageList from './MessageList';
import StatusIndicator from './StatusIndicator';
import MessageInput from './MessageInput';

export default function ChatArea({ messages, agentStatus, isInputRequired, onSendMessage, contextId }) {
  if (!contextId) {
    return (
      <div className="chat-area">
        <div className="chat-area-placeholder">
          <p>Connect to an agent to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-area">
      <MessageList messages={messages} />
      <StatusIndicator agentStatus={agentStatus} />
      <MessageInput onSend={onSendMessage} isInputRequired={isInputRequired} />
    </div>
  );
}
