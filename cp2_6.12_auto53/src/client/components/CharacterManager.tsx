import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Character, PersonalityTag, TAG_COLORS, Chapter } from '../types';
import { characterApi } from '../utils/api';

interface CharacterManagerProps {
  projectId: string;
  characters: Character[];
  chapters: Chapter[];
  onChange: (characters: Character[]) => void;
}

const TAG_TYPE_OPTIONS: { value: PersonalityTag['type']; label: string }[] = [
  { value: 'kind', label: '善良' },
  { value: 'evil', label: '邪恶' },
  { value: 'humorous', label: '幽默' },
  { value: 'other', label: '其他' },
];

const CharacterManager: React.FC<CharacterManagerProps> = ({
  projectId,
  characters,
  chapters,
  onChange,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [newTagType, setNewTagType] = useState<PersonalityTag['type']>('kind');
  const [showAddTag, setShowAddTag] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selected = characters.find((c) => c.id === selectedId);

  const createCharacter = () => {
    const c: Character = {
      id: `char-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: '新角色',
      age: 0,
      tags: [],
      background: '',
    };
    onChange([...characters, c]);
    setSelectedId(c.id);
  };

  const updateCharacter = (id: string, updates: Partial<Character>) => {
    onChange(characters.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const deleteCharacter = (id: string) => {
    onChange(characters.filter((c) => c.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const addTag = (charId: string) => {
    const ch = characters.find((c) => c.id === charId);
    if (!ch || ch.tags.length >= 5) return;
    if (!newTagName.trim()) return;

    const tag: PersonalityTag = {
      id: `tag-${Date.now()}`,
      name: newTagName.trim(),
      type: newTagType,
    };
    updateCharacter(charId, { tags: [...ch.tags, tag] });
    setNewTagName('');
    setShowAddTag(false);
  };

  const updateTag = (charId: string, tagId: string, updates: Partial<PersonalityTag>) => {
    const ch = characters.find((c) => c.id === charId);
    if (!ch) return;
    updateCharacter(charId, {
      tags: ch.tags.map((t) => (t.id === tagId ? { ...t, ...updates } : t)),
    });
    setEditingTag(null);
  };

  const deleteTag = (charId: string, tagId: string) => {
    const ch = characters.find((c) => c.id === charId);
    if (!ch) return;
    updateCharacter(charId, { tags: ch.tags.filter((t) => t.id !== tagId) });
  };

  const handleAvatarUpload = async (charId: string, file: File) => {
    if (!file.type.match(/^image\/(jpeg|png)$/)) {
      alert('仅支持 JPG/PNG 格式');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('图片大小不能超过 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      updateCharacter(charId, { avatar: url });
    };
    reader.readAsDataURL(file);
  };

  const getChapterCount = (charId: string): number => {
    return chapters.filter((ch) => ch.characterIds.includes(charId)).length;
  };

  return (
    <div className="sidebar-content">
      <div className="character-grid">
        {characters.map((char) => (
          <motion.div
            key={char.id}
            className="character-card"
            onClick={() => setSelectedId(char.id)}
            whileHover={{ scale: 1.08 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="character-avatar">
              {char.avatar ? (
                <img src={char.avatar} alt={char.name} />
              ) : (
                char.name.charAt(0)
              )}
            </div>
            <div className="character-name">{char.name}</div>
            {char.age > 0 && <div className="character-age">{char.age}岁</div>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center', marginTop: 4 }}>
              {char.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag.id}
                  style={{
                    display: 'inline-block',
                    padding: '2px 6px',
                    borderRadius: 8,
                    fontSize: 10,
                    fontWeight: 500,
                    color: 'white',
                    background: TAG_COLORS[tag.type],
                  }}
                >
                  {tag.name}
                </span>
              ))}
              {char.tags.length > 2 && (
                <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                  +{char.tags.length - 2}
                </span>
              )}
            </div>
          </motion.div>
        ))}

        <motion.div
          className="character-card add-character-card"
          onClick={createCharacter}
          whileHover={{ scale: 1.04 }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          <span style={{ fontSize: 12 }}>添加角色</span>
        </motion.div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && selectedId) handleAvatarUpload(selectedId, file);
          e.target.value = '';
        }}
      />

      <AnimatePresence>
        {selected && (
          <motion.div
            className="character-detail-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => {
              if ((e.target as HTMLElement).classList.contains('character-detail-overlay')) {
                setSelectedId(null);
                setEditingTag(null);
                setShowAddTag(false);
              }
            }}
          >
            <motion.div
              className="character-detail-panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="detail-header">
                <h3>角色详情</h3>
                <button
                  className="icon-btn"
                  onClick={() => {
                    setSelectedId(null);
                    setEditingTag(null);
                    setShowAddTag(false);
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              <div
                className="detail-avatar"
                onClick={() => fileInputRef.current?.click()}
              >
                {selected.avatar ? (
                  <img src={selected.avatar} alt={selected.name} />
                ) : (
                  selected.name.charAt(0)
                )}
                <div className="detail-avatar-overlay">更换头像</div>
              </div>

              <div className="form-group">
                <label className="form-label">姓名</label>
                <input
                  className="form-input"
                  value={selected.name}
                  onChange={(e) => updateCharacter(selected.id, { name: e.target.value })}
                  placeholder="角色姓名"
                />
              </div>

              <div className="form-group">
                <label className="form-label">年龄</label>
                <input
                  className="form-input"
                  type="number"
                  value={selected.age || ''}
                  onChange={(e) => updateCharacter(selected.id, { age: parseInt(e.target.value) || 0 })}
                  placeholder="角色年龄"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  性格标签（最多5个）
                </label>
                <div className="tags-container">
                  {selected.tags.map((tag) =>
                    editingTag === tag.id ? (
                      <div key={tag.id} className="tag-editor">
                        <input
                          value={newTagName || tag.name}
                          onChange={(e) => setNewTagName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              updateTag(selected.id, tag.id, {
                                name: newTagName.trim() || tag.name,
                                type: newTagType,
                              });
                              setNewTagName('');
                            }
                            if (e.key === 'Escape') setEditingTag(null);
                          }}
                          autoFocus
                        />
                        <select
                          value={newTagType}
                          onChange={(e) => setNewTagType(e.target.value as PersonalityTag['type'])}
                        >
                          {TAG_TYPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <button
                          className="icon-btn"
                          style={{ width: 24, height: 24 }}
                          onClick={() => {
                            updateTag(selected.id, tag.id, {
                              name: newTagName.trim() || tag.name,
                              type: newTagType,
                            });
                            setNewTagName('');
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="3">
                            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <span
                        key={tag.id}
                        className="personality-tag"
                        style={{ background: TAG_COLORS[tag.type] }}
                        onClick={() => {
                          setEditingTag(tag.id);
                          setNewTagName(tag.name);
                          setNewTagType(tag.type);
                        }}
                      >
                        {tag.name}
                        <span
                          className="tag-remove"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTag(selected.id, tag.id);
                          }}
                        >
                          ×
                        </span>
                      </span>
                    )
                  )}

                  {selected.tags.length < 5 && !showAddTag && (
                    <button className="add-tag-btn" onClick={() => setShowAddTag(true)}>
                      + 添加标签
                    </button>
                  )}

                  {showAddTag && selected.tags.length < 5 && (
                    <div className="tag-editor">
                      <input
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newTagName.trim()) {
                            addTag(selected.id);
                          }
                          if (e.key === 'Escape') {
                            setShowAddTag(false);
                            setNewTagName('');
                          }
                        }}
                        placeholder="标签名"
                        autoFocus
                      />
                      <select
                        value={newTagType}
                        onChange={(e) => setNewTagType(e.target.value as PersonalityTag['type'])}
                      >
                        {TAG_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <button
                        className="icon-btn"
                        style={{ width: 24, height: 24 }}
                        onClick={() => {
                          if (newTagName.trim()) addTag(selected.id);
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="3">
                          <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">背景故事</label>
                <textarea
                  className="form-textarea"
                  value={selected.background}
                  onChange={(e) => {
                    if (e.target.value.length <= 500) {
                      updateCharacter(selected.id, { background: e.target.value });
                    }
                  }}
                  placeholder="描述角色的背景故事..."
                  maxLength={500}
                />
                <div className="char-count">{selected.background.length}/500</div>
              </div>

              <div className="form-group">
                <label className="form-label">出场章节数</label>
                <div style={{ fontSize: 14, color: 'var(--accent)', fontWeight: 600 }}>
                  {getChapterCount(selected.id)} 章
                </div>
              </div>

              <button
                className="btn btn-secondary"
                style={{ marginTop: 8, color: 'var(--danger)', borderColor: 'var(--danger)' }}
                onClick={() => deleteCharacter(selected.id)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                删除角色
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CharacterManager;
