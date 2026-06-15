import React, { useRef } from 'react';
import { Upload, Sparkles, X, ImageIcon, GripVertical } from 'lucide-react';

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
  const dragImageRef = useRef<HTMLImageElement | null>(null);

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

  const handleDragStart = (e: React.DragEvent, image: UploadedImage) => {
    e.dataTransfer.setData('imageId', image.id);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.dropEffect = 'copy';

    if (dragImageRef.current) {
      dragImageRef.current.src = image.thumbnailUrl;
      e.dataTransfer.setDragImage(dragImageRef.current, 50, 50);
    }

    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '0.6';
    target.style.transform = 'scale(0.95)';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '1';
    target.style.transform = 'scale(1)';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDropOnGallery = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file) => {
        if (file.type.startsWith('image/')) {
          onUpload(file);
        }
      });
    }
  };

  return (
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <div ref={() => {
        const img = document.createElement('img');
        img.style.position = 'absolute';
        img.style.top = '-9999px';
        img.style.left = '-9999px';
        img.width = 100;
        img.height = 100;
        dragImageRef.current = img;
      }} />

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

      <div
        className="image-gallery"
        onDragOver={handleDragOver}
        onDrop={handleDropOnGallery}
      >
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
            gap: '8px',
            border: '1px dashed rgba(0, 245, 255, 0.2)',
            borderRadius: '8px',
            background: 'rgba(0, 245, 255, 0.02)'
          }}>
            <ImageIcon size={28} style={{ opacity: 0.3 }} />
            <span>点击上传或拖拽图片到此处</span>
          </div>
        )}
        {images.map((img) => (
          <div
            key={img.id}
            className="thumbnail"
            draggable
            onDragStart={(e) => handleDragStart(e, img)}
            onDragEnd={handleDragEnd}
            title="拖拽到画布放置"
          >
            <img src={img.thumbnailUrl} alt="" draggable={false} />
            <div
              style={{
                position: 'absolute',
                top: 4,
                left: 4,
                width: 16,
                height: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0, 0, 0, 0.5)',
                borderRadius: 3,
                opacity: 0,
                transition: 'opacity 0.2s ease'
              }}
              className="drag-handle"
            >
              <GripVertical size={12} style={{ color: 'white' }} />
            </div>
            <button
              className="thumbnail-delete"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
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
