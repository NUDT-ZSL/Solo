import React, { useState, useRef } from 'react';
import { Sentiment } from '../utils/storage';

interface FeedbackFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    sentiment: Sentiment;
    screenshots: string[];
    screenshotNames: string[];
    isUrgent: boolean;
  }) => void;
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({ isOpen, onClose, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sentiment, setSentiment] = useState<Sentiment>('neutral');
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [screenshotNames, setScreenshotNames] = useState<string[]>([]);
  const [isUrgent, setIsUrgent] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState<{ title?: string; description?: string }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setSentiment('neutral');
    setScreenshots([]);
    setScreenshotNames([]);
    setIsUrgent(false);
    setErrors({});
    setUploadProgress(0);
    onClose();
  };

  const validate = () => {
    const newErrors: { title?: string; description?: string } = {};
    if (!title.trim()) {
      newErrors.title = '请输入反馈标题';
    } else if (title.length > 50) {
      newErrors.title = '标题不能超过50字';
    }
    if (!description.trim()) {
      newErrors.description = '请输入反馈描述';
    } else if (description.length > 500) {
      newErrors.description = '描述不能超过500字';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      sentiment,
      screenshots,
      screenshotNames,
      isUrgent,
    });
    handleClose();
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    const remainingSlots = 3 - screenshots.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    if (filesToProcess.length === 0) {
      alert('最多只能上传3张图片');
      return;
    }

    let processed = 0;
    const newScreenshots: string[] = [];
    const newScreenshotNames: string[] = [];

    filesToProcess.forEach((file, fileIndex) => {
      if (!file.type.startsWith('image/')) {
        alert('请上传图片文件');
        processed++;
        return;
      }

      const reader = new FileReader();
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          const totalProgress = ((processed + progress / 100) / filesToProcess.length) * 100;
          setUploadProgress(Math.min(Math.round(totalProgress), 100));
        }
      };
      reader.onload = (e) => {
        if (e.target?.result) {
          newScreenshots.push(e.target.result as string);
          newScreenshotNames.push(file.name);
          processed++;
          if (processed === filesToProcess.length) {
            setScreenshots((prev) => [...prev, ...newScreenshots]);
            setScreenshotNames((prev) => [...prev, ...newScreenshotNames]);
            setUploadProgress(0);
          }
        }
      };
      reader.readAsDataURL(file);
    });
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
    handleFileUpload(e.dataTransfer.files);
  };

  const removeScreenshot = (index: number) => {
    setScreenshots((prev) => prev.filter((_, i) => i !== index));
    setScreenshotNames((prev) => prev.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <div className={`modal-overlay ${isOpen ? 'open' : ''}`} onClick={handleOverlayClick}>
      <div className="modal-content">
        <form onSubmit={handleSubmit}>
          <div className="modal-header">
            <h2 className="modal-title">添加新反馈</h2>
            <button
              type="button"
              className="modal-close"
              onClick={handleClose}
              aria-label="关闭"
            >
              ×
            </button>
          </div>

          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">标题</label>
              <input
                type="text"
                className={`form-input ${errors.title ? 'error' : ''}`}
                placeholder="请输入反馈标题（最多50字）"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={50}
              />
              <div className={`char-count ${title.length > 40 ? 'warning' : ''}`}>
                {title.length}/50
              </div>
              {errors.title && <div className="error-text">{errors.title}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">描述（支持Markdown）</label>
              <textarea
                className={`form-textarea ${errors.description ? 'error' : ''}`}
                placeholder="请详细描述反馈内容（支持Markdown格式，最多500字）
支持：**粗体**、*斜体*、`代码`、- 列表等"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
              />
              <div className={`char-count ${description.length > 400 ? 'warning' : ''}`}>
                {description.length}/500
              </div>
              {errors.description && <div className="error-text">{errors.description}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">情感标签</label>
              <div className="select-wrapper">
                <select
                  className="form-select"
                  value={sentiment}
                  onChange={(e) => setSentiment(e.target.value as Sentiment)}
                >
                  <option value="positive">😊 正面（绿色）</option>
                  <option value="neutral">😐 中性（灰色）</option>
                  <option value="negative">😞 负面（红色）</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                <input
                  type="checkbox"
                  checked={isUrgent}
                  onChange={(e) => setIsUrgent(e.target.checked)}
                  style={{ marginRight: '8px' }}
                />
                标记为紧急
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">截图上传（最多3张）</label>
              <div
                className={`upload-area ${isDragging ? 'dragover' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="upload-icon">📷</div>
                <div className="upload-text">点击或拖拽图片到此处上传</div>
                <div className="upload-hint">支持 JPG、PNG、GIF 格式，最多3张</div>
                {uploadProgress > 0 && (
                  <div className="upload-progress">
                    <div
                      className="upload-progress-bar"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => handleFileUpload(e.target.files)}
              />
              {screenshots.length > 0 && (
                <div className="upload-preview">
                  {screenshots.map((screenshot, index) => (
                    <div key={index} className="upload-preview-item">
                      <img
                        src={screenshot}
                        alt={screenshotNames[index] || `截图 ${index + 1}`}
                        className="upload-preview-img"
                        title={screenshotNames[index]}
                      />
                      <button
                        type="button"
                        className="upload-remove-btn"
                        onClick={() => removeScreenshot(index)}
                        aria-label="删除截图"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={handleClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              提交反馈
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeedbackForm;
