import { useMemo, useState } from 'react';
import { Code, Image, Download, Copy, Check, FileImage } from 'lucide-react';
import type { Palette } from '../types';
import {
  generateCSSGradient,
  copyToClipboard,
  exportSVG,
  exportPNG
} from '../utils/colorUtils';

interface ExportPanelProps {
  palette: Palette;
  onShowToast: (msg: string) => void;
}

type ExportFormat = 'css' | 'svg' | 'png';

export function ExportPanel({ palette, onShowToast }: ExportPanelProps) {
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [showCode, setShowCode] = useState(false);

  const cssCode = useMemo(() => generateCSSGradient(palette), [palette]);

  const fullCSSCode = useMemo(() => {
    return `/* PaletteForge - ${palette.name} */
.gradient-bg {
  background: ${cssCode};
  background-repeat: no-repeat;
}`;
  }, [palette.name, cssCode]);

  const handleCopyCSS = async () => {
    setExporting('css');
    const ok = await copyToClipboard(fullCSSCode);
    if (ok) {
      setCopied(true);
      onShowToast('CSS 代码已复制到剪贴板');
      setTimeout(() => setCopied(false), 1500);
    } else {
      onShowToast('复制失败，请手动复制');
    }
    setExporting(null);
  };

  const handleExportSVG = () => {
    setExporting('svg');
    try {
      exportSVG(palette, `${palette.name || 'palette'}.svg`);
      onShowToast('SVG 图片已下载');
    } catch {
      onShowToast('SVG 导出失败');
    }
    setTimeout(() => setExporting(null), 300);
  };

  const handleExportPNG = async () => {
    setExporting('png');
    try {
      await exportPNG(palette, `${palette.name || 'palette'}.png`);
      onShowToast('PNG 图片已下载');
    } catch {
      onShowToast('PNG 导出失败');
    }
    setExporting(null);
  };

  const btnBaseStyle: React.CSSProperties = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid #3a3a4e',
    background: '#1e1e2e',
    color: '#e0e0f0',
    fontSize: 14,
    fontWeight: 500,
    transition: 'all 0.2s ease',
    cursor: exporting ? 'progress' : 'pointer',
    opacity: exporting ? 0.6 : 1
  };

  return (
    <div style={{
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
      height: '100%',
      minHeight: 0
    }}>
      {/* 头部 */}
      <div style={{
        paddingBottom: 16,
        borderBottom: '1px solid #3a3a4e'
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#e0e0f0' }}>导出色板</div>
        <div style={{ fontSize: 12, color: '#8888a0', marginTop: 4 }}>
          支持 CSS、SVG、PNG 三种格式
        </div>
      </div>

      {/* 预览 */}
      <div style={{
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid #3a3a4e',
        background: '#1e1e2e',
        padding: 16
      }}>
        <div style={{
          width: '100%',
          height: 80,
          borderRadius: 10,
          background: cssCode,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          transition: 'background 0.3s ease'
        }} />
        <div style={{
          marginTop: 10,
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 11,
          color: '#8888a0'
        }}>
          <span>{palette.type === 'linear' ? '线性' : '径向'}渐变</span>
          <span>{palette.colorStops.length} 节点</span>
        </div>
      </div>

      {/* 颜色清单 */}
      <div style={{
        padding: 14,
        borderRadius: 10,
        background: '#1e1e2e',
        border: '1px solid #3a3a4e'
      }}>
        <div style={{
          fontSize: 12,
          fontWeight: 600,
          color: '#aaaaca',
          marginBottom: 10
        }}>颜色清单</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...palette.colorStops]
            .sort((a, b) => a.position - b.position)
            .map(stop => (
              <div
                key={stop.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    background: stop.color,
                    border: '1px solid rgba(255,255,255,0.15)',
                    flexShrink: 0
                  }}
                />
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 12,
                    color: '#e0e0f0',
                    letterSpacing: '0.5px',
                    flex: 1
                  }}
                >
                  {stop.color.toUpperCase()}
                </span>
                <span style={{
                  fontSize: 11,
                  color: '#8888a0',
                  fontFamily: 'monospace'
                }}>
                  {(stop.position * 100).toFixed(0)}%
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* 导出按钮组 */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }}>
        <button
          onClick={handleCopyCSS}
          disabled={exporting === 'css'}
          style={btnBaseStyle}
          onMouseEnter={e => {
            if (!exporting) {
              e.currentTarget.style.background = '#3a3a4e';
              e.currentTarget.style.borderColor = '#6366f1';
              e.currentTarget.style.color = '#a5b4fc';
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#1e1e2e';
            e.currentTarget.style.borderColor = '#3a3a4e';
            e.currentTarget.style.color = '#e0e0f0';
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(129,140,248,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#a5b4fc'
          }}>
            {copied ? <Check size={16} /> : <Code size={16} />}
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{copied ? '已复制!' : '复制 CSS 代码'}</div>
            <div style={{ fontSize: 11, color: '#8888a0', marginTop: 2 }}>复制到剪贴板</div>
          </div>
          <div style={{
            padding: '4px 8px', borderRadius: 4,
            background: 'rgba(255,255,255,0.06)',
            fontSize: 10, color: '#aaaaca'
          }}>TEXT</div>
        </button>

        <button
          onClick={handleExportSVG}
          disabled={exporting === 'svg'}
          style={btnBaseStyle}
          onMouseEnter={e => {
            if (!exporting) {
              e.currentTarget.style.background = '#3a3a4e';
              e.currentTarget.style.borderColor = '#6366f1';
              e.currentTarget.style.color = '#a5b4fc';
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#1e1e2e';
            e.currentTarget.style.borderColor = '#3a3a4e';
            e.currentTarget.style.color = '#e0e0f0';
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(72,219,251,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#48dbfb'
          }}>
            <FileImage size={16} />
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>导出 SVG</div>
            <div style={{ fontSize: 11, color: '#8888a0', marginTop: 2 }}>300 × 60 像素 · 矢量</div>
          </div>
          <div style={{
            padding: '4px 8px', borderRadius: 4,
            background: 'rgba(255,255,255,0.06)',
            fontSize: 10, color: '#aaaaca'
          }}>
            <Download size={12} />
          </div>
        </button>

        <button
          onClick={handleExportPNG}
          disabled={exporting === 'png'}
          style={btnBaseStyle}
          onMouseEnter={e => {
            if (!exporting) {
              e.currentTarget.style.background = '#3a3a4e';
              e.currentTarget.style.borderColor = '#6366f1';
              e.currentTarget.style.color = '#a5b4fc';
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#1e1e2e';
            e.currentTarget.style.borderColor = '#3a3a4e';
            e.currentTarget.style.color = '#e0e0f0';
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(254,202,87,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#feca57'
          }}>
            <Image size={16} />
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>导出 PNG</div>
            <div style={{ fontSize: 11, color: '#8888a0', marginTop: 2 }}>600 × 120 像素 · 透明</div>
          </div>
          <div style={{
            padding: '4px 8px', borderRadius: 4,
            background: 'rgba(255,255,255,0.06)',
            fontSize: 10, color: '#aaaaca'
          }}>
            <Download size={12} />
          </div>
        </button>
      </div>

      {/* CSS 代码预览 */}
      <div style={{
        marginTop: 'auto',
        padding: 14,
        borderRadius: 10,
        background: '#1e1e2e',
        border: '1px solid #3a3a4e'
      }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
            cursor: 'pointer'
          }}
          onClick={() => setShowCode(!showCode)}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: '#aaaaca' }}>
            CSS 代码预览
          </div>
          <div style={{ fontSize: 11, color: '#8888a0' }}>
            {showCode ? '收起' : '展开'}
          </div>
        </div>
        <div
          style={{
            maxHeight: showCode ? 200 : 64,
            overflow: 'auto',
            transition: 'max-height 0.3s ease',
            fontFamily: '"Cascadia Code", "Fira Code", Consolas, monospace'
          }}
        >
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              fontSize: 11,
              lineHeight: 1.6,
              color: '#a5b4fc',
              padding: 10,
              borderRadius: 6,
              background: 'rgba(99,102,241,0.08)',
              margin: 0
            }}
          >
{fullCSSCode}
          </pre>
        </div>
      </div>
    </div>
  );
}
