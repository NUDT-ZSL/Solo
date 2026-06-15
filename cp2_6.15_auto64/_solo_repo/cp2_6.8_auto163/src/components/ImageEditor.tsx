import React, { useRef } from 'react';
import { EditParams, CropRatio } from '../types';

interface ImageEditorProps {
  imageUrl: string;
  previewUrl: string | null;
  params: EditParams;
  onChange: (params: EditParams) => void;
  onReset: () => void;
}

const cropRatios: { label: string; value: CropRatio }[] = [
  { label: '原始', value: 'original' },
  { label: '1:1', value: '1:1' },
  { label: '4:3', value: '4:3' },
  { label: '16:9', value: '16:9' },
  { label: '9:16', value: '9:16' },
];

const ImageEditor: React.FC<ImageEditorProps> = ({
  imageUrl,
  previewUrl,
  params,
  onChange,
  onReset,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const getCropBoxStyle = (): React.CSSProperties => {
    if (!containerRef.current || !imgRef.current || params.cropRatio === 'original') {
      return { display: 'none' };
    }

    const container = containerRef.current.getBoundingClientRect();
    const imgEl = imgRef.current;
    const imgRect = imgEl.getBoundingClientRect();

    const displayedWidth = imgRect.width;
    const displayedHeight = imgRect.height;

    let ratioW = 1, ratioH = 1;
    if (params.cropRatio === '1:1') { ratioW = 1; ratioH = 1; }
    else if (params.cropRatio === '4:3') { ratioW = 4; ratioH = 3; }
    else if (params.cropRatio === '16:9') { ratioW = 16; ratioH = 9; }
    else if (params.cropRatio === '9:16') { ratioW = 9; ratioH = 16; }

    let cropW, cropH;
    if (displayedWidth / displayedHeight > ratioW / ratioH) {
      cropH = displayedHeight;
      cropW = cropH * ratioW / ratioH;
    } else {
      cropW = displayedWidth;
      cropH = cropW * ratioH / ratioW;
    }

    const left = (displayedWidth - cropW) / 2 + (imgRect.left - container.left);
    const top = (displayedHeight - cropH) / 2 + (imgRect.top - container.top);

    return {
      display: 'block',
      position: 'absolute',
      left: `${left}px`,
      top: `${top}px`,
      width: `${cropW}px`,
      height: `${cropH}px`,
      border: '2px solid #3B82F6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      boxSizing: 'border-box',
      pointerEvents: 'none',
      transition: 'all 200ms ease',
    };
  };

  const displayUrl = previewUrl || imageUrl;

  return (
    <div className="editor-panel">
      <div className="preview-container" ref={containerRef}>
        <img
          ref={imgRef}
          src={displayUrl}
          alt="编辑预览"
          className="preview-image"
        />
        <div style={getCropBoxStyle()} />
      </div>

      <div className="controls">
        <div className="control-group">
          <label>滤镜强度: {params.filterStrength}</label>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={params.filterStrength}
            onChange={(e) => onChange({ ...params, filterStrength: Number(e.target.value) })}
            className="custom-slider"
          />
        </div>

        <div className="control-group">
          <label>裁剪比例</label>
          <select
            value={params.cropRatio}
            onChange={(e) => onChange({ ...params, cropRatio: e.target.value as CropRatio })}
            className="custom-select"
          >
            {cropRatios.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>亮度: {params.brightness}</label>
          <input
            type="range"
            min="-50"
            max="50"
            step="1"
            value={params.brightness}
            onChange={(e) => onChange({ ...params, brightness: Number(e.target.value) })}
            className="custom-slider"
          />
        </div>

        <div className="control-group">
          <label>对比度: {params.contrast}</label>
          <input
            type="range"
            min="-50"
            max="50"
            step="1"
            value={params.contrast}
            onChange={(e) => onChange({ ...params, contrast: Number(e.target.value) })}
            className="custom-slider"
          />
        </div>

        <button className="reset-btn" onClick={onReset}>
          重置
        </button>
      </div>
    </div>
  );
};

export default ImageEditor;
