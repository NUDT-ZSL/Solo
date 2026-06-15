import { useState, useRef, useEffect } from 'react';
import type { Inspiration, InspirationType, Priority, TagDictionary } from '../types/inspiration';
import { TYPE_LABELS, TYPE_COLORS, PRIORITY_COLORS } from '../types/inspiration';

interface Props {
  onSubmit: (inspiration: Omit<Inspiration, 'id' | 'isFavorite' | 'favoriteCount' | 'createdAt'>) => void;
  tagDictionary: TagDictionary;
}

interface FormErrors {
  title?: string;
  description?: string;
  project?: string;
  type?: string;
  priority?: string;
}

function AddInspiration({ onSubmit, tagDictionary }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [project, setProject] = useState('');
  const [type, setType] = useState<InspirationType | ''>('');
  const [priority, setPriority] = useState<Priority | ''>('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [shakingFields, setShakingFields] = useState<Set<string>>(new Set());
  const tagInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const filteredTagSuggestions = tagDictionary.tags.filter(
    (tag) =>
      tagInput &&
      tag.toLowerCase().includes(tagInput.toLowerCase()) &&
      !tags.includes(tag)
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        tagInputRef.current &&
        !tagInputRef.current.contains(e.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node)
      ) {
        setShowTagSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const triggerShake = (field: string) => {
    setShakingFields((prev) => new Set(prev).add(field));
    setTimeout(() => {
      setShakingFields((prev) => {
        const next = new Set(prev);
        next.delete(field);
        return next;
      });
    }, 300);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!title.trim()) {
      newErrors.title = '请输入灵感标题';
      triggerShake('title');
    }

    if (!description.trim()) {
      newErrors.description = '请输入一句话描述';
      triggerShake('description');
    } else if (description.length > 200) {
      newErrors.description = '描述不能超过200字';
      triggerShake('description');
    }

    if (!project.trim()) {
      newErrors.project = '请输入或选择所属项目';
      triggerShake('project');
    }

    if (!type) {
      newErrors.type = '请选择灵感类型';
      triggerShake('type');
    }

    if (!priority) {
      newErrors.priority = '请选择优先级';
      triggerShake('priority');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      project: project.trim(),
      type: type as InspirationType,
      priority: priority as Priority,
      tags,
    });

    setTitle('');
    setDescription('');
    setProject('');
    setType('');
    setPriority('');
    setTags([]);
    setTagInput('');
    setErrors({});
  };

  const handleAddTag = (tag?: string) => {
    const tagToAdd = (tag || tagInput).trim();
    if (tagToAdd && !tags.includes(tagToAdd)) {
      setTags([...tags, tagToAdd]);
      setTagInput('');
    }
    setShowTagSuggestions(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredTagSuggestions.length > 0 && showTagSuggestions) {
        handleAddTag(filteredTagSuggestions[0]);
      } else {
        handleAddTag();
      }
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      handleRemoveTag(tags[tags.length - 1]);
    }
  };

  const inputClass = (field: string) =>
    `form-input ${errors[field as keyof FormErrors] ? 'error' : ''} ${shakingFields.has(field) ? 'shake' : ''}`;

  return (
    <div className="add-page">
      <div className="form-container">
        <h2 className="form-title">✨ 添加新灵感</h2>
        <p className="form-subtitle">快速记录一闪而过的创意点子</p>

        <form onSubmit={handleSubmit} className="inspiration-form">
          <div className="form-group">
            <label className="form-label">
              灵感标题 <span className="required">*</span>
            </label>
            <input
              type="text"
              className={inputClass('title')}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) {
                  setErrors((prev) => ({ ...prev, title: undefined }));
                }
              }}
              placeholder="给你的灵感起个响亮的名字"
            />
            {errors.title && <p className="error-text">{errors.title}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">
              一句话描述 <span className="required">*</span>
              <span className="char-count">{description.length}/200</span>
            </label>
            <textarea
              className={inputClass('description')}
              value={description}
              onChange={(e) => {
                if (e.target.value.length <= 200) {
                  setDescription(e.target.value);
                  if (errors.description) {
                    setErrors((prev) => ({ ...prev, description: undefined }));
                  }
                }
              }}
              placeholder="用一句话描述这个灵感（最多200字）"
              rows={3}
            />
            {errors.description && <p className="error-text">{errors.description}</p>}
          </div>

          <div className="form-row">
            <div className="form-group half">
              <label className="form-label">
                所属项目 <span className="required">*</span>
              </label>
              <input
                type="text"
                className={inputClass('project')}
                value={project}
                onChange={(e) => {
                  setProject(e.target.value);
                  if (errors.project) {
                    setErrors((prev) => ({ ...prev, project: undefined }));
                  }
                }}
                placeholder="输入或选择项目名"
                list="project-list"
              />
              <datalist id="project-list">
                {tagDictionary.projects.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
              {errors.project && <p className="error-text">{errors.project}</p>}
            </div>

            <div className="form-group half">
              <label className="form-label">
                优先级 <span className="required">*</span>
              </label>
              <select
                className={inputClass('priority')}
                value={priority}
                onChange={(e) => {
                  setPriority(e.target.value as Priority);
                  if (errors.priority) {
                    setErrors((prev) => ({ ...prev, priority: undefined }));
                  }
                }}
              >
                <option value="">选择优先级</option>
                {(['P1', 'P2', 'P3', 'P4'] as Priority[]).map((p) => (
                  <option key={p} value={p}>
                    {p} - {p === 'P1' ? '最高' : p === 'P2' ? '较高' : p === 'P3' ? '中等' : '较低'}
                  </option>
                ))}
              </select>
              {errors.priority && <p className="error-text">{errors.priority}</p>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              灵感类型 <span className="required">*</span>
            </label>
            <div className="type-options">
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`type-option ${type === value ? 'selected' : ''} ${shakingFields.has('type') ? 'shake' : ''}`}
                  style={{
                    borderColor: TYPE_COLORS[value as InspirationType],
                    backgroundColor: type === value ? `${TYPE_COLORS[value as InspirationType]}15` : 'transparent',
                    color: type === value ? TYPE_COLORS[value as InspirationType] : '#2C3E50',
                  }}
                  onClick={() => {
                    setType(value as InspirationType);
                    if (errors.type) {
                      setErrors((prev) => ({ ...prev, type: undefined }));
                    }
                  }}
                >
                  <span
                    className="type-dot"
                    style={{ backgroundColor: TYPE_COLORS[value as InspirationType] }}
                  ></span>
                  {label}
                </button>
              ))}
            </div>
            {errors.type && <p className="error-text">{errors.type}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">标签</label>
            <div className="tags-input-container" ref={tagInputRef}>
              <div className="tags-list">
                {tags.map((tag) => (
                  <span key={tag} className="tag-chip tag-input-tag">
                    #{tag}
                    <button
                      type="button"
                      className="tag-remove-btn"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  className="tag-input-field"
                  value={tagInput}
                  onChange={(e) => {
                    setTagInput(e.target.value);
                    setShowTagSuggestions(true);
                  }}
                  onFocus={() => setShowTagSuggestions(true)}
                  onKeyDown={handleTagKeyDown}
                  placeholder={tags.length === 0 ? '输入标签，按回车添加' : ''}
                />
              </div>

              {showTagSuggestions && filteredTagSuggestions.length > 0 && (
                <div className="tag-suggestions" ref={suggestionsRef}>
                  {filteredTagSuggestions.slice(0, 6).map((tag) => (
                    <div
                      key={tag}
                      className="tag-suggestion-item"
                      onClick={() => handleAddTag(tag)}
                    >
                      <span className="suggestion-hash">#</span>
                      {tag}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p className="form-hint">输入时会自动提示已有标签，按回车添加</p>
          </div>

          <button type="submit" className="submit-btn">
            保存灵感
          </button>
        </form>
      </div>
    </div>
  );
}

export default AddInspiration;
