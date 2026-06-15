import React, { useState, useCallback, useRef } from 'react';
import { Palette, Upload, Copy, Check } from 'lucide-react';
import type { ColorToken } from '../types';
import { MAX_IMAGE_SIZE } from '../types';
import { copyToClipboard, rgbToHex } from '../utils/colorUtils';

interface ColorExtractorProps {
  colors: ColorToken[];
  onColorsExtracted: (colors: ColorToken[], imageUrl: string) => void;
}

interface ExtractedColor {
  rgb: [number, number, number];
  pixelCount: number;
}

const ColorExtractor: React.FC<ColorExtractorProps> = ({ colors, onColorsExtracted }) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractColors = useCallback(
    (imageData: ImageData, maxColors = 8): ColorToken[] => {
      const pixels = imageData.data;
      const colorMap = new Map<string, ExtractedColor>();

      for (let i = 0; i < pixels.length; i += 16) {
        const r = Math.round(pixels[i] / 16) * 16;
        const g = Math.round(pixels[i + 1] / 16) * 16;
        const b = Math.round(pixels[i + 2] / 16) * 16;
        const key = `${r},${g},${b}`;
        const existing = colorMap.get(key);
        if (existing) {
          existing.pixelCount++;
        } else {
          colorMap.set(key, { rgb: [r, g, b] as [number, number, number], pixelCount: 1 });
        }
      }

      const sorted = Array.from(colorMap.values()).sort(
        (a, b) => b.pixelCount - a.pixelCount,
      );
      const totalPixels = sorted.reduce((sum, c) => sum + c.pixelCount, 0);

      return sorted.slice(0, maxColors).map((c) => ({
        hex: rgbToHex(c.rgb[0], c.rgb[1], c.rgb[2]),
        percentage: Math.round((c.pixelCount / totalPixels) * 100),
        rgb: c.rgb,
      }));
    },
    [],
  );

  const processImage = useCallback(
    (file: File) => {
      if (file.size > MAX_IMAGE_SIZE) {
        alert('图片大小不能超过5MB');
        return;
      }

      setIsExtracting(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 200;
          const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
          canvas.width = Math.floor(img.width * scale);
          canvas.height = Math.floor(img.height * scale);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const extracted = extractColors(imageData, 8);
            onColorsExtracted(extracted, imageUrl);
          }
          setIsExtracting(false);
        };
        img.onerror = () => setIsExtracting(false);
        img.src = imageUrl;
      };
      reader.readAsDataURL(file);
    },
    [extractColors, onColorsExtracted],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processImage(file);
    }
  };

  const handleCopyColor = async (hex: string, index: number) => {
    await copyToClipboard(hex);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  return (
    <div className="color-extractor">
      <div
        className={`upload-area ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload size={32} className="upload-icon" />
        <p className="upload-text">
          {isExtracting ? '正在提取颜色...' : '点击或拖拽上传设计稿 (PNG/JPG)'}
        </p>
        <p className="upload-hint">最大 5MB</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>

      {colors.length > 0 && (
        <div className="color-palette">
          {colors.map((color, index) => (
            <div key={color.hex + index} className="color-card">
              <button
                className="color-swatch"
                style={{ backgroundColor: color.hex }}
                onClick={() => handleCopyColor(color.hex, index)}
                title="点击复制颜色值"
              >
                {copiedIndex === index ? (
                  <Check size={18} className="copy-icon" />
                ) : (
                  <Copy size={16} className="copy-icon" />
                )}
              </button>
              <div className="color-info">
                <span className="color-hex">{color.hex}</span>
                <span className="color-percentage">{color.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {colors.length === 0 && !isExtracting && (
        <div className="empty-state">
          <Palette size={40} className="empty-icon" />
          <p>上传图片后自动提取主色调</p>
        </div>
      )}
    </div>
  );
};

export default ColorExtractor;
