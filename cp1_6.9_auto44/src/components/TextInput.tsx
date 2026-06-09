import { ChangeEvent } from 'react';

export interface TextInputProps {
  value: string;
  fontFamily: string;
  onTextChange: (text: string) => void;
  onFontChange: (font: string) => void;
}

const FONT_OPTIONS: { label: string; value: string; stack: string }[] = [
  { label: '思源黑体', value: '"Source Han Sans SC", "Noto Sans SC", sans-serif', stack: 'sans-serif' },
  { label: '思源宋体', value: '"Source Han Serif SC", "Noto Serif SC", serif', stack: 'serif' },
  { label: '微软雅黑', value: '"Microsoft YaHei", "PingFang SC", sans-serif', stack: 'sans-serif' },
  { label: '楷体', value: '"KaiTi", "STKaiti", serif', stack: 'serif' },
  { label: '黑体', value: '"SimHei", "Heiti SC", sans-serif', stack: 'sans-serif' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif', stack: 'sans-serif' },
  { label: 'Georgia', value: 'Georgia, "Times New Roman", serif', stack: 'serif' },
  { label: 'Impact', value: 'Impact, Haettenschweiler, sans-serif', stack: 'sans-serif' }
];

const MAX_LENGTH = 50;

export default function TextInput({ value, fontFamily, onTextChange, onFontChange }: TextInputProps) {
  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value.slice(0, MAX_LENGTH);
    onTextChange(v);
  };

  return (
    <div className="control-section">
      <div className="section-header">
        <span className="section-title">文本内容</span>
        <span className={`char-count ${value.length >= MAX_LENGTH ? 'warning' : ''}`}>
          {value.length}/{MAX_LENGTH}
        </span>
      </div>
      <textarea
        className="text-input"
        value={value}
        onChange={handleTextChange}
        placeholder="输入中英文短句，最多50字符..."
        rows={3}
        maxLength={MAX_LENGTH}
      />
      <div className="section-header margin-top">
        <span className="section-title">字体选择</span>
      </div>
      <div className="select-wrapper">
        <select
          className="font-select"
          value={fontFamily}
          onChange={(e) => onFontChange(e.target.value)}
        >
          {FONT_OPTIONS.map(f => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <div className="select-arrow">▾</div>
      </div>
      <div className="font-preview" style={{ fontFamily }}>
        {value || '字体预览文字'}
      </div>
    </div>
  );
}
