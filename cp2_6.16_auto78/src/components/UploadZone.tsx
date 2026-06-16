import React, { useCallback, useState } from 'react';
import { Upload } from 'lucide-react';

interface UploadZoneProps {
  imageUrl: string | null;
  onImageUpload: (file: File) => void;
}

const UploadZone: React.FC<UploadZoneProps> = ({ imageUrl, onImageUpload }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && isValidFile(file)) {
      onImageUpload(file);
    }
  }, [onImageUpload]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isValidFile(file)) {
      onImageUpload(file);
    }
  }, [onImageUpload]);

  const isValidFile = (file: File): boolean => {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    const maxSize = 10 * 1024 * 1024;
    
    if (!validTypes.includes(file.type)) {
      alert('请上传 PNG 或 JPG 格式的图片');
      return false;
    }
    if (file.size > maxSize) {
      alert('图片大小不能超过 10MB');
      return false;
    }
    return true;
  };

  return (
    <div style={styles.container}>
      <style>{`
        .upload-zone {
          transition: all 0.2s ease-out;
        }
        .upload-zone:hover {
          border-color: #a78bfa;
          background: rgba(139, 92, 246, 0.05);
        }
        .upload-zone.dragging {
          border-color: #a78bfa;
          background: rgba(139, 92, 246, 0.1);
          transform: scale(1.02);
        }
        .upload-icon {
          transition: transform 0.2s ease-out;
        }
        .upload-zone:hover .upload-icon {
          transform: scale(1.1);
        }
        @media (max-width: 768px) {
          .upload-zone {
            width: 90% !important;
            height: 200px !important;
          }
        }
      `}</style>
      
      <div
        className={`upload-zone ${isDragging ? 'dragging' : ''}`}
        style={{
          ...styles.uploadZone,
          ...(imageUrl ? styles.imagePreview : {}),
          borderColor: isDragging ? '#a78bfa' : '#8b5cf6',
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="预览" style={styles.previewImage} />
        ) : (
          <div style={styles.uploadContent}>
            <div className="upload-icon" style={styles.iconWrapper}>
              <Upload size={24} color="#9ca3af" />
            </div>
            <p style={styles.uploadText}>点击或拖拽上传图片</p>
            <p style={styles.uploadHint}>支持 PNG / JPG，最大 10MB</p>
          </div>
        )}
      </div>
      
      <input
        id="file-input"
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '24px 0',
  },
  uploadZone: {
    width: '400px',
    height: '300px',
    border: '2px dashed #8b5cf6',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    background: '#f5f3ff',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  uploadContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  iconWrapper: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    color: '#d1d5db',
    fontSize: '14px',
    fontWeight: 500,
  },
  uploadHint: {
    color: '#6b7280',
    fontSize: '12px',
  },
};

export default UploadZone;
