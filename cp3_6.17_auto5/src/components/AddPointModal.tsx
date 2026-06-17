import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Difficulty } from '../types';

interface AddPointModalProps {
  onClose: () => void;
  onAdd: (data: {
    title: string;
    description: string;
    difficulty: Difficulty;
    tags: string[];
  }) => void;
}

const DIFFICULTY_OPTIONS: Difficulty[] = ['初级', '中级', '高级'];
const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  '初级': '#81c784',
  '中级': '#ffb74d',
  '高级': '#e57373',
};

export const AddPointModal: React.FC<AddPointModalProps> = ({ onClose, onAdd }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('初级');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed) && tags.length < 5) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title && description) {
      onAdd({ title, description, difficulty, tags });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        className="relative bg-white rounded-2xl shadow-2xl z-10 w-full max-w-md overflow-hidden"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold" style={{ color: '#212121' }}>
              添加知识点
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} style={{ color: '#757575' }} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#212121' }}>
                知识点标题
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00bcd4] transition-all"
                placeholder="请输入知识点标题"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#212121' }}>
                详细描述
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00bcd4] transition-all resize-none"
                rows={4}
                placeholder="请输入知识点详细描述"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#212121' }}>
                难度等级
              </label>
              <div className="flex gap-2">
                {DIFFICULTY_OPTIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className="flex-1 py-2 px-3 rounded-lg border-2 transition-all font-medium text-sm"
                    style={{
                      borderColor: difficulty === d ? DIFFICULTY_COLORS[d] : '#e0e0e0',
                      backgroundColor: difficulty === d ? `${DIFFICULTY_COLORS[d]}20` : 'transparent',
                      color: difficulty === d ? DIFFICULTY_COLORS[d] : '#757575',
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#212121' }}>
                标签（最多5个）
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00bcd4] transition-all"
                  placeholder="输入标签后按回车添加"
                  disabled={tags.length >= 5}
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  disabled={tags.length >= 5}
                  className="px-4 py-2 rounded-lg text-white transition-all disabled:opacity-50"
                  style={{ backgroundColor: '#00bcd4' }}
                >
                  <Plus size={18} />
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-full text-xs flex items-center gap-1"
                      style={{
                        backgroundColor: 'rgba(0, 188, 212, 0.1)',
                        color: '#00bcd4',
                      }}
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-[#1a237e] transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl font-medium border-2 transition-all hover:bg-gray-50"
                style={{ borderColor: '#e0e0e0', color: '#757575' }}
              >
                取消
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl font-medium text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ backgroundColor: '#1a237e' }}
              >
                添加
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
