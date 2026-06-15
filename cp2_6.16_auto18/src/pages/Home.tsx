import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Search, Leaf, Camera, Loader2 } from 'lucide-react';
import PlantCard from '../components/PlantCard';
import Timeline from '../components/Timeline';
import type { IdentifyResult, Reminder } from '../types';
import { api } from '../utils/api';

export default function Home() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [results, setResults] = useState<IdentifyResult[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoadingReminders, setIsLoadingReminders] = useState(true);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    setIsLoadingReminders(true);
    try {
      const response = await api.reminders.getAll();
      if (response.success && response.reminders) {
        setReminders(response.reminders);
      }
    } catch (error) {
      console.error('Load reminders error:', error);
    } finally {
      setIsLoadingReminders(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      handleImageUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleImageUpload(files[0]);
    }
  };

  const handleImageUpload = async (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    setIsIdentifying(true);
    try {
      const response = await api.identify.byImage(file, description);
      if (response.success && response.results) {
        setResults(response.results);
        if (response.uploadedImage) {
          setUploadedImage(response.uploadedImage);
        }
      }
    } catch (error) {
      console.error('Identify error:', error);
    } finally {
      setIsIdentifying(false);
    }
  };

  const handleTextIdentify = async () => {
    if (!description.trim()) return;

    setIsIdentifying(true);
    try {
      const response = await api.identify.byDescription(description);
      if (response.success && response.results) {
        setResults(response.results);
      }
    } catch (error) {
      console.error('Identify error:', error);
    } finally {
      setIsIdentifying(false);
    }
  };

  const handleResultSelect = async (result: IdentifyResult) => {
    try {
      const response = await api.plants.create({
        plantId: result.id,
        location: '客厅',
      });
      if (response.success && response.plant) {
        navigate(`/plant/${response.plant.id}`);
      }
    } catch (error) {
      console.error('Add plant error:', error);
    }
  };

  const handleClear = () => {
    setDescription('');
    setResults([]);
    setUploadedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="page-container">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          gap: '32px',
          marginBottom: '32px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 700,
              color: 'var(--color-primary)',
              marginBottom: '8px',
            }}
          >
            智能植物识别
          </h1>
          <p
            style={{
              color: 'var(--color-text-secondary)',
              marginBottom: '24px',
            }}
          >
            上传植物照片或描述植物特征，AI将为您识别并提供个性化养护指南
          </p>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="ripple-button"
            style={{
              border: '2px dashed',
              borderColor: isDragging
                ? 'var(--color-secondary)'
                : 'var(--color-border)',
              borderRadius: '16px',
              padding: '40px',
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: isDragging
                ? 'rgba(165, 214, 167, 0.1)'
                : '#ffffff',
              transition: 'all var(--transition-normal)',
              marginBottom: '16px',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            {uploadedImage ? (
              <div>
                <img
                  src={uploadedImage}
                  alt="上传的图片"
                  style={{
                    maxHeight: '200px',
                    borderRadius: '8px',
                    marginBottom: '12px',
                  }}
                />
                <p style={{ color: 'var(--color-text-secondary)' }}>
                  点击或拖拽更换图片
                </p>
              </div>
            ) : (
              <>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(165, 214, 167, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}
                >
                  <Camera
                    size={32}
                    style={{ color: 'var(--color-secondary)' }}
                  />
                </div>
                <p
                  style={{
                    fontSize: '16px',
                    fontWeight: 500,
                    marginBottom: '8px',
                  }}
                >
                  点击或拖拽上传植物照片
                </p>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                  支持 JPG、PNG、WebP 格式，最大 10MB
                </p>
              </>
            )}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
              }}
            >
              <div style={{ flex: 1, position: 'relative' }}>
                <Search
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-secondary)',
                  }}
                />
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="或输入植物特征描述，如：心形叶片、藤蔓、开白色花..."
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 40px',
                    borderRadius: '12px',
                    border: '1px solid var(--color-border)',
                    fontSize: '14px',
                    backgroundColor: '#ffffff',
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleTextIdentify();
                    }
                  }}
                />
              </div>
              <button
                className="ripple-button"
                onClick={handleTextIdentify}
                disabled={isIdentifying || !description.trim()}
                style={{
                  padding: '12px 24px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--color-primary)',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  opacity: isIdentifying || !description.trim() ? 0.6 : 1,
                }}
              >
                {isIdentifying ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Search size={18} />
                )}
                识别
              </button>
            </div>
          </div>

          {(results.length > 0 || uploadedImage) && (
            <button
              onClick={handleClear}
              style={{
                color: 'var(--color-text-secondary)',
                fontSize: '14px',
                textDecoration: 'underline',
                marginBottom: '16px',
              }}
            >
              清除结果
            </button>
          )}

          {isIdentifying && (
            <div
              style={{
                textAlign: 'center',
                padding: '40px',
              }}
            >
              <Loader2
                size={40}
                className="animate-spin"
                style={{ color: 'var(--color-secondary)', marginBottom: '16px' }}
              />
              <p style={{ color: 'var(--color-text-secondary)' }}>
                正在识别植物...
              </p>
            </div>
          )}

          {!isIdentifying && results.length > 0 && (
            <div>
              <h2
                style={{
                  fontSize: '20px',
                  fontWeight: 600,
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Leaf size={20} style={{ color: 'var(--color-secondary)' }} />
                识别结果
              </h2>
              <div
                style={{
                  display: 'flex',
                  gap: '16px',
                  flexWrap: 'wrap',
                }}
              >
                {results.map((result) => (
                  <PlantCard
                    key={result.id}
                    plant={result}
                    showConfidence
                    onClick={() => handleResultSelect(result)}
                  />
                ))}
              </div>
              <p
                style={{
                  fontSize: '12px',
                  color: 'var(--color-text-secondary)',
                  marginTop: '12px',
                }}
              >
                点击卡片将植物添加到您的植物库并查看详细养护指南
              </p>
            </div>
          )}
        </div>

        <div>
          <h2
            style={{
              fontSize: '20px',
              fontWeight: 600,
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Leaf size={20} style={{ color: 'var(--color-secondary)' }} />
            本周养护提醒
          </h2>
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {isLoadingReminders ? (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  padding: '40px',
                }}
              >
                <Loader2
                  size={24}
                  className="animate-spin"
                  style={{ color: 'var(--color-secondary)' }}
                />
              </div>
            ) : (
              <Timeline reminders={reminders} onUpdate={loadReminders} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
