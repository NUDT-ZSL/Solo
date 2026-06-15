import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import useStore from '../store';
import { createSnippet } from '../utils/http';

const LANGUAGES = ['JavaScript', 'TypeScript', 'Python', 'Go', 'Rust', 'Java', 'Cpp', 'CSS', 'HTML', 'SQL'];

export default function UploadModal() {
  const showUploadModal = useStore((s) => s.showUploadModal);
  const setShowUploadModal = useStore((s) => s.setShowUploadModal);
  const allTags = useStore((s) => s.allTags);
  const fetchSnippets = useStore((s) => s.fetchSnippets);

  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('JavaScript');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (showUploadModal) {
      setCode('');
      setLanguage('JavaScript');
      setSelectedTags([]);
      setTagInput('');
    }
  }, [showUploadModal]);

  if (!showUploadModal) return null;

  const filteredSuggestions = allTags.filter(
    (t) =>
      t.toLowerCase().includes(tagInput.toLowerCase()) &&
      !selectedTags.includes(t)
  );

  const handleToggleSuggestion = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
    setTagInput('');
  };

  const handleAddCustomTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !selectedTags.includes(trimmed)) {
      setSelectedTags((prev) => [...prev, trimmed]);
      setTagInput('');
    }
  };

  const handleSubmit = async () => {
    if (!code.trim() || selectedTags.length === 0) return;
    setSubmitting(true);
    try {
      const res = await createSnippet({
        code: code.trim(),
        language,
        tags: selectedTags,
      });
      if (res.success) {
        setShowUploadModal(false);
        fetchSnippets();
      }
    } catch (error) {
      console.error('Failed to create snippet:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">上传代码片段</span>
          <button className="modal-close" onClick={() => setShowUploadModal(false)}>
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">
          <textarea
            className="upload-code-area"
            placeholder="粘贴你的代码..."
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <div className="upload-field">
            <label>编程语言</label>
            <select
              className="upload-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>
          <div className="upload-field">
            <label>标签</label>
            <input
              className="upload-tags-input"
              type="text"
              placeholder="输入标签后按回车添加..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (filteredSuggestions.length > 0) {
                    handleToggleSuggestion(filteredSuggestions[0]);
                  } else {
                    handleAddCustomTag();
                  }
                }
              }}
            />
            <div className="upload-tags-suggestions">
              {selectedTags.map((tag) => (
                <button
                  key={tag}
                  className="upload-tag-suggestion selected"
                  onClick={() => handleToggleSuggestion(tag)}
                >
                  {tag}
                </button>
              ))}
              {filteredSuggestions.slice(0, 8).map((tag) => (
                <button
                  key={tag}
                  className="upload-tag-suggestion"
                  onClick={() => handleToggleSuggestion(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <button
            className="upload-submit-btn"
            onClick={handleSubmit}
            disabled={!code.trim() || selectedTags.length === 0 || submitting}
          >
            {submitting ? '提交中...' : '提交代码片段'}
          </button>
        </div>
      </div>
    </div>
  );
}
