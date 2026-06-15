import React, { useState, useMemo, useEffect, useRef } from 'react';
import { SVG } from '@svgdotjs/svg.js';
import { CANVAS_SIZE, downloadSVG, copyToClipboard } from '../utils/stampProcessor';

interface StampPreviewProps {
  svgContent: string;
  scale: number;
  onScaleChange: (scale: number) => void;
}

const StampPreview: React.FC<StampPreviewProps> = ({ svgContent, scale, onScaleChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState(0);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [fadeKey, setFadeKey] = useState(0);

  useEffect(() => {
    setFadeKey(k => k + 1);
  }, [svgContent]);

  const renderSVG = useMemo(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = '';

    const svgString = svgContent.replace(
      /<\?xml[^?]*\?>\s*/,
      ''
    ).replace(
      /<svg([^>]*)>/,
      `<svg$1 preserveAspectRatio="xMidYMid meet">`
    );

    const wrapper = document.createElement('div');
    wrapper.innerHTML = svgString.trim();
    const svgElement = wrapper.firstElementChild as SVGElement;

    if (svgElement) {
      svgElement.setAttribute(
        'style',
        `transform: rotate(${rotation}deg); transition: transform 0.3s ease; max-width: 100%; max-height: 100%; display: block; margin: 0 auto;`
      );
      svgElement.setAttribute('width', `${CANVAS_SIZE * (scale / 100)}px`);
      svgElement.setAttribute('height', `${CANVAS_SIZE * (scale / 100)}px`);
      container.appendChild(svgElement);
    }
  }, [svgContent, scale, rotation]);

  useEffect(() => {
    renderSVG;
  }, [renderSVG]);

  const handleDownloadSVG = () => {
    downloadSVG(svgContent, `stamp_${Date.now()}.svg`);
  };

  const handleCopySVG = async () => {
    const success = await copyToClipboard(svgContent);
    setCopyStatus(success ? 'success' : 'error');
    setTimeout(() => setCopyStatus('idle'), 2000);
  };

  const handleRotateLeft = () => {
    setRotation(r => (r - 90) % 360);
  };

  const handleRotateRight = () => {
    setRotation(r => (r + 90) % 360);
  };

  return (
    <div style={styles.container} className="fade-in" key={fadeKey}>
      <h3 style={styles.title}>印章预览</h3>

      <div style={styles.previewBox}>
        <div
          ref={containerRef}
          style={{
            ...styles.svgContainer,
            minHeight: Math.max(200, CANVAS_SIZE * (scale / 100) * 0.5),
          }}
        />
      </div>

      <div className="section-divider" />

      <div style={styles.controlSection}>
        <label style={styles.label}>
          缩放比例: <span style={styles.value}>{scale}%</span>
        </label>
        <input
          type="range"
          min="50"
          max="200"
          value={scale}
          onChange={e => onScaleChange(Number(e.target.value))}
          style={styles.slider}
        />
        <div style={styles.sliderLabels}>
          <span>50%</span>
          <span>200%</span>
        </div>
      </div>

      <div style={styles.controlSection}>
        <label style={styles.label}>旋转角度</label>
        <div style={styles.rotateButtons}>
          <button style={styles.smallButton} onClick={handleRotateLeft}>
            ↺ 逆时针
          </button>
          <span style={styles.rotationValue}>{rotation}°</span>
          <button style={styles.smallButton} onClick={handleRotateRight}>
            顺时针 ↻
          </button>
        </div>
      </div>

      <div className="section-divider" />

      <div style={styles.buttonGroup}>
        <button style={styles.primaryButton} onClick={handleDownloadSVG}>
          导出 SVG
        </button>
        <button
          style={{
            ...styles.secondaryButton,
            ...(copyStatus === 'success' ? styles.successButton : {}),
            ...(copyStatus === 'error' ? styles.errorButton : {}),
          }}
          onClick={handleCopySVG}
        >
          {copyStatus === 'success' ? '✓ 已复制' : copyStatus === 'error' ? '复制失败' : '复制SVG代码'}
        </button>
      </div>

      <div style={styles.infoBox}>
        <p style={styles.infoText}>
          💡 提示：导出的SVG为可缩放矢量格式，可用于任意尺寸而不失真
        </p>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    background: '#FFFFFF',
    borderRadius: 8,
    padding: 20,
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    color: '#3D2914',
    marginBottom: 16,
    fontFamily: "'Ma Shan Zheng', cursive",
  },
  previewBox: {
    background: '#FAF4E8',
    borderRadius: 8,
    padding: 20,
    border: '2px dashed #D4C4A8',
    marginBottom: 8,
  },
  svgContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  controlSection: {
    marginBottom: 16,
  },
  label: {
    display: 'block',
    fontSize: 14,
    color: '#5D4E3A',
    marginBottom: 8,
    fontWeight: 500,
  },
  value: {
    color: '#C0392B',
    fontWeight: 600,
  },
  slider: {
    width: '100%',
    marginBottom: 4,
  },
  sliderLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 11,
    color: '#8B7355',
  },
  rotateButtons: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rotationValue: {
    fontSize: 14,
    color: '#C0392B',
    fontWeight: 600,
    minWidth: 50,
    textAlign: 'center',
  },
  smallButton: {
    flex: 1,
    padding: '8px 12px',
    fontSize: 13,
    background: '#F5E6C8',
    border: '1px solid #D4C4A8',
    borderRadius: 6,
    color: '#5D4E3A',
    fontWeight: 500,
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginTop: 4,
  },
  primaryButton: {
    padding: '12px 20px',
    fontSize: 15,
    background: 'linear-gradient(135deg, #C0392B, #922B21)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 8,
    fontWeight: 600,
    boxShadow: '0 2px 8px rgba(192,57,43,0.3)',
  },
  secondaryButton: {
    padding: '12px 20px',
    fontSize: 15,
    background: '#FFFFFF',
    color: '#3D2914',
    border: '2px solid #C0392B',
    borderRadius: 8,
    fontWeight: 600,
  },
  successButton: {
    background: '#27AE60',
    borderColor: '#27AE60',
    color: '#FFFFFF',
  },
  errorButton: {
    background: '#E74C3C',
    borderColor: '#E74C3C',
    color: '#FFFFFF',
  },
  infoBox: {
    marginTop: 16,
    padding: 12,
    background: '#FFF9ED',
    borderRadius: 6,
    borderLeft: '3px solid #D4AC0D',
  },
  infoText: {
    fontSize: 12,
    color: '#7D6608',
    lineHeight: 1.5,
  },
};

export default StampPreview;
