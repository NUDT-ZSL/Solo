import { useEffect, useRef } from 'react';
import { Brand } from '../types';

interface PreviewPanelProps {
  brand: Brand | null;
}

function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace('#', '');
  const fullHex = cleanHex.length === 3
    ? cleanHex.split('').map(c => c + c).join('')
    : cleanHex;
  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function PreviewPanel({ brand }: PreviewPanelProps) {
  const styleRef = useRef<HTMLStyleElement | null>(null);

  useEffect(() => {
    if (!brand) return;

    let styleEl = styleRef.current;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'preview-dynamic-styles';
      document.head.appendChild(styleEl);
      styleRef.current = styleEl;
    }

    const spacing = brand.spacingUnit;
    const tagBg = hexToRgba(brand.secondaryColor, 0.15);
    const css = `
      :root {
        --primary-color: ${brand.primaryColor};
        --secondary-color: ${brand.secondaryColor};
        --heading-font: '${brand.headingFont}', serif;
        --body-font: '${brand.bodyFont}', sans-serif;
        --spacing-unit: ${spacing}px;
        --spacing-xs: ${spacing * 0.5}px;
        --spacing-sm: ${spacing}px;
        --spacing-md: ${spacing * 2}px;
        --spacing-lg: ${spacing * 3}px;
        --spacing-xl: ${spacing * 4}px;
        --tag-bg: ${tagBg};
      }
    `;
    styleEl.textContent = css;
  }, [brand]);

  if (!brand) {
    return (
      <div className="preview-panel">
        <div className="preview-header">
          <h2 className="preview-title">实时预览</h2>
        </div>
        <div className="preview-area">
          <div className="skeleton skeleton-preview-large" />
        </div>
      </div>
    );
  }

  const tagBg = hexToRgba(brand.secondaryColor, 0.15);

  return (
    <div className="preview-panel">
      <div className="preview-header">
        <h2 className="preview-title">实时预览</h2>
        <span className="preview-subtitle">{brand.name}</span>
      </div>

      <div className="preview-area">
        <div className="preview-grid">
          <div className="preview-component-group">
            <div className="component-label">按钮组件</div>
            <div className="button-row">
              <button
                className="preview-btn-primary"
                style={{
                  backgroundColor: 'var(--primary-color)',
                  color: '#ffffff',
                  borderRadius: '8px',
                  padding: 'var(--spacing-sm) var(--spacing-md)',
                  fontFamily: 'var(--body-font)',
                  fontSize: '16px',
                  fontWeight: 500,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                主要按钮
              </button>
              <button
                className="preview-btn-secondary"
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--primary-color)',
                  border: '2px solid var(--primary-color)',
                  borderRadius: '8px',
                  padding: 'calc(var(--spacing-sm) - 2px) calc(var(--spacing-md) - 2px)',
                  fontFamily: 'var(--body-font)',
                  fontSize: '16px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                次要按钮
              </button>
            </div>
          </div>

          <div className="preview-component-group">
            <div className="component-label">标题与文本</div>
            <div className="typography-block">
              <h3
                className="preview-heading"
                style={{
                  fontFamily: 'var(--heading-font)',
                  fontSize: '28px',
                  fontWeight: 700,
                  color: 'var(--primary-color)',
                  lineHeight: 1.3,
                  margin: 0,
                  marginBottom: 'var(--spacing-md)',
                  transition: 'all 0.3s ease'
                }}
              >
                品牌设计系统标题
              </h3>
              <p
                className="preview-paragraph"
                style={{
                  fontFamily: 'var(--body-font)',
                  fontSize: '16px',
                  fontWeight: 400,
                  lineHeight: 1.6,
                  color: '#334155',
                  margin: 0,
                  marginBottom: 'var(--spacing-md)',
                  transition: 'all 0.3s ease'
                }}
              >
                这是一段预览用的段落文本，用于展示正文字体的样式效果。
                良好的排版能够提升品牌信息传达的效率，让用户在阅读时获得舒适的体验。
                我们使用行高 1.6 来确保文本的可读性。
              </p>
            </div>
          </div>

          <div className="preview-component-group">
            <div className="component-label">卡片与标签</div>
            <div
              className="preview-card"
              style={{
                backgroundColor: '#ffffff',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                borderRadius: '12px',
                padding: 'var(--spacing-lg)',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                <span
                  className="preview-tag"
                  style={{
                    display: 'inline-block',
                    backgroundColor: tagBg,
                    color: 'var(--secondary-color)',
                    fontFamily: 'var(--body-font)',
                    fontSize: '12px',
                    fontWeight: 500,
                    borderRadius: '4px',
                    padding: 'var(--spacing-xs) var(--spacing-sm)',
                    lineHeight: 1,
                    transition: 'all 0.3s ease'
                  }}
                >
                  设计
                </span>
                <span
                  className="preview-tag"
                  style={{
                    display: 'inline-block',
                    backgroundColor: tagBg,
                    color: 'var(--secondary-color)',
                    fontFamily: 'var(--body-font)',
                    fontSize: '12px',
                    fontWeight: 500,
                    borderRadius: '4px',
                    padding: 'var(--spacing-xs) var(--spacing-sm)',
                    lineHeight: 1,
                    transition: 'all 0.3s ease'
                  }}
                >
                  品牌
                </span>
              </div>
              <h4
                style={{
                  fontFamily: 'var(--heading-font)',
                  fontSize: '20px',
                  fontWeight: 700,
                  color: 'var(--primary-color)',
                  margin: 0,
                  marginBottom: 'var(--spacing-sm)',
                  transition: 'all 0.3s ease'
                }}
              >
                品牌卡片标题
              </h4>
              <p
                style={{
                  fontFamily: 'var(--body-font)',
                  fontSize: '14px',
                  lineHeight: 1.6,
                  color: '#334155',
                  margin: 0,
                  marginBottom: 'var(--spacing-md)',
                  transition: 'all 0.3s ease'
                }}
              >
                卡片组件可用于展示产品特性、服务内容等信息。
                配合阴影和圆角设计，创造出层次感和现代感。
              </p>
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                <button
                  style={{
                    backgroundColor: 'var(--primary-color)',
                    color: '#ffffff',
                    borderRadius: '8px',
                    padding: 'calc(var(--spacing-xs) * 1.5) var(--spacing-md)',
                    fontFamily: 'var(--body-font)',
                    fontSize: '14px',
                    fontWeight: 500,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  了解更多
                </button>
                <button
                  style={{
                    backgroundColor: 'transparent',
                    color: 'var(--primary-color)',
                    border: '2px solid var(--primary-color)',
                    borderRadius: '8px',
                    padding: 'calc(var(--spacing-xs) * 1.5 - 2px) calc(var(--spacing-md) - 2px)',
                    fontFamily: 'var(--body-font)',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  取消
                </button>
              </div>
            </div>
          </div>

          <div className="preview-component-group">
            <div className="component-label">色板参考</div>
            <div className="swatch-row">
              <div className="swatch-item">
                <div
                  className="swatch-color"
                  style={{ backgroundColor: 'var(--primary-color)' }}
                />
                <div className="swatch-info">
                  <span className="swatch-name">主色</span>
                  <span className="swatch-value">{brand.primaryColor}</span>
                </div>
              </div>
              <div className="swatch-item">
                <div
                  className="swatch-color"
                  style={{ backgroundColor: 'var(--secondary-color)' }}
                />
                <div className="swatch-info">
                  <span className="swatch-name">辅色</span>
                  <span className="swatch-value">{brand.secondaryColor}</span>
                </div>
              </div>
            </div>
            <div className="spacing-demo">
              <div className="component-label">间距示例</div>
              <div className="spacing-bar-container">
                <div className="spacing-label">xs</div>
                <div className="spacing-bar" style={{ width: `${brand.spacingUnit * 0.5}px` }} />
                <div className="spacing-value">{brand.spacingUnit * 0.5}px</div>
              </div>
              <div className="spacing-bar-container">
                <div className="spacing-label">sm</div>
                <div className="spacing-bar" style={{ width: `${brand.spacingUnit}px` }} />
                <div className="spacing-value">{brand.spacingUnit}px</div>
              </div>
              <div className="spacing-bar-container">
                <div className="spacing-label">md</div>
                <div className="spacing-bar" style={{ width: `${brand.spacingUnit * 2}px` }} />
                <div className="spacing-value">{brand.spacingUnit * 2}px</div>
              </div>
              <div className="spacing-bar-container">
                <div className="spacing-label">lg</div>
                <div className="spacing-bar" style={{ width: `${brand.spacingUnit * 3}px` }} />
                <div className="spacing-value">{brand.spacingUnit * 3}px</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
