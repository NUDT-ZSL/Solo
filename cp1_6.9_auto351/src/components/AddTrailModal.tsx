import React, { useState } from 'react';
import type { TrailInput } from '../types';

interface AddTrailModalProps {
  onClose: () => void;
  onSubmit: (data: TrailInput) => void;
}

const CATEGORIES = ['技术文档', '开发工具', '设计灵感', '社交媒体', '娱乐', '学习', '其他'];

export default function AddTrailModal({ onClose, onSubmit }: AddTrailModalProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('');
  const [scrollDepth, setScrollDepth] = useState('');
  const [category, setCategory] = useState('其他');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    const data: TrailInput = {
      url: url.trim(),
      title: title.trim() || url.trim(),
      category,
    };
    if (duration) data.duration = parseInt(duration, 10);
    if (scrollDepth) data.scrollDepth = parseInt(scrollDepth, 10);

    onSubmit(data);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">添加新足迹</div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">URL *</label>
            <input
              type="url"
              className="form-input"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">页面标题</label>
            <input
              type="text"
              className="form-input"
              placeholder="留空将使用URL作为标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">停留时长 (秒)</label>
              <input
                type="number"
                className="form-input"
                placeholder="随机"
                min="1"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">滚动深度 (%)</label>
              <input
                type="number"
                className="form-input"
                placeholder="随机"
                min="0"
                max="100"
                value={scrollDepth}
                onChange={(e) => setScrollDepth(e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">分类</label>
            <select
              className="form-input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn">
              记录足迹
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
