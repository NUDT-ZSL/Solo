import React, { useState, useRef } from 'react';
import { Star, GripVertical, X, Camera } from 'lucide-react';
import type { RecipeStep } from '../types';

interface StepCardProps {
  step: RecipeStep;
  isActive: boolean;
  totalSteps: number;
  onUpdate: (step: RecipeStep) => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  index: number;
}

export const StepCard: React.FC<StepCardProps> = ({
  step,
  isActive,
  totalSteps,
  onUpdate,
  onDelete,
  onDragStart,
  onDragOver,
  onDragEnd,
  index,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxWidth = 480;
          const ratio = maxWidth / img.width;
          canvas.width = maxWidth;
          canvas.height = img.height * ratio;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          } else {
            reject(new Error('Canvas context not available'));
          }
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      alert('只支持.jpg和.png格式');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      alert('图片大小不能超过3MB');
      return;
    }

    try {
      const compressed = await compressImage(file);
      onUpdate({ ...step, photo: compressed });
    } catch (err) {
      console.error('图片压缩失败', err);
    }
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate({ ...step, description: e.target.value });
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ ...step, duration: parseInt(e.target.value) || 0 });
  };

  const handleRatingChange = (rating: number) => {
    onUpdate({ ...step, rating });
  };

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    onDragStart(e, index);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    onDragEnd();
  };

  const progressPercentage = totalSteps > 0 ? ((index + 1) / totalSteps) * 100 : 0;

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={handleDragEnd}
      style={{
        position: 'relative',
        padding: '24px',
        background: '#ffffff',
        borderRadius: '16px',
        boxShadow: isActive 
          ? '0 6px 16px rgba(78,52,46,0.2)' 
          : '0 4px 12px rgba(78,52,46,0.12)',
        transform: isActive ? 'translateY(-4px)' : isDragging ? 'translateY(-2px)' : 'none',
        transition: 'all 0.2s ease',
        cursor: 'grab',
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      {isActive && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '4px',
            background: 'linear-gradient(to bottom, #ffb74d, #ff7043)',
            borderRadius: '4px 0 0 4px',
          }}
        />
      )}

      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: isActive ? '#ffb74d' : '#ffe0b2',
              color: '#4e342e',
              fontWeight: 'bold',
              fontSize: '14px',
            }}
          >
            {index + 1}
          </div>
          <div
            style={{
              cursor: 'grab',
              color: '#bdbdbd',
              padding: '4px',
            }}
          >
            <GripVertical size={20} />
          </div>
          <div style={{ fontSize: '10px', color: '#bdbdbd', textAlign: 'center' }}>
            {Math.round(progressPercentage)}%
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div
            onClick={handlePhotoClick}
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '2px dashed #ffb74d',
              background: step.photo ? 'transparent' : '#fff3e0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {step.photo ? (
              <img
                src={step.photo}
                alt={`步骤${index + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ textAlign: 'center', color: '#ffb74d' }}>
                <Camera size={32} />
                <div style={{ fontSize: '12px', marginTop: '4px' }}>点击上传</div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>

          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ position: 'relative' }}>
              <textarea
                value={step.description}
                onChange={handleDescriptionChange}
                placeholder="请输入步骤描述..."
                maxLength={200}
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '12px',
                  border: `2px solid ${step.description.length > 150 ? '#e53935' : '#e0e0e0'}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  resize: 'vertical',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  fontFamily: 'inherit',
                }}
                onFocus={() => {}}
              />
              <div
                style={{
                  position: 'absolute',
                  right: '8px',
                  bottom: '8px',
                  fontSize: '11px',
                  color: step.description.length > 150 ? '#e53935' : '#bdbdbd',
                }}
              >
                {step.description.length}/200
              </div>
            </div>

            <div style={{ display: 'flex', gap: '24px', marginTop: '12px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '14px', color: '#4e342e' }}>时长:</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={step.duration}
                  onChange={handleDurationChange}
                  style={{
                    width: '60px',
                    padding: '6px 8px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: '14px', color: '#757575' }}>分钟</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <label style={{ fontSize: '14px', color: '#4e342e', marginRight: '4px' }}>评分:</label>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={20}
                    fill={star <= step.rating ? '#ffa000' : 'none'}
                    color={star <= step.rating ? '#ffa000' : '#bdbdbd'}
                    style={{ cursor: 'pointer', transition: 'transform 0.1s' }}
                    onClick={() => handleRatingChange(star)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onDelete}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#bdbdbd',
            padding: '4px',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#e53935')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#bdbdbd')}
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};
