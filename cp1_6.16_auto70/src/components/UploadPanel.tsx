import React, { useState, useRef, useCallback } from 'react';
import { Upload } from 'lucide-react';
import type { ClothingItem } from '../types';
import { getColorName } from '../logic/colorMatching';

interface UploadPanelProps {
  onUploadComplete: (item: ClothingItem) => void;
}

export const UploadPanel: React.FC<UploadPanelProps> = ({ onUploadComplete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showPulse, setShowPulse] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const styles = ['风衣', '马甲', '阔腿裤', '直筒裤', '牛仔裤', '连衣裙', '短裙', '衬衫', '高领毛衣', '针织衫', '短外套', '西装外套', 'T恤', '毛衣'];
  const categories: Array<'top' | 'bottom' | 'outer' | 'dress' | 'accessory'> = ['top', 'bottom', 'outer', 'dress', 'accessory'];
  const seasons = ['春', '夏', '秋', '冬'];
  const occasions = ['日常', '职场', '约会', '休闲', '学院', '派对'];

  const triggerPulse = useCallback(() => {
    setShowPulse(true);
    setTimeout(() => setShowPulse(false), 300);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
      triggerPulse();
    }
  }, [isDragging, triggerPulse]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('请上传图片文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = 100;
          canvas.height = 100;
          ctx.drawImage(img, 0, 0, 100, 100);
          const imageData = ctx.getImageData(0, 0, 100, 100);

          let r = 0, g = 0, b = 0, count = 0;
          for (let i = 0; i < imageData.data.length; i += 4) {
            r += imageData.data[i];
            g += imageData.data[i + 1];
            b += imageData.data[i + 2];
            count++;
          }
          r = Math.round(r / count);
          g = Math.round(g / count);
          b = Math.round(b / count);

          const hexColor = '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
          }).join('');

          const detectedColor = getColorName(hexColor);
          const randomStyle = styles[Math.floor(Math.random() * styles.length)];
          const randomCategory = categories[Math.floor(Math.random() * categories.length)];
          const randomSeasons = seasons.sort(() => Math.random() - 0.5).slice(0, 2);
          const randomOccasions = occasions.sort(() => Math.random() - 0.5).slice(0, 2);

          const newItem: ClothingItem = {
            id: `upload-${Date.now()}`,
            name: `上传的${randomStyle}`,
            imageUrl,
            style: randomStyle,
            color: hexColor,
            colorName: detectedColor,
            season: randomSeasons,
            occasion: randomOccasions,
            category: randomCategory,
          };

          onUploadComplete(newItem);
        }
      };
      img.src = imageUrl;
    };
    reader.readAsDataURL(file);
  }, [onUploadComplete, styles, categories, seasons, occasions]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFile]);

  const panelClasses = [
    'upload-panel',
    isDragging ? 'dragging' : '',
    showPulse ? 'pulse' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={panelClasses}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <Upload
        size={48}
        color={isDragging ? '#3498DB' : '#95A5A6'}
        style={{ marginBottom: 12 }}
      />
      <p style={{
        color: isDragging ? '#3498DB' : '#2C3E50',
        fontWeight: 500,
        fontSize: 16,
        marginBottom: 4,
      }}>
        {isDragging ? '释放以上传图片' : '拖拽图片到此处'}
      </p>
      <p style={{
        color: '#7F8C8D',
        fontSize: 13,
      }}>
        或点击选择文件
      </p>
    </div>
  );
};
