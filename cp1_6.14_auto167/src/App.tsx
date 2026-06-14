import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  StyleRegion,
  detectStyles,
  generateFullCSS,
  downloadCSS,
  copyToClipboard
} from './StyleDetector';
import StyleEditor from './StyleEditor';

const MAX_FILE_SIZE = 2 * 1024 * 1024;

interface AppliedStyle {
  backgroundColor?: string;
  gradientText?: string;
  webkitGradientText?: string;
  boxShadowText?: string;
  webkitBoxShadowText?: string;
  borderRadius?: number;
}

const App: React.FC = () => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [regions, setRegions] = useState<StyleRegion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<StyleRegion | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [panelPosition, setPanelPosition] = useState<{ x: number; y: number } | null>(null);
  const [appliedStyle, setAppliedStyle] = useState<AppliedStyle | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [displayScale, setDisplayScale] = useState(1);

  useEffect(() => {
    const checkWidth = () => setIsNarrow(window.innerWidth < 1024);
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  useEffect(() => {
    const updateScale = () => {
      if (!imageRef.current || !canvasContainerRef.current) return;
      const containerW = canvasContainerRef.current.clientWidth - 48;
      const containerH = canvasContainerRef.current.clientHeight - 120;
      if (imageSize.w === 0 || imageSize.h === 0) return;
      const scale = Math.min(containerW / imageSize.w, containerH / imageSize.h, 1);
      setDisplayScale(scale);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [imageSize, imageSrc]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      alert('图片大小不能超过 2MB');
      return;
    }

    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      alert('仅支持 PNG 或 JPG 格式');
      return;
    }

    setLoading(true);
    setRegions([]);
    setSelectedRegion(null);
    setHighlightedId(null);
    setAppliedStyle(null);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const src = ev.target?.result as string;
      setImageSrc(src);

      const img = new Image();
      img.onload = async () => {
        setImageSize({ w: img.naturalWidth, h: img.naturalHeight });
        try {
          const detected = await detectStyles(img);
          setRegions(detected);
        } catch (err) {
          console.error('Detection failed:', err);
        }
        setLoading(false);
      };
      img.onerror = () => setLoading(false);
      img.src = src;
    };
    reader.readAsDataURL(file);
  }, []);

  const handleRegionClick = useCallback((region: StyleRegion, e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const panelW = 320 + 40;
    const panelH = Math.min(window.innerHeight - 32, 700);
    const margin = 16;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let posX = rect.right + margin;
    let posY = rect.top;

    if (posX + panelW > vw - margin) {
      posX = rect.left - panelW - margin + 40;
    }
    if (posX < margin) {
      posX = margin;
    }
    if (posY + panelH > vh - margin) {
      posY = vh - panelH - margin;
    }
    if (posY < margin) {
      posY = margin;
    }

    posX = Math.max(margin, Math.min(posX, vw - panelW - margin));
    posY = Math.max(margin, Math.min(posY, vh - panelH - margin));

    setPanelPosition({ x: posX, y: posY });
    setSelectedRegion(region);
    setHighlightedId(region.id);
  }, []);

  const applyStyleToPreview = useCallback((region: StyleRegion) => {
    const style: AppliedStyle = {
      backgroundColor: region.backgroundColor || '#334155',
      borderRadius: region.borderRadius
    };

    if (region.gradient) {
      const stopsStr = region.gradient.stops
        .map(s => `${s.color} ${(s.position * 100).toFixed(1)}%`)
        .join(', ');
      const gradFunc = region.gradient.type === 'linear'
        ? `linear-gradient(${region.gradient.angle}deg, ${stopsStr})`
        : `radial-gradient(circle, ${stopsStr})`;
      style.gradientText = gradFunc;
      style.webkitGradientText = gradFunc;
    }

    const shadowParts: string[] = [];
    if (region.boxShadow) {
      region.boxShadow.forEach(s => {
        shadowParts.push(
          `${s.offsetX}px ${s.offsetY}px ${s.blur}px ${s.spread}px ${s.color}`
        );
      });
    }
    if (region.innerShadow) {
      region.innerShadow.forEach(s => {
        shadowParts.push(
          `inset ${s.offsetX}px ${s.offsetY}px ${s.blur}px ${s.spread}px ${s.color}`
        );
      });
    }
    if (shadowParts.length > 0) {
      style.boxShadowText = shadowParts.join(', ');
      style.webkitBoxShadowText = shadowParts.join(', ');
    }

    setAppliedStyle(style);
  }, []);

  const clickTimerRef = useRef<number | null>(null);

  const handleListClick = useCallback((region: StyleRegion) => {
    if (clickTimerRef.current != null) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    clickTimerRef.current = window.setTimeout(() => {
      clickTimerRef.current = null;
      setHighlightedId(region.id);
      setSelectedRegion(null);
    }, 250);
  }, []);

  const handleListDoubleClick = useCallback((region: StyleRegion) => {
    if (clickTimerRef.current != null) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    setHighlightedId(region.id);
    applyStyleToPreview(region);
  }, [applyStyleToPreview]);

  const handleRegionUpdate = useCallback((updated: StyleRegion) => {
    setRegions(prev => prev.map(r => r.id === updated.id ? updated : r));
    setSelectedRegion(updated);
    if (highlightedId === updated.id) {
      applyStyleToPreview(updated);
    }
  }, [highlightedId, applyStyleToPreview]);

  const handleCopyAll = async () => {
    if (regions.length === 0) return;
    const css = generateFullCSS(regions);
    const ok = await copyToClipboard(css);
    if (ok) {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1000);
    }
  };

  const handleDownload = () => {
    if (regions.length === 0) return;
    const css = generateFullCSS(regions);
    downloadCSS(css, 'style.css');
  };

  const previewStyle = useMemo<React.CSSProperties>(() => {
    const base: React.CSSProperties = {
      width: '100%',
      maxWidth: '320px',
      height: '160px',
      backgroundColor: '#334155',
      margin: '0 auto',
      transition: 'all 0.15s ease-out'
    };
    if (!appliedStyle) return base;
    if (appliedStyle.borderRadius !== undefined) {
      base.borderRadius = `${appliedStyle.borderRadius}px`;
      (base as any)['WebkitBorderRadius'] = `${appliedStyle.borderRadius}px`;
    }
    if (appliedStyle.gradientText) {
      base.background = appliedStyle.gradientText;
      (base as any)['WebkitBackground'] = appliedStyle.webkitGradientText;
    } else if (appliedStyle.backgroundColor) {
      base.backgroundColor = appliedStyle.backgroundColor;
    }
    if (appliedStyle.boxShadowText) {
      base.boxShadow = appliedStyle.boxShadowText;
      (base as any)['WebkitBoxShadow'] = appliedStyle.webkitBoxShadowText;
    }
    return base;
  }, [appliedStyle]);

  const getCSSTypeSummary = (r: StyleRegion): string => {
    const parts: string[] = [];
    if (r.gradient) parts.push('渐变');
    if (r.boxShadow?.length) parts.push('外阴影');
    if (r.innerShadow?.length) parts.push('内阴影');
    if (r.borderRadius > 0) parts.push(`圆角${r.borderRadius}px`);
    return parts.length > 0 ? parts.join(' · ') : '纯色背景';
  };

  const rightPanel = (
    <div style={{
      width: isNarrow ? '100%' : '280px',
      height: isNarrow ? '100%' : '100vh',
      background: '#0f172a',
      borderRadius: isNarrow ? '0' : '12px 0 0 12px',
      padding: '20px',
      boxSizing: 'border-box',
      color: '#e2e8f0',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid #1e293b'
      }}>
        <h2 style={{
          margin: 0,
          fontSize: '15px',
          fontWeight: 600,
          color: '#f1f5f9'
        }}>
          样式管理
        </h2>
        <span style={{
          fontSize: '11px',
          color: '#64748b',
          background: '#1e293b',
          padding: '3px 10px',
          borderRadius: '10px'
        }}>
          {regions.length} 个
        </span>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div style={{
          fontSize: '12px',
          color: '#94a3b8',
          marginBottom: '10px'
        }}>
          预览元素（双击列表应用样式）
        </div>
        <div style={{
          background: '#020617',
          padding: '16px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '200px'
        }}>
          <div style={previewStyle} />
        </div>
      </div>

      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '14px',
        flexShrink: 0
      }}>
        <button
          onClick={handleCopyAll}
          disabled={regions.length === 0}
          style={{
            flex: 1,
            padding: '9px 12px',
            borderRadius: '8px',
            border: 'none',
            background: regions.length === 0 ? '#334155' : (copiedAll ? '#22c55e' : '#1e40af'),
            color: regions.length === 0 ? '#64748b' : '#ffffff',
            fontSize: '12px',
            fontWeight: 500,
            cursor: regions.length === 0 ? 'not-allowed' : 'pointer',
            transition: 'background 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          {copiedAll ? '✓ 已复制' : '复制全部'}
        </button>
        <button
          onClick={() => setExportOpen(v => !v)}
          disabled={regions.length === 0}
          style={{
            padding: '9px 12px',
            borderRadius: '8px',
            border: '1px solid #334155',
            background: regions.length === 0 ? 'transparent' : '#1e293b',
            color: regions.length === 0 ? '#64748b' : '#e2e8f0',
            fontSize: '12px',
            cursor: regions.length === 0 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => { if (regions.length > 0) e.currentTarget.style.borderColor = '#475569'; }}
          onMouseOut={(e) => e.currentTarget.style.borderColor = '#334155'}
        >
          导出
        </button>
      </div>

      {exportOpen && regions.length > 0 && (
        <div style={{
          background: '#1e293b',
          borderRadius: '10px',
          padding: '12px',
          marginBottom: '14px',
          flexShrink: 0
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px'
          }}>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>格式导出</span>
            <button
              onClick={handleDownload}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                border: 'none',
                background: '#3b82f6',
                color: '#fff',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              下载 style.css
            </button>
          </div>
          <pre style={{
            margin: 0,
            background: '#0f172a',
            padding: '10px',
            borderRadius: '6px',
            fontSize: '10px',
            lineHeight: '1.5',
            color: '#93c5fd',
            fontFamily: 'monospace',
            maxHeight: '140px',
            overflowY: 'auto',
            whiteSpace: 'pre-wrap'
          }}>
            {generateFullCSS(regions)}
          </pre>
        </div>
      )}

      <div style={{
        fontSize: '12px',
        color: '#94a3b8',
        marginBottom: '10px',
        flexShrink: 0
      }}>
        已识别样式
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingRight: '4px',
        marginRight: '-4px'
      }}>
        {regions.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 16px',
            color: '#475569',
            fontSize: '13px'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '10px', opacity: 0.5 }}>
              🖼️
            </div>
            {loading ? '识别中...' : '上传图片后将在此展示样式列表'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {regions.map((region, idx) => (
              <div
                key={region.id}
                onClick={() => handleListClick(region)}
                onDoubleClick={() => handleListDoubleClick(region)}
                style={{
                  display: 'flex',
                  gap: '12px',
                  padding: '10px',
                  borderRadius: '10px',
                  background: highlightedId === region.id ? '#1e3a5f' : '#1e293b',
                  cursor: 'pointer',
                  border: highlightedId === region.id
                    ? '1px solid #3b82f6'
                    : '1px solid transparent',
                  transition: 'all 0.2s ease',
                  animation: `regionFadeIn 0.3s ease ${idx * 0.03}s both`
                }}
                onMouseOver={(e) => {
                  if (highlightedId !== region.id) {
                    e.currentTarget.style.background = '#273652';
                  }
                }}
                onMouseOut={(e) => {
                  if (highlightedId !== region.id) {
                    e.currentTarget.style.background = '#1e293b';
                  }
                }}
              >
                <div style={{
                  width: '56px',
                  height: '42px',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  background: '#0f172a',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {region.thumbnail && (
                    <img
                      src={region.thumbnail}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      draggable={false}
                    />
                  )}
                </div>
                <div style={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#f1f5f9',
                    marginBottom: '4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {region.name}
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: '#64748b',
                    marginBottom: '4px'
                  }}>
                    {region.width}×{region.height}px
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: '#93c5fd',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {getCSSTypeSummary(region)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{
      display: 'flex',
      width: '100%',
      height: '100vh',
      margin: 0,
      padding: 0,
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: isNarrow ? '#0f172a' : undefined
    }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes regionFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #1e293b;
          box-shadow: 0 0 4px rgba(59, 130, 246, 0.5);
          margin-top: -4px;
        }
        input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #1e293b;
          box-shadow: 0 0 4px rgba(59, 130, 246, 0.5);
        }
      `}</style>

      <div
        ref={canvasContainerRef}
        onClick={() => { setSelectedRegion(null); setHighlightedId(null); }}
        style={{
          flex: isNarrow ? 1 : '0 0 calc(100% - 280px)',
          background: '#f8fafc',
          position: 'relative',
          overflow: 'auto',
          padding: '24px',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ position: 'sticky', top: 0, zIndex: 10, marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: '#3b82f6',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background 0.2s ease, box-shadow 0.2s ease',
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#2563eb';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.35)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#3b82f6';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.25)';
              }}
            >
              <span style={{ fontSize: '16px' }}>↑</span>
              上传设计稿
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,image/png,image/jpeg"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <span style={{
              fontSize: '12px',
              color: '#64748b'
            }}>
              支持 PNG / JPG，最大 2MB
            </span>
            {isNarrow && regions.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDrawer(true);
                }}
                style={{
                  marginLeft: 'auto',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                样式列表 ({regions.length})
              </button>
            )}
          </div>
        </div>

        {loading && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(248, 250, 252, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '16px',
            zIndex: 50
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '3px solid #e2e8f0',
              borderTopColor: '#3b82f6',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }} />
            <div style={{
              fontSize: '14px',
              color: '#475569',
              fontWeight: 500
            }}>
              正在识别样式...
            </div>
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}

        {!imageSrc ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 'calc(100% - 100px)',
            minHeight: '400px'
          }}>
            <div style={{
              width: '520px',
              maxWidth: '100%',
              padding: '48px 32px',
              textAlign: 'center',
              border: '2px dashed #cbd5e1',
              borderRadius: '16px',
              background: '#ffffff',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.1)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                width: '72px',
                height: '72px',
                margin: '0 auto 20px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px'
              }}>
                🎨
              </div>
              <h2 style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: 600,
                color: '#1e293b',
                marginBottom: '8px'
              }}>
                CSS 样式提取工具
              </h2>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: '#64748b',
                lineHeight: 1.7
              }}>
                上传设计稿截图，自动识别渐变、阴影、圆角等视觉样式
                <br />
                一键生成可复制的 CSS 代码片段
              </p>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '12px',
                marginTop: '24px',
                flexWrap: 'wrap'
              }}>
                {['渐变识别', '阴影提取', '圆角检测', '实时预览'].map(tag => (
                  <span key={tag} style={{
                    padding: '5px 12px',
                    borderRadius: '100px',
                    background: '#f1f5f9',
                    color: '#475569',
                    fontSize: '12px'
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '16px 0'
          }}>
            <div
              style={{
                position: 'relative',
                display: 'inline-block',
                boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                borderRadius: '8px',
                overflow: 'hidden'
              }}
            >
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Design"
                style={{
                  display: 'block',
                  width: `${imageSize.w * displayScale}px`,
                  height: `${imageSize.h * displayScale}px`,
                  maxWidth: '100%',
                  animation: 'fadeIn 0.3s ease'
                }}
                draggable={false}
                onClick={(e) => e.stopPropagation()}
              />
              {regions.map((region, idx) => (
                <div
                  key={region.id}
                  onClick={(e) => handleRegionClick(region, e)}
                  style={{
                    position: 'absolute',
                    left: `${region.x * displayScale}px`,
                    top: `${region.y * displayScale}px`,
                    width: `${region.width * displayScale}px`,
                    height: `${region.height * displayScale}px`,
                    border: '4px dashed #3b82f6',
                    borderRadius: `${Math.max(4, region.borderRadius * displayScale)}px`,
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                    animation: `fadeIn 0.3s ease ${Math.min(idx * 0.04, 0.5)}s both`,
                    zIndex: highlightedId === region.id ? 5 : 2,
                    transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
                    background: highlightedId === region.id
                      ? 'rgba(59, 130, 246, 0.12)'
                      : 'rgba(59, 130, 246, 0.04)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = '#2563eb';
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(59,130,246,0.2)';
                    setHighlightedId(region.id);
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.background = highlightedId === region.id
                      ? 'rgba(59, 130, 246, 0.12)'
                      : 'rgba(59, 130, 246, 0.04)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    top: '-24px',
                    left: '0',
                    background: '#3b82f6',
                    color: '#fff',
                    fontSize: '10px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    whiteSpace: 'nowrap',
                    fontWeight: 500,
                    opacity: 0.85
                  }}>
                    {idx + 1}. {region.name.replace(/元素\s?/, '')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {!isNarrow && rightPanel}

      {isNarrow && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.45)',
              zIndex: 200,
              opacity: showDrawer ? 1 : 0,
              pointerEvents: showDrawer ? 'auto' : 'none',
              transition: 'opacity 0.25s ease'
            }}
            onClick={() => setShowDrawer(false)}
          />
          <div style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            height: showDrawer ? '80vh' : '0px',
            zIndex: 201,
            transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            overflow: 'hidden',
            borderRadius: '20px 20px 0 0'
          }}>
            {showDrawer && rightPanel}
          </div>
        </>
      )}

      <StyleEditor
        region={selectedRegion}
        panelPosition={panelPosition}
        onClose={() => setSelectedRegion(null)}
        onUpdate={handleRegionUpdate}
      />
    </div>
  );
};

export default App;
