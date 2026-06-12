import React, { useState, useRef, useCallback } from 'react';
import ColorCard from './components/ColorCard';
import { ColorItem, extractColorsFromImageElement, shiftHue } from './utils/colorExtractor';

interface ModalState {
  visible: boolean;
  title: string;
  content: string;
  isDownload?: boolean;
  downloadUrl?: string;
  downloadName?: string;
}

const App: React.FC = () => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [colors, setColors] = useState<ColorItem[]>([]);
  const [locked, setLocked] = useState<boolean[]>([false, false, false, false, false]);
  const [hueShifts, setHueShifts] = useState<number[]>([0, 0, 0, 0, 0]);
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [modal, setModal] = useState<ModalState>({
    visible: false,
    title: '',
    content: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.match('image/(jpeg|png)')) {
      showModal('提示', '请上传 JPG 或 PNG 格式的图片');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showModal('提示', '图片大小不能超过 5MB');
      return;
    }

    setImageFile(file);
    setColors([]);
    setLocked([false, false, false, false, false]);
    setHueShifts([0, 0, 0, 0, 0]);

    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const showModal = (title: string, content: string, isDownload = false, downloadUrl?: string, downloadName?: string) => {
    setModal({ visible: true, title, content, isDownload, downloadUrl, downloadName });
  };

  const closeModal = () => {
    setModal(prev => ({ ...prev, visible: false }));
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
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleExtract = () => {
    if (!imgRef.current || !imageSrc) return;

    setIsExtracting(true);

    const img = imgRef.current;
    if (img.complete) {
      doExtract(img);
    } else {
      img.onload = () => doExtract(img);
    }
  };

  const doExtract = (img: HTMLImageElement) => {
    try {
      const result = extractColorsFromImageElement(img, 5);
      setColors(result);
    } catch (error) {
      console.error('提取颜色失败:', error);
      showModal('错误', '颜色提取失败，请重试');
    } finally {
      setTimeout(() => setIsExtracting(false), 300);
    }
  };

  const handleClear = () => {
    setImageSrc(null);
    setImageFile(null);
    setColors([]);
    setLocked([false, false, false, false, false]);
    setHueShifts([0, 0, 0, 0, 0]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleLockToggle = (index: number) => {
    setLocked(prev => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const handleHueShift = (index: number, value: number) => {
    if (locked[index]) return;
    setHueShifts(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const getDisplayHex = (index: number): string => {
    if (!colors[index]) return '#000000';
    return shiftHue(colors[index].hex, hueShifts[index]).toUpperCase();
  };

  const exportCSS = () => {
    const lines = [':root {'];
    for (let i = 0; i < colors.length; i++) {
      lines.push(`  --color-primary-${i + 1}: ${getDisplayHex(i)};`);
    }
    lines.push('}');
    const content = lines.join('\n');
    
    navigator.clipboard.writeText(content);
    showModal('导出成功', 'CSS 自定义属性已复制到剪贴板');
  };

  const exportTailwind = () => {
    const content = `// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          1: '${getDisplayHex(0)}',
          2: '${getDisplayHex(1)}',
          3: '${getDisplayHex(2)}',
          4: '${getDisplayHex(3)}',
          5: '${getDisplayHex(4)}',
        },
      },
    },
  },
}`;
    
    navigator.clipboard.writeText(content);
    showModal('导出成功', 'Tailwind 配置已复制到剪贴板');
  };

  const exportSVG = () => {
    const rectWidth = 200;
    const rectHeight = 40;
    const gap = 16;
    const startY = 20;
    const totalHeight = startY * 2 + 5 * (rectHeight + gap) - gap;

    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="${totalHeight}" viewBox="0 0 240 ${totalHeight}">`;

    for (let i = 0; i < colors.length; i++) {
      const y = startY + i * (rectHeight + gap);
      const color = getDisplayHex(i);
      const textY = y + rectHeight / 2 + 5;
      
      svgContent += `
  <rect x="20" y="${y}" width="${rectWidth}" height="${rectHeight}" rx="6" fill="${color}"/>
  <text x="28" y="${textY}" font-family="Arial, sans-serif" font-size="12" fill="${isLightColor(color) ? '#222' : '#fff'}" font-weight="bold">${color}</text>`;
    }

    svgContent += '\n</svg>';

    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    showModal('导出成功', 'SVG 色板已生成，点击下载按钮保存', true, url, 'color-palette.svg');
  };

  const isLightColor = (hex: string): boolean => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 155;
  };

  const hasColors = colors.length > 0;

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f5f5fa',
        padding: '40px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <h1
        style={{
          fontSize: '32px',
          fontWeight: 700,
          color: '#222',
          marginBottom: '8px',
          background: 'linear-gradient(135deg, #6C63FF 0%, #8B83FF 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        CodeCanvas
      </h1>
      <p style={{ color: '#888', marginBottom: '32px', fontSize: '14px' }}>
        上传图片，一键提取主色调
      </p>

      {hasColors && (
        <div
          style={{
            width: '100%',
            maxWidth: '720px',
            padding: '24px',
            marginBottom: '32px',
            backgroundColor: 'rgba(240, 240, 245, 0.6)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            borderRadius: '16px',
            display: 'flex',
            justifyContent: 'center',
            gap: '16px',
            flexWrap: 'wrap',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          {colors.map((color, index) => (
            <ColorCard
              key={index}
              hex={color.hex}
              percentage={color.percentage}
              locked={locked[index]}
              hueShift={hueShifts[index]}
              index={index}
              onLockToggle={() => handleLockToggle(index)}
              onHueShift={(value) => handleHueShift(index, value)}
            />
          ))}
        </div>
      )}

      {!hasColors && (
        <div
          style={{
            width: '100%',
            maxWidth: '500px',
            marginTop: '20px',
          }}
        >
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${isDragging ? '#6C63FF' : '#ccc'}`,
              borderRadius: '16px',
              padding: '48px 32px',
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: isDragging ? 'rgba(108, 99, 255, 0.05)' : '#fff',
              transition: 'all 0.2s ease',
              transform: isDragging ? 'scale(1.02)' : 'scale(1)',
            }}
          >
            <div
              style={{
                fontSize: '48px',
                marginBottom: '16px',
                animation: isDragging ? 'scaleIn 0.3s ease' : undefined,
              }}
            >
              🖼️
            </div>
            <p style={{ fontSize: '16px', color: '#222', marginBottom: '8px', fontWeight: 500 }}>
              点击或拖拽上传图片
            </p>
            <p style={{ fontSize: '13px', color: '#999' }}>
              支持 JPG / PNG 格式，不超过 5MB
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleInputChange}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {imageSrc && !hasColors && (
        <div
          style={{
            marginTop: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            animation: 'fadeInUp 0.4s ease',
          }}
        >
          <div
            style={{
              maxWidth: '400px',
              width: '100%',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
            }}
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="预览"
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleExtract}
              disabled={isExtracting}
              style={{
                padding: '12px 32px',
                backgroundColor: '#6C63FF',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: 500,
                cursor: isExtracting ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: isExtracting ? 0.7 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isExtracting) {
                  e.currentTarget.style.backgroundColor = '#8B83FF';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#6C63FF';
              }}
            >
              {isExtracting ? '提取中...' : '提取主色调'}
            </button>
            <button
              onClick={handleClear}
              style={{
                padding: '12px 32px',
                backgroundColor: '#fff',
                color: '#999',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f5f5f5';
                e.currentTarget.style.color = '#666';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#fff';
                e.currentTarget.style.color = '#999';
              }}
            >
              清空
            </button>
          </div>
        </div>
      )}

      {hasColors && (
        <div
          style={{
            width: '100%',
            maxWidth: '720px',
            marginTop: '8px',
            padding: '24px',
            backgroundColor: '#fff',
            borderRadius: '16px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
            animation: 'fadeInUp 0.4s ease 0.3s both',
          }}
        >
          <h3
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#222',
              marginBottom: '16px',
              textAlign: 'center',
            }}
          >
            导出色板
          </h3>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={exportCSS}
              style={{
                padding: '10px 24px',
                backgroundColor: '#6C63FF',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#8B83FF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#6C63FF';
              }}
            >
              导出 CSS 变量
            </button>
            <button
              onClick={exportTailwind}
              style={{
                padding: '10px 24px',
                backgroundColor: '#6C63FF',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#8B83FF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#6C63FF';
              }}
            >
              导出 Tailwind 配置
            </button>
            <button
              onClick={exportSVG}
              style={{
                padding: '10px 24px',
                backgroundColor: '#6C63FF',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#8B83FF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#6C63FF';
              }}
            >
              导出 SVG 色板
            </button>
          </div>

          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button
              onClick={handleClear}
              style={{
                padding: '8px 20px',
                backgroundColor: 'transparent',
                color: '#999',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#666';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#999';
              }}
            >
              重新上传
            </button>
          </div>
        </div>
      )}

      {modal.visible && (
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
          onClick={closeModal}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '400px',
              width: '90%',
              textAlign: 'center',
              animation: 'scaleIn 0.3s ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>
              {modal.isDownload ? '📥' : '✅'}
            </div>
            <h3
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: '#222',
                marginBottom: '8px',
              }}
            >
              {modal.title}
            </h3>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>
              {modal.content}
            </p>

            {modal.isDownload && modal.downloadUrl && (
              <a
                href={modal.downloadUrl}
                download={modal.downloadName}
                style={{
                  display: 'inline-block',
                  padding: '10px 28px',
                  backgroundColor: '#6C63FF',
                  color: '#fff',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  marginRight: '12px',
                  transition: 'background-color 0.2s ease',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#8B83FF';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#6C63FF';
                }}
              >
                下载文件
              </a>
            )}

            <button
              onClick={closeModal}
              style={{
                padding: '10px 28px',
                backgroundColor: '#f0f0f5',
                color: '#666',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e5e5ea';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f0f0f5';
              }}
            >
              确定
            </button>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .color-card {
            width: calc(50% - 8px) !important;
            max-width: 160px;
          }
        }
        
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #6C63FF;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #6C63FF;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        input[type="range"]:disabled::-webkit-slider-thumb {
          background: #ccc;
          cursor: not-allowed;
        }
        
        input[type="range"]:disabled::-moz-range-thumb {
          background: #ccc;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default App;
