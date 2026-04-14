import React, { useState } from 'react';

export default function MessageInput({ onSend, isInputRequired }) {
  const [inputText, setInputText] = useState('');

  const handleSubmit = () => {
    if (!inputText.trim()) return;
    onSend(inputText);
    setInputText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="message-input-container">
      <input
        type="text"
        className={`message-input${isInputRequired ? ' input-required' : ''}`}
        placeholder={isInputRequired ? 'Agent needs more info...' : 'Type a message...'}
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button className="message-send-btn" onClick={handleSubmit}>
        Send
      </button>
    </div>
  );
}
