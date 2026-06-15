import React, { useState, useEffect, useRef } from 'react';
import { weatherMap, type WeatherType } from '../utils/weatherService';
import type { LogData } from '../types';

export type { LogData };

interface LogEntryProps {
  log?: LogData | null;
  pointName?: string;
  defaultWeather?: WeatherType;
  onSave: (formData: FormData) => void;
  onClose: () => void;
}

const LogEntry: React.FC<LogEntryProps> = ({ log, pointName, defaultWeather, onSave, onClose }) => {
  const [content, setContent] = useState('');
  const [weather, setWeather] = useState<WeatherType>('sunny');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (log) {
      setContent(log.content || '');
      setWeather((log.weather as WeatherType) || 'sunny');
      setImagePreview(log.imagePath || null);
      setImageFile(null);
    } else {
      setContent('');
      setWeather(defaultWeather || 'sunny');
      setImagePreview(null);
      setImageFile(null);
    }
  }, [log, defaultWeather]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
        alert('请上传 jpg 或 png 格式的图片');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setImageFile(file);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = () => {
    if (!content.trim()) {
      alert('请输入日志内容');
      return;
    }
    const formData = new FormData();
    formData.append('content', content);
    formData.append('weather', weather);
    if (imageFile) {
      formData.append('image', imageFile);
    }
    if (log) {
      formData.append('id', String(log.id));
    }
    onSave(formData);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      <div
        style={{
          width: 400,
          backgroundColor: '#fafafa',
          borderRadius: 12,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          padding: 24,
          animation: 'slideUp 0.3s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginBottom: 16, fontSize: 18, color: '#333' }}>
          {log ? '编辑日志' : '添加日志'}
          {pointName && <span style={{ fontSize: 14, color: '#666', marginLeft: 8 }}>- {pointName}</span>}
        </h3>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#555' }}>
            日志内容
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="记录你的探险故事..."
            style={{
              width: '100%',
              height: 120,
              padding: 12,
              border: '1px solid #ddd',
              borderRadius: 8,
              fontSize: 15,
              resize: 'none',
              outline: 'none',
              transition: 'border-color 0.2s ease',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#2196f3')}
            onBlur={(e) => (e.target.style.borderColor = '#ddd')}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#555' }}>
            天气
          </label>
          <select
            value={weather}
            onChange={(e) => setWeather(e.target.value as WeatherType)}
            style={{
              width: '100%',
              padding: 10,
              border: '1px solid #ddd',
              borderRadius: 8,
              fontSize: 15,
              outline: 'none',
              backgroundColor: 'white',
              cursor: 'pointer',
              transition: 'border-color 0.2s ease',
              boxSizing: 'border-box',
            }}
          >
            {Object.entries(weatherMap).map(([key, value]) => (
              <option key={key} value={key}>
                {value.icon} {value.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#555' }}>
            图片
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {imagePreview && (
              <img
                src={imagePreview}
                alt="预览"
                style={{
                  width: 80,
                  height: 80,
                  objectFit: 'cover',
                  borderRadius: 4,
                }}
              />
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '10px 16px',
                backgroundColor: '#2196f3',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 14,
                transition: 'background-color 0.2s ease',
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1976d2')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#2196f3')}
            >
              上传图片
            </button>
            {imagePreview && (
              <button
                onClick={handleRemoveImage}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#95a5a6',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 14,
                  transition: 'background-color 0.2s ease',
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#7f8c8d')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#95a5a6')}
              >
                移除
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#95a5a6',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
              transition: 'background-color 0.2s ease',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#7f8c8d')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#95a5a6')}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            style={{
              padding: '10px 20px',
              backgroundColor: '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
              transition: 'background-color 0.2s ease',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1976d2')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#2196f3')}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogEntry;
