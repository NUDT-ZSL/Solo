import { useState, useEffect } from 'react';
import { TAGS, CONDITIONS, BookCondition } from '../utils/distance';
import './BookModal.css';

interface BookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: BookFormData) => void;
  initialData?: Partial<BookFormData>;
}

export interface BookFormData {
  title: string;
  author: string;
  tags: string[];
  condition: BookCondition;
  image?: string;
  description?: string;
}

export default function BookModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: BookModalProps) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [condition, setCondition] = useState<BookCondition>('九成新');
  const [image, setImage] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title || '');
      setAuthor(initialData?.author || '');
      setSelectedTags(initialData?.tags || []);
      setCondition(initialData?.condition || '九成新');
      setImage(initialData?.image || '');
      setDescription(initialData?.description || '');
      setErrors({});
    }
  }, [isOpen, initialData]);

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else if (selectedTags.length < 3) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = '请输入书名';
    if (!author.trim()) newErrors.author = '请输入作者';
    if (selectedTags.length === 0) newErrors.tags = '请选择至少一个标签';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      title: title.trim(),
      author: author.trim(),
      tags: selectedTags,
      condition,
      image: image.trim() || undefined,
      description: description.trim() || undefined,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content book-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{initialData ? '编辑图书' : '发布新书'}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>书名 *</label>
            <input
              type="text"
              className={`input ${errors.title ? 'error' : ''}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入书名"
            />
            {errors.title && <span className="error-text">{errors.title}</span>}
          </div>

          <div className="form-group">
            <label>作者 *</label>
            <input
              type="text"
              className={`input ${errors.author ? 'error' : ''}`}
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="请输入作者"
            />
            {errors.author && <span className="error-text">{errors.author}</span>}
          </div>

          <div className="form-group">
            <label>
              标签 * <span className="hint">（最多3个，已选 {selectedTags.length}/3）</span>
            </label>
            <div className="tags-selector">
              {TAGS.map((tag) => {
                const isAtLimit = selectedTags.length >= 3;
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    className={`tag-option ${isSelected ? 'selected' : ''} ${!isSelected && isAtLimit ? 'disabled' : ''}`}
                    onClick={() => handleTagToggle(tag)}
                    disabled={!isSelected && isAtLimit}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
            {errors.tags && <span className="error-text">{errors.tags}</span>}
          </div>

          <div className="form-group">
            <label>成色 *</label>
            <div className="condition-selector">
              {CONDITIONS.map((cond) => (
                <button
                  key={cond}
                  type="button"
                  className={`condition-option ${condition === cond ? 'selected' : ''}`}
                  onClick={() => setCondition(cond)}
                >
                  {cond}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>图片链接（可选）</label>
            <input
              type="url"
              className="input"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="请输入图片URL"
            />
          </div>

          <div className="form-group">
            <label>简介（可选）</label>
            <textarea
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简单描述一下这本书..."
              rows={3}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              {initialData ? '保存' : '发布'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
