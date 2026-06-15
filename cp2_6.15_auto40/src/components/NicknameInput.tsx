import React, { useState } from 'react';

interface NicknameInputProps {
  onSubmit: (nickname: string) => void;
}

const NicknameInput: React.FC<NicknameInputProps> = ({ onSubmit }) => {
  const [nickname, setNickname] = useState('');

  const handleSubmit = () => {
    const trimmed = nickname.trim();
    if (trimmed) {
      onSubmit(trimmed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="nickname-container">
      <div className="nickname-title">请输入你的昵称</div>
      <input
        type="text"
        className="nickname-input"
        placeholder="输入昵称..."
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        onKeyDown={handleKeyDown}
        maxLength={12}
      />
      <button
        className="submit-btn"
        onClick={handleSubmit}
        disabled={!nickname.trim()}
      >
        确认
      </button>
    </div>
  );
};

export default NicknameInput;
