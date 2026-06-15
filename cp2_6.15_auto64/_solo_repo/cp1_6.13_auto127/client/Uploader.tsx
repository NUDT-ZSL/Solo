import { useState, useRef, useEffect, useCallback } from 'react';
import type { Tag, CropArea, UploadProgress } from './types';
import { uploadPhoto } from './photoService';

interface UploaderProps {
  existingTags: Tag[];
  onUploadComplete: () => void;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

export default function Uploader({ existingTags, onUploadComplete }: UploaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [captureDate, setCaptureDate] = useState(new Date().toISOString().slice(0, 10));
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    percent: 0,
    status: 'idle',
  });
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFile = useCallback((selectedFile: File) => {
    setError(null);
    if (!ACCEPTED_TYPES.includes(selectedFile.type)) {
      setError('仅支持 JPG 和 PNG 格式图片');
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('文件大小不能超过 50MB');
      return;
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setTitle(selectedFile.name.replace(/\.[^.]+$/, ''));
    setUploadProgress({ percent: 0, status: 'idle' });
  }, [previewUrl]);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === dropAreaRef.current) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFile(droppedFile);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFile(selectedFile);
    }
  };

  const toggleTag = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName)
        ? prev.filter((t) => t !== tagName)
        : [...prev, tagName]
    );
  };

  const addNewTag = () => {
    const trimmed = newTagInput.trim();
    if (trimmed && !selectedTags.includes(trimmed)) {
      setSelectedTags((prev) => [...prev, trimmed]);
    }
    setNewTagInput('');
  };

  const handleSubmit = async () => {
    if (!file) return;
    setError(null);
    setUploadProgress({ percent: 0, status: 'uploading' });

    try {
      await uploadPhoto(
        file,
        title,
        selectedTags,
        captureDate,
        undefined,
        (percent) => {
          setUploadProgress({ percent, status: 'uploading' });
        }
      );
      setUploadProgress({ percent: 100, status: 'success' });
      setTimeout(() => {
        onUploadComplete();
        resetForm();
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : '上传失败，请重试';
      setUploadProgress({ percent: 0, status: 'error', error: message });
      setError(message);
    }
  };

  const resetForm = () => {
    setFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setTitle('');
    setSelectedTags([]);
    setNewTagInput('');
    setCaptureDate(new Date().toISOString().slice(0, 10));
    setUploadProgress({ percent: 0, status: 'idle' });
    setError(null);
    setIsOpen(false);
  };

  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 56,
            height: 56,
            borderRadius: '50%',
            backgroundColor: '#6366f1',
            color: '#ffffff',
            border: 'none',
            fontSize: 28,
            fontWeight: 300,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
            zIndex: 90,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.1s ease',
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          +
        </button>

        {isOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: '#00000080',
              zIndex: 999,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
            }}
            onClick={() => setIsOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                backgroundColor: '#ffffff',
                borderRadius: '20px 20px 0 0',
                padding: 24,
                animation: 'slideUp 0.3s ease-out',
              }}
            >
              <UploaderContent
                file={file}
                previewUrl={previewUrl}
                title={title}
                setTitle={setTitle}
                selectedTags={selectedTags}
                existingTags={existingTags}
                toggleTag={toggleTag}
                newTagInput={newTagInput}
                setNewTagInput={setNewTagInput}
                addNewTag={addNewTag}
                captureDate={captureDate}
                setCaptureDate={setCaptureDate}
                isDragging={isDragging}
                dropAreaRef={dropAreaRef}
                handleDragEnter={handleDragEnter}
                handleDragOver={handleDragOver}
                handleDragLeave={handleDragLeave}
                handleDrop={handleDrop}
                fileInputRef={fileInputRef}
                handleInputChange={handleInputChange}
                uploadProgress={uploadProgress}
                error={error}
                onSubmit={handleSubmit}
                onCancel={resetForm}
              />
            </div>
          </div>
        )}
      </>
    );
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          padding: '8px 20px',
          borderRadius: '999px',
          backgroundColor: '#6366f1',
          color: '#ffffff',
          border: 'none',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          minHeight: 36,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#4f46e5')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#6366f1')}
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        上传作品
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#00000080',
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={resetForm}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 640,
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: '#ffffff',
          borderRadius: 16,
          padding: 32,
          boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
          animation: 'fadeIn 0.3s ease-out',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1e293b', fontFamily: "'Playfair Display', serif" }}>
            上传作品
          </h2>
          <button
            onClick={resetForm}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: 'none',
              backgroundColor: '#f1f5f9',
              color: '#64748b',
              fontSize: 20,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e2e8f0';
              e.currentTarget.style.color = '#1e293b';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
              e.currentTarget.style.color = '#64748b';
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            ×
          </button>
        </div>

        <UploaderContent
          file={file}
          previewUrl={previewUrl}
          title={title}
          setTitle={setTitle}
          selectedTags={selectedTags}
          existingTags={existingTags}
          toggleTag={toggleTag}
          newTagInput={newTagInput}
          setNewTagInput={setNewTagInput}
          addNewTag={addNewTag}
          captureDate={captureDate}
          setCaptureDate={setCaptureDate}
          isDragging={isDragging}
          dropAreaRef={dropAreaRef}
          handleDragEnter={handleDragEnter}
          handleDragOver={handleDragOver}
          handleDragLeave={handleDragLeave}
          handleDrop={handleDrop}
          fileInputRef={fileInputRef}
          handleInputChange={handleInputChange}
          uploadProgress={uploadProgress}
          error={error}
          onSubmit={handleSubmit}
          onCancel={resetForm}
        />
      </div>
    </div>
  );
}

interface UploaderContentProps {
  file: File | null;
  previewUrl: string | null;
  title: string;
  setTitle: (v: string) => void;
  selectedTags: string[];
  existingTags: Tag[];
  toggleTag: (name: string) => void;
  newTagInput: string;
  setNewTagInput: (v: string) => void;
  addNewTag: () => void;
  captureDate: string;
  setCaptureDate: (v: string) => void;
  isDragging: boolean;
  dropAreaRef: React.RefObject<HTMLDivElement>;
  handleDragEnter: (e: React.DragEvent) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadProgress: UploadProgress;
  error: string | null;
  onSubmit: () => void;
  onCancel: () => void;
}

function UploaderContent({
  file,
  previewUrl,
  title,
  setTitle,
  selectedTags,
  existingTags,
  toggleTag,
  newTagInput,
  setNewTagInput,
  addNewTag,
  captureDate,
  setCaptureDate,
  isDragging,
  dropAreaRef,
  handleDragEnter,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  fileInputRef,
  handleInputChange,
  uploadProgress,
  error,
  onSubmit,
  onCancel,
}: UploaderContentProps) {
  const progressBarColor =
    uploadProgress.status === 'success'
      ? '#22c55e'
      : uploadProgress.status === 'error'
      ? '#ef4444'
      : '#6366f1';

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    fontSize: 14,
    fontFamily: 'inherit',
    color: '#1e293b',
    backgroundColor: '#ffffff',
    transition: 'border-color 0.2s ease',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#475569',
    marginBottom: 6,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div
        ref={dropAreaRef}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          width: '100%',
          minHeight: previewUrl ? 200 : 180,
          borderRadius: 12,
          border: `2px dashed ${isDragging ? '#6366f1' : '#cbd5e1'}`,
          backgroundColor: isDragging ? 'rgba(99, 102, 241, 0.05)' : '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          padding: previewUrl ? 16 : 24,
          overflow: 'hidden',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png"
          onChange={handleInputChange}
          style={{ display: 'none' }}
        />
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="预览"
            style={{
              maxWidth: '100%',
              maxHeight: 300,
              objectFit: 'contain',
              borderRadius: 8,
            }}
          />
        ) : (
          <>
            <div
              style={{
                fontSize: 40,
                color: isDragging ? '#6366f1' : '#94a3b8',
                marginBottom: 12,
              }}
            >
              📷
            </div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: isDragging ? '#6366f1' : '#475569' }}>
              {isDragging ? '释放以上传图片' : '拖拽图片到此处，或点击选择'}
            </p>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: '#94a3b8' }}>
              支持 JPG / PNG 格式，单张不超过 50MB
            </p>
          </>
        )}
      </div>

      {file && (
        <>
          <div>
            <label style={labelStyle}>作品标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入作品标题"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#6366f1')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
            />
          </div>

          <div>
            <label style={labelStyle}>拍摄日期</label>
            <input
              type="date"
              value={captureDate}
              onChange={(e) => setCaptureDate(e.target.value)}
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#6366f1')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
            />
          </div>

          <div>
            <label style={labelStyle}>
              标签（{selectedTags.length} 已选）
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {existingTags.map((tag) => {
                const isSelected = selectedTags.includes(tag.name);
                return (
                  <button
                    key={tag.name}
                    type="button"
                    onClick={() => toggleTag(tag.name)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '999px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 500,
                      transition: 'all 0.2s ease',
                      backgroundColor: isSelected ? '#6366f1' : '#e2e8f0',
                      color: isSelected ? '#ffffff' : '#475569',
                    }}
                    onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
                    onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addNewTag();
                  }
                }}
                placeholder="输入新标签后按回车添加"
                style={{ ...inputStyle, flex: 1 }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#6366f1')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
              />
              <button
                type="button"
                onClick={addNewTag}
                style={{
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: '#e2e8f0',
                  color: '#475569',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#cbd5e1')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#e2e8f0')}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                添加
              </button>
            </div>
            {selectedTags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                <span style={{ fontSize: 12, color: '#64748b', alignSelf: 'center' }}>已选：</span>
                {selectedTags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '3px 8px 3px 10px',
                      borderRadius: '999px',
                      backgroundColor: '#6366f1',
                      color: '#ffffff',
                      fontSize: 12,
                    }}
                  >
                    {tag}
                    <button
                      onClick={() => toggleTag(tag)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ffffff',
                        cursor: 'pointer',
                        fontSize: 14,
                        lineHeight: 1,
                        padding: 0,
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {(uploadProgress.status === 'uploading' || uploadProgress.status === 'success' || uploadProgress.status === 'error') && (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 500, color: '#475569' }}>
              {uploadProgress.status === 'success'
                ? '上传成功！'
                : uploadProgress.status === 'error'
                ? '上传失败'
                : '正在上传...'}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: progressBarColor }}>
              {uploadProgress.percent}%
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: 8,
              borderRadius: 4,
              backgroundColor: '#e2e8f0',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${uploadProgress.percent}%`,
                backgroundColor: progressBarColor,
                borderRadius: 4,
                transition: 'width 0.3s ease, background-color 0.3s ease',
                animation:
                  uploadProgress.status === 'success'
                    ? 'pulse 0.3s ease'
                    : 'none',
              }}
            />
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            backgroundColor: '#fef2f2',
            color: '#ef4444',
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      {file && uploadProgress.status !== 'uploading' && uploadProgress.status !== 'success' && (
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '10px 24px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e2e8f0')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            取消
          </button>
          <button
            type="button"
            onClick={onSubmit}
            style={{
              padding: '10px 24px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: '#6366f1',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#4f46e5')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#6366f1')}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            开始上传
          </button>
        </div>
      )}
    </div>
  );
}
