import React, { useState } from 'react';

export type Difficulty = 'easy' | 'normal' | 'hard';

interface DifficultySelectProps {
  nickname: string;
  onStart: (difficulty: Difficulty) => void;
  onChangeNickname: () => void;
}

const difficultyInfo: Record<Difficulty, { label: string; desc: string }> = {
  easy: { label: '简单', desc: '节奏较慢，适合新手练习' },
  normal: { label: '普通', desc: '标准节奏，挑战你的反应' },
  hard: { label: '困难', desc: '高速节奏，考验极限操作' },
};

const DifficultySelect: React.FC<DifficultySelectProps> = ({
  nickname,
  onStart,
  onChangeNickname,
}) => {
  const [selected, setSelected] = useState<Difficulty | null>(null);

  const difficulties: Difficulty[] = ['easy', 'normal', 'hard'];

  return (
    <div className="difficulty-container">
      <div className="welcome-nickname">
        欢迎，<span>{nickname}</span>
        <button className="change-nickname-link" onClick={onChangeNickname}>
          更换昵称
        </button>
      </div>
      <div className="difficulty-title">选择难度</div>
      <div className="difficulty-buttons">
        {difficulties.map((diff) => (
          <button
            key={diff}
            className={`difficulty-btn ${selected === diff ? 'selected' : ''}`}
            onClick={() => setSelected(diff)}
          >
            {difficultyInfo[diff].label}
          </button>
        ))}
      </div>
      <div className="difficulty-desc">
        {selected ? difficultyInfo[selected].desc : '点击选择游戏难度'}
      </div>
      <button
        className="start-game-btn"
        onClick={() => selected && onStart(selected)}
        disabled={!selected}
      >
        开始游戏
      </button>
    </div>
  );
};

export default DifficultySelect;
