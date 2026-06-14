import React, { useState } from 'react';

interface InputPanelProps {
  onParse: (text: string) => void;
  isLoading: boolean;
}

const InputPanel: React.FC<InputPanelProps> = ({ onParse, isLoading }) => {
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState('');

  const handleParse = () => {
    const trimmed = inputText.trim();
    
    if (!trimmed) {
      setError('请输入JavaScript代码或错误堆栈');
      return;
    }

    const hasStackLines = trimmed.includes('\nat ') || trimmed.includes('\n    at ');
    const hasErrorPrefix = /^\w+Error:/.test(trimmed);
    const hasCode = trimmed.includes('function') || trimmed.includes('=>') || trimmed.includes('var ') || trimmed.includes('let ') || trimmed.includes('const ');

    if (!hasStackLines && !hasErrorPrefix && !hasCode) {
      setError('无法识别输入格式。请粘贴包含"at"行的错误堆栈或JavaScript代码。');
      return;
    }

    setError('');
    onParse(inputText);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      handleParse();
    }
  };

  const placeholder = `示例1 - 错误堆栈：
Error: Cannot read property 'name' of undefined
    at getUserInfo (/app/src/user.ts:42:15)
    at processRequest (/app/src/api.ts:128:8)
    at handleRequest (/app/src/server.ts:89:22)

示例2 - JavaScript代码：
function calculateTotal(items) {
  let total = 0;
  for (const item of items) {
    total += item.price * item.quantity;
  }
  return total;
}

提示：按 Ctrl+Enter 快速解析`;

  return (
    <div className="input-section">
      <div className="input-header">
        <span className="input-title">输入区</span>
      </div>
      <textarea
        className="input-textarea"
        value={inputText}
        onChange={(e) => {
          setInputText(e.target.value);
          if (error) setError('');
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        spellCheck={false}
      />
      {error && <div className="error-message">{error}</div>}
      <button
        className="parse-button"
        onClick={handleParse}
        disabled={isLoading}
      >
        {isLoading ? '解析中...' : '解析'}
      </button>
    </div>
  );
};

export default InputPanel;
