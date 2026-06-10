import React, { useCallback, useRef, useState } from 'react';
import { Upload, ImageIcon, X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { splitImage } from '@/utils/collageEngine';

const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export const UploadPanel: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { sourceImage, setSourceImage, setFragments, resetWorkspace } = useStore();

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError('仅支持 PNG、JPG、WebP 格式');
        return;
      }
      if (file.size > MAX_SIZE) {
        setError('图片大小不能超过 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          setSourceImage(img, url);
          const count = Math.floor(Math.random() * 5) + 12;
          const fragments = splitImage(img.width, img.height, count);
          setFragments(fragments);
        };
        img.src = url;
      };
      reader.readAsDataURL(file);
    },
    [setSourceImage, setFragments]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleClick = () => {
    inputRef.current?.click();
  };

  if (sourceImage) {
    return (
      <div
        className="glass hover-lift transition-all-smooth"
        style={{
          width: 200,
          borderRadius: 16,
          padding: 16,
          boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <span
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 15,
              fontWeight: 600,
              color: '#4A3F35',
            }}
          >
            当前图片
          </span>
          <button
            onClick={resetWorkspace}
            className="toolbar-icon"
            style={{ padding: 4, borderRadius: 6 }}
            title="重新上传"
          >
            <X size={16} />
          </button>
        </div>
        <div
          style={{
            width: '100%',
            aspectRatio: '1',
            borderRadius: 12,
            overflow: 'hidden',
            border: '1px solid rgba(74,63,53,0.15)',
            background: '#fff',
          }}
        >
          <img
            src={useStore.getState().sourceImageUrl}
            alt="uploaded"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
        <button
          onClick={handleClick}
          className="hover-lift"
          style={{
            width: '100%',
            marginTop: 12,
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid rgba(74,63,53,0.2)',
            background: 'rgba(255,255,255,0.6)',
            fontSize: 12,
            fontWeight: 500,
            color: '#4A3F35',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'all 0.3s ease-in-out',
          }}
        >
          <Upload size={14} />
          更换图片
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`glass hover-lift transition-all-smooth`}
      style={{
        width: 200,
        borderRadius: 16,
        padding: 16,
        boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
      }}
    >
      <span
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 15,
          fontWeight: 600,
          color: '#4A3F35',
          display: 'block',
          marginBottom: 12,
        }}
      >
        上传图片
      </span>
      <div
        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
        onClick={handleClick}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          width: '100%',
          aspectRatio: '1',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'rgba(212, 139, 96, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {dragOver ? <ImageIcon size={22} color="#D48B60" /> : <Upload size={22} color="#D48B60" />}
        </div>
        <div style={{ textAlign: 'center', padding: '0 8px' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#4A3F35', marginBottom: 4 }}>
            拖拽或点击上传
          </p>
          <p style={{ fontSize: 11, color: '#8B7D6F' }}>PNG / JPG / WebP · 5MB</p>
        </div>
      </div>
      {error && (
        <p
          style={{
            fontSize: 12,
            color: '#EF4444',
            marginTop: 10,
            textAlign: 'center',
          }}
        >
          {error}
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
};
