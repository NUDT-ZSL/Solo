import React, { useRef } from 'react';
import { Upload, Sparkles, X, ImageIcon } from 'lucide-react';

interface UploadedImage {
  id: string;
  thumbnailUrl: string;
  originalUrl: string;
}

interface ToolbarProps {
  images: UploadedImage[];
  onUpload: (file: File) => void;
  onDelete: (id: string) => void;
  onGenerateLightEffects: () => void;
  lightEffectsEnabled: boolean;
  mobileOpen: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
  images,
  onUpload,
  onDelete,
  onGenerateLightEffects,
  lightEffectsEnabled,
  mobileOpen
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        if (file.type.startsWith('image/')) {
          onUpload(file);
        }
      });
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragStart = (e: React.DragEvent, imageId: string) => {
    e.dataTransfer.setData('imageId', imageId);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-title">图片库</div>
        <button
          className="btn btn-primary upload-btn"
          onClick={handleUploadClick}
          disabled={images.length >= 12}
          style={{ opacity: images.length >= 12 ? 0.5 : 1, cursor: images.length >= 12 ? 'not-allowed' : 'pointer' }}
        >
          <Upload size={16} />
          上传图片
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px', textAlign: 'center' }}>
          {images.length} / 12 张
        </div>
      </div>

      <div className="image-gallery">
        {images.length === 0 && (
          <div style={{
            gridColumn: '1 / -1',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px 8px',
            color: '#94a3b8',
            fontSize: '12px',
            textAlign: 'center',
            gap: '8px'
          }}>
            <ImageIcon size={28} style={{ opacity: 0.3 }} />
            <span>拖拽图片到此处或点击上传</span>
          </div>
        )}
        {images.map((img) => (
          <div
            key={img.id}
            className="thumbnail"
            draggable
            onDragStart={(e) => handleDragStart(e, img.id)}
            title="拖拽到画布"
          >
            <img src={img.thumbnailUrl} alt="" />
            <button
              className="thumbnail-delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(img.id);
              }}
              title="删除"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <button
          className={`btn generate-btn ${lightEffectsEnabled ? 'btn-primary' : ''}`}
          onClick={onGenerateLightEffects}
        >
          <Sparkles size={16} />
          {lightEffectsEnabled ? '关闭光效' : '生成光效'}
        </button>
      </div>
    </aside>
  );
};

export default Toolbar;
