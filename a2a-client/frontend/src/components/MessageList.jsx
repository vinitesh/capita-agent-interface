import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

export default function MessageList({ messages }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="message-list">
      {messages.map((msg, index) => (
        <div
          key={index}
          className={msg.role === 'user' ? 'message-user' : 'message-agent'}
        >
          {msg.role === 'agent' ? (
            <ReactMarkdown>{msg.text}</ReactMarkdown>
          ) : (
            msg.text
          )}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
