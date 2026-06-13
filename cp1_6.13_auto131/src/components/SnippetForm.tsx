import { useState, KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { SnippetFormData, Language, LANGUAGES, LANGUAGE_COLORS } from '../types';
import CodeEditor from './CodeEditor';

interface SnippetFormProps {
  initialData?: SnippetFormData;
  onSubmit: (data: SnippetFormData) => void;
  onCancel: () => void;
  submitLabel?: string;
}

const snippetFormStyles = `
  .snippet-form {
    display: flex;
    flex-direction: column;
    gap: 24px;
    max-width: 800px;
    margin: 0 auto;
    animation: slideUp 0.3s ease;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .form-label {
    font-size: 14px;
    font-weight: 600;
    color: #e2e8f0;
    letter-spacing: 0.3px;
  }

  .form-input {
    padding: 12px 16px;
    border-radius: 8px;
    background: #1e293b;
    color: #e2e8f0;
    border: 1px solid #334155;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
    font-size: 14px;
  }

  .form-input:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
  }

  .form-input::placeholder {
    color: #475569;
  }

  .form-select {
    padding: 12px 16px;
    border-radius: 8px;
    background: #1e293b;
    color: #e2e8f0;
    border: 1px solid #334155;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
    font-size: 14px;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2394a3b8' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    padding-right: 36px;
    cursor: pointer;
  }

  .form-select:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
  }

  .form-select option {
    background: #1e293b;
    color: #e2e8f0;
  }

  .tag-input-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .tag-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: 20px;
    background: #e2e8f0;
    color: #1e293b;
    font-size: 13px;
    font-weight: 500;
    animation: slideUp 0.2s ease;
  }

  .tag-remove-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #94a3b8;
    color: #ffffff;
    cursor: pointer;
    transition: background 0.15s ease, transform 0.15s ease;
    border: none;
    padding: 0;
    line-height: 1;
  }

  .tag-remove-btn:hover {
    background: #ef4444;
    transform: scale(1.1);
  }

  .tag-remove-btn:active {
    transform: scale(0.9);
  }

  .form-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    padding-top: 12px;
  }

  .form-btn {
    padding: 10px 24px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
    border: none;
  }

  .form-btn:active {
    transform: scale(0.97);
  }

  .form-btn-primary {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: #ffffff;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
  }

  .form-btn-primary:hover {
    box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
  }

  .form-btn-secondary {
    background: #334155;
    color: #e2e8f0;
  }

  .form-btn-secondary:hover {
    background: #475569;
  }
`;

export default function SnippetForm({
  initialData,
  onSubmit,
  onCancel,
  submitLabel = '保存',
}: SnippetFormProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [code, setCode] = useState(initialData?.code || '');
  const [language, setLanguage] = useState<Language>(initialData?.language || 'JavaScript');
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [tagInput, setTagInput] = useState('');

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput('');
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !code.trim()) return;
    onSubmit({
      title: title.trim(),
      code,
      language,
      tags,
    });
  };

  return (
    <>
      <style>{snippetFormStyles}</style>
      <form className="snippet-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">标题</label>
          <input
            className="form-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入代码片段标题..."
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">语言</label>
          <select
            className="form-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">代码内容</label>
          <CodeEditor
            code={code}
            language={language}
            editable
            onChange={setCode}
          />
        </div>

        <div className="form-group">
          <label className="form-label">标签</label>
          <div className="tag-input-container">
            <div className="tag-list">
              {tags.map((tag) => (
                <span key={tag} className="tag-item">
                  {tag}
                  <button
                    type="button"
                    className="tag-remove-btn"
                    onClick={() => removeTag(tag)}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
            <input
              className="form-input"
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="输入标签后按回车添加..."
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="form-btn form-btn-secondary" onClick={onCancel}>
            取消
          </button>
          <button
            type="submit"
            className="form-btn form-btn-primary"
            disabled={!title.trim() || !code.trim()}
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </>
  );
}
