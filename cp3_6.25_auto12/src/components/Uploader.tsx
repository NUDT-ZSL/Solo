import React, { useState, useRef, useEffect } from 'react';
import { addWork } from '../api/dataService';
import './Uploader.css';

const DEFAULT_TAGS = ['抽象', '风景', '人物', '插画', '其他'];

const TAG_COLORS: Record<string, string> = {
  '抽象': '#ab47bc',
  '风景': '#66bb6a',
  '人物': '#ffa726',
  '插画': '#26c6da',
  '其他': '#78909c',
};

interface UploaderProps {
  onClose: () => void;
  onSuccess: () => void;
}

const Uploader: React.FC<UploaderProps> = ({ onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowTagDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFileSelect = (file: File) => {
    setError('');
    
    if (!file.type.match('image/jpeg') && !file.type.match('image/png')) {
      setError('仅支持 JPG 和 PNG 格式');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('图片大小不能超过 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImagePreview(result);
      setImageData(result);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!imageData) {
      setError('请选择一张图片');
      return;
    }

    if (!title.trim()) {
      setError('请输入作品标题');
      return;
    }

    if (selectedTags.length === 0) {
      setError('请至少选择一个主题标签');
      return;
    }

    setIsUploading(true);

    try {
      await addWork({
        title: title.trim(),
        image: imageData,
        tags: selectedTags,
      });
      onSuccess();
    } catch (err) {
      setError('上传失败，请重试');
    } finally {
      setIsUploading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="uploader-overlay" onClick={handleOverlayClick}>
      <div className="uploader-dialog fade-in">
        <div className="uploader-header">
          <h3>上传作品</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="uploader-form">
          <div
            className={`drop-zone ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {imagePreview ? (
              <div className="preview-container">
                <img src={imagePreview} alt="预览" />
                <div className="preview-overlay">
                  <span>点击更换图片</span>
                </div>
              </div>
            ) : (
              <div className="drop-placeholder">
                <div className="upload-icon">📁</div>
                <p>拖拽图片到此处或点击选择</p>
                <p className="hint">支持 JPG/PNG，单张不超过 10MB</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png"
              onChange={handleFileInputChange}
              style={{ display: 'none' }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="title">作品标题</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入作品标题"
              maxLength={50}
            />
          </div>

          <div className="form-group" ref={dropdownRef}>
            <label>主题标签</label>
            <div className="tag-selector">
              <div
                className="tag-display"
                onClick={() => setShowTagDropdown(!showTagDropdown)}
              >
                {selectedTags.length > 0 ? (
                  <div className="selected-tags">
                    {selectedTags.map(tag => (
                      <span
                        key={tag}
                        className="selected-tag"
                        style={{ backgroundColor: TAG_COLORS[tag] }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTagToggle(tag);
                        }}
                      >
                        {tag} ×
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="placeholder">请选择主题标签（可多选）</span>
                )}
                <span className="dropdown-arrow">▼</span>
              </div>
              {showTagDropdown && (
                <div className="tag-dropdown">
                  {DEFAULT_TAGS.map(tag => (
                    <div
                      key={tag}
                      className={`tag-option ${selectedTags.includes(tag) ? 'selected' : ''}`}
                      onClick={() => handleTagToggle(tag)}
                    >
                      <span
                        className="tag-dot"
                        style={{ backgroundColor: TAG_COLORS[tag] }}
                      />
                      <span>{tag}</span>
                      {selectedTags.includes(tag) && <span className="check">✓</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={onClose}
              disabled={isUploading}
            >
              取消
            </button>
            <button
              type="submit"
              className="submit-btn"
              disabled={isUploading}
            >
              {isUploading ? '上传中...' : '确认上传'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Uploader;
