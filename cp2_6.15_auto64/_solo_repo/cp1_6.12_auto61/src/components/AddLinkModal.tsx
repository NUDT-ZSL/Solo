import React, { useState, useEffect, useRef } from 'react';
import { Category } from '../data/sampleData';

interface AddLinkModalProps {
  isOpen: boolean;
  categories: Category[];
  defaultCategoryId?: string;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    url: string;
    description: string;
    categoryId: string;
    tags: string[];
  }) => void;
  onAddCategory: (name: string) => Category;
}

const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const AddLinkModal: React.FC<AddLinkModalProps> = ({
  isOpen,
  categories,
  defaultCategoryId,
  onClose,
  onSubmit,
  onAddCategory,
}) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(defaultCategoryId || categories[0]?.id || '');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ title?: boolean; url?: boolean; category?: boolean }>({});
  const [shakeField, setShakeField] = useState<string | null>(null);
  const [animationState, setAnimationState] = useState<'closed' | 'opening' | 'open' | 'closing'>('closed');
  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setAnimationState('opening');
      setTitle('');
      setUrl('');
      setDescription('');
      setCategoryId(defaultCategoryId || (categories.find(c => c.id !== 'all')?.id) || '');
      setNewCategoryName('');
      setShowNewCategory(false);
      setTagInput('');
      setTags([]);
      setErrors({});
      setShakeField(null);
      const timer = setTimeout(() => {
        setAnimationState('open');
        firstInputRef.current?.focus();
      }, 20);
      return () => clearTimeout(timer);
    } else {
      if (animationState === 'open' || animationState === 'opening') {
        setAnimationState('closing');
        const timer = setTimeout(() => setAnimationState('closed'), 250);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && defaultCategoryId) {
      setCategoryId(defaultCategoryId);
    }
  }, [defaultCategoryId, isOpen]);

  const handleClose = () => {
    onClose();
  };

  const triggerShake = (field: string) => {
    setShakeField(field);
    setTimeout(() => setShakeField(null), 500);
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      triggerShake('newCategory');
      return;
    }
    const newCategory = onAddCategory(trimmed);
    setCategoryId(newCategory.id);
    setNewCategoryName('');
    setShowNewCategory(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};

    if (!title.trim()) {
      newErrors.title = true;
      triggerShake('title');
    }

    let validUrl = url.trim();
    if (!validUrl) {
      newErrors.url = true;
      triggerShake('url');
    } else {
      if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
        validUrl = 'https://' + validUrl;
      }
      if (!isValidUrl(validUrl)) {
        newErrors.url = true;
        triggerShake('url');
        setErrors(newErrors);
        return;
      }
    }

    const finalCategoryId = showNewCategory
      ? (() => {
          const trimmed = newCategoryName.trim();
          if (!trimmed) {
            setErrors(prev => ({ ...prev, category: true }));
            triggerShake('newCategory');
            return '';
          }
          const newCategory = onAddCategory(trimmed);
          return newCategory.id;
        })()
      : categoryId;

    if (!finalCategoryId) {
      newErrors.category = true;
      return;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      title: title.trim(),
      url: validUrl,
      description: description.trim(),
      categoryId: finalCategoryId,
      tags,
    });
  };

  if (animationState === 'closed' && !isOpen) return null;

  const isVisible = animationState === 'opening' || animationState === 'open';
  const isClosing = animationState === 'closing';

  return (
    <div
      onClick={handleClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isVisible && !isClosing
          ? 'rgba(0, 0, 0, 0.45)'
          : 'rgba(0, 0, 0, 0)',
        backdropFilter: isVisible && !isClosing ? 'blur(2px)' : 'blur(0px)',
        transition: 'background 250ms cubic-bezier(0.4, 0, 0.2, 1), backdrop-filter 250ms cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: isClosing ? 'none' : 'auto',
        padding: '20px',
      }}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '480px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)',
          transform: isVisible && !isClosing
            ? 'translateY(0) scale(1)'
            : 'translateY(20px) scale(0.96)',
          opacity: isVisible && !isClosing ? 1 : 0,
          transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1), opacity 250ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid #F0F0F0',
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#1A237E',
          }}>
            添加新链接
          </h2>
          <button
            onClick={handleClose}
            style={{
              width: '32px',
              height: '32px',
              border: 'none',
              background: '#F5F5F5',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
              color: '#666',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#E8EAF6';
              (e.currentTarget as HTMLButtonElement).style.color = '#1A237E';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#F5F5F5';
              (e.currentTarget as HTMLButtonElement).style.color = '#666';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <div style={{ marginBottom: '18px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: '#333',
              marginBottom: '6px',
            }}>
              网站标题 *
            </label>
            <input
              ref={firstInputRef}
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors(prev => ({ ...prev, title: false }));
              }}
              placeholder="例如：React 官方文档"
              className={shakeField === 'title' ? 'shake' : ''}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '14px',
                border: `1.5px solid ${errors.title ? '#e53935' : '#E0E0E0'}`,
                borderRadius: '8px',
                outline: 'none',
                transition: 'border-color 200ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                background: '#fff',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                ...(errors.title && shakeField === 'title' ? { borderBottomColor: '#e53935' } : {}),
              }}
              onFocus={(e) => {
                if (errors.title) {
                  (e.currentTarget as HTMLInputElement).style.borderColor = '#e53935';
                  (e.currentTarget as HTMLInputElement).style.boxShadow = '0 0 0 3px rgba(229, 57, 53, 0.1)';
                } else {
                  (e.currentTarget as HTMLInputElement).style.borderColor = '#1A237E';
                  (e.currentTarget as HTMLInputElement).style.boxShadow = '0 0 0 3px rgba(26, 35, 126, 0.08)';
                }
              }}
              onBlur={(e) => {
                if (errors.title) {
                  (e.currentTarget as HTMLInputElement).style.borderColor = '#e53935';
                  (e.currentTarget as HTMLInputElement).style.boxShadow = 'none';
                } else {
                  (e.currentTarget as HTMLInputElement).style.borderColor = '#E0E0E0';
                  (e.currentTarget as HTMLInputElement).style.boxShadow = 'none';
                }
              }}
            />
            {errors.title && (
              <div style={{
                fontSize: '12px',
                color: '#e53935',
                marginTop: '4px',
              }}>请输入网站标题</div>
            )}
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: '#333',
              marginBottom: '6px',
            }}>
              网址 URL *
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (errors.url) setErrors(prev => ({ ...prev, url: false }));
              }}
              placeholder="https://example.com"
              className={shakeField === 'url' ? 'shake' : ''}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '14px',
                border: `1.5px solid ${errors.url ? '#e53935' : '#E0E0E0'}`,
                borderRadius: '8px',
                outline: 'none',
                transition: 'border-color 200ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                background: '#fff',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                if (errors.url) {
                  (e.currentTarget as HTMLInputElement).style.borderColor = '#e53935';
                  (e.currentTarget as HTMLInputElement).style.boxShadow = '0 0 0 3px rgba(229, 57, 53, 0.1)';
                } else {
                  (e.currentTarget as HTMLInputElement).style.borderColor = '#1A237E';
                  (e.currentTarget as HTMLInputElement).style.boxShadow = '0 0 0 3px rgba(26, 35, 126, 0.08)';
                }
              }}
              onBlur={(e) => {
                if (errors.url) {
                  (e.currentTarget as HTMLInputElement).style.borderColor = '#e53935';
                  (e.currentTarget as HTMLInputElement).style.boxShadow = 'none';
                } else {
                  (e.currentTarget as HTMLInputElement).style.borderColor = '#E0E0E0';
                  (e.currentTarget as HTMLInputElement).style.boxShadow = 'none';
                }
              }}
            />
            {errors.url && (
              <div style={{
                fontSize: '12px',
                color: '#e53935',
                marginTop: '4px',
              }}>请输入有效的网址</div>
            )}
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: '#333',
              marginBottom: '6px',
            }}>
              简介描述（可选）
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="一句话描述这个网站"
              rows={2}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '14px',
                border: '1.5px solid #E0E0E0',
                borderRadius: '8px',
                outline: 'none',
                transition: 'border-color 200ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                resize: 'none',
                background: '#fff',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                (e.currentTarget as HTMLTextAreaElement).style.borderColor = '#1A237E';
                (e.currentTarget as HTMLTextAreaElement).style.boxShadow = '0 0 0 3px rgba(26, 35, 126, 0.08)';
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLTextAreaElement).style.borderColor = '#E0E0E0';
                (e.currentTarget as HTMLTextAreaElement).style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: '#333',
              marginBottom: '6px',
            }}>
              分类 *
            </label>
            {!showNewCategory ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    if (errors.category) setErrors(prev => ({ ...prev, category: false }));
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    fontSize: '14px',
                    border: `1.5px solid ${errors.category ? '#e53935' : '#E0E0E0'}`,
                    borderRadius: '8px',
                    outline: 'none',
                    background: '#fff',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'border-color 200ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  onFocus={(e) => {
                    if (!errors.category) {
                      (e.currentTarget as HTMLSelectElement).style.borderColor = '#1A237E';
                      (e.currentTarget as HTMLSelectElement).style.boxShadow = '0 0 0 3px rgba(26, 35, 126, 0.08)';
                    }
                  }}
                  onBlur={(e) => {
                    if (!errors.category) {
                      (e.currentTarget as HTMLSelectElement).style.borderColor = '#E0E0E0';
                      (e.currentTarget as HTMLSelectElement).style.boxShadow = 'none';
                    }
                  }}
                >
                  {categories.filter(c => c.id !== 'all').map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewCategory(true)}
                  style={{
                    padding: '0 14px',
                    border: '1.5px dashed #E0E0E0',
                    borderRadius: '8px',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#1A237E',
                    fontWeight: 600,
                    transition: 'all 200ms',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = '#1A237E';
                    (e.currentTarget as HTMLButtonElement).style.background = '#E8EAF6';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = '#E0E0E0';
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }}
                >
                  + 新建
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => {
                    setNewCategoryName(e.target.value);
                    if (errors.category) setErrors(prev => ({ ...prev, category: false }));
                  }}
                  placeholder="输入新分类名称"
                  className={shakeField === 'newCategory' ? 'shake' : ''}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    fontSize: '14px',
                    border: `1.5px solid ${errors.category ? '#e53935' : '#E0E0E0'}`,
                    borderRadius: '8px',
                    outline: 'none',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCategory();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  style={{
                    padding: '0 16px',
                    border: 'none',
                    borderRadius: '8px',
                    background: '#1A237E',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#fff',
                    fontWeight: 600,
                    transition: 'background 200ms',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = '#283593';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = '#1A237E';
                  }}
                >
                  添加
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewCategory(false);
                    setNewCategoryName('');
                  }}
                  style={{
                    padding: '0 14px',
                    border: '1.5px solid #E0E0E0',
                    borderRadius: '8px',
                    background: '#fff',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#666',
                    fontWeight: 500,
                    transition: 'all 200ms',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = '#999';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = '#E0E0E0';
                  }}
                >
                  取消
                </button>
              </div>
            )}
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: '#333',
              marginBottom: '6px',
            }}>
              标签（可选，按回车添加）
            </label>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              padding: '8px 12px',
              border: '1.5px solid #E0E0E0',
              borderRadius: '8px',
              minHeight: '42px',
              alignItems: 'center',
              transition: 'border-color 200ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'text',
              background: '#fff',
            }}
              onClick={() => {
                const input = document.querySelector('.tag-input') as HTMLInputElement;
                input?.focus();
              }}
              onFocusCapture={(e) => {
                const target = e.currentTarget as HTMLDivElement;
                target.style.borderColor = '#1A237E';
                target.style.boxShadow = '0 0 0 3px rgba(26, 35, 126, 0.08)';
              }}
              onBlurCapture={(e) => {
                const target = e.currentTarget as HTMLDivElement;
                target.style.borderColor = '#E0E0E0';
                target.style.boxShadow = 'none';
              }}
            >
              {tags.map((tag, i) => (
                <span
                  key={i}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px 3px 10px',
                    background: '#E8EAF6',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#1A237E',
                    fontWeight: 500,
                  }}
                >
                  {tag}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveTag(tag);
                    }}
                    style={{
                      width: '16px',
                      height: '16px',
                      border: 'none',
                      background: 'rgba(26, 35, 126, 0.15)',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      color: '#1A237E',
                      transition: 'background 200ms',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(26, 35, 126, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(26, 35, 126, 0.15)';
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                className="tag-input"
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    handleAddTag();
                  } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
                    handleRemoveTag(tags[tags.length - 1]);
                  }
                }}
                placeholder={tags.length === 0 ? '添加标签，回车确认' : ''}
                style={{
                  border: 'none',
                  outline: 'none',
                  fontSize: '13px',
                  flex: 1,
                  minWidth: '120px',
                  background: 'transparent',
                  fontFamily: 'inherit',
                  padding: '2px 0',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleClose}
              style={{
                padding: '10px 22px',
                border: '1.5px solid #E0E0E0',
                borderRadius: '8px',
                background: '#fff',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                color: '#333',
                transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#1A237E';
                (e.currentTarget as HTMLButtonElement).style.color = '#1A237E';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#E0E0E0';
                (e.currentTarget as HTMLButtonElement).style.color = '#333';
              }}
            >
              取消
            </button>
            <button
              type="submit"
              style={{
                padding: '10px 26px',
                border: 'none',
                borderRadius: '8px',
                background: '#1A237E',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                color: '#fff',
                transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 2px 8px rgba(26, 35, 126, 0.25)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#283593';
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(26, 35, 126, 0.35)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#1A237E';
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 8px rgba(26, 35, 126, 0.25)';
              }}
            >
              添加链接
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
