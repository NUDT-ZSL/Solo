import { useState } from 'react';
import { parseDescription } from '../utils/parser';
import { OutfitState, ParseResult } from '../types';

interface DescriptionPanelProps {
  description: string;
  onDescriptionChange: (text: string) => void;
  onParse: (result: ParseResult) => void;
  outfit: OutfitState;
}

export default function DescriptionPanel({
  description,
  onDescriptionChange,
  onParse,
}: DescriptionPanelProps) {
  const [lastMessage, setLastMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  const handleParse = () => {
    const result = parseDescription(description);
    setLastMessage(result.message);
    setMessageType(result.success ? 'success' : 'error');
    onParse(result);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleParse();
    }
  };

  return (
    <div className="description-panel">
      <div className="description-input-row">
        <input
          type="text"
          className="description-input"
          placeholder="输入描述，例如：金色长发、蓝色连衣裙、白色高跟鞋"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="parse-btn" onClick={handleParse}>解析</button>
      </div>
      {lastMessage && (
        <div className={`parse-message ${messageType}`}>
          {lastMessage}
        </div>
      )}
    </div>
  );
}
