import { useRef, useState, useEffect, useMemo } from 'react';
import html2canvas from 'html2canvas';
import { CardParams, SavedCard } from './types';
import { hexToRgb, generateCardCSS, generateCardStyleObj, copyToClipboard, shareCard } from './utils';
import './Preview.css';

interface PreviewProps {
  params: CardParams;
  onShowToast: (msg: string) => void;
  onAddToHistory: (card: SavedCard) => void;
}

function Preview({ params, onShowToast, onAddToHistory }: PreviewProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [breathKey, setBreathKey] = useState(0);
  const [shareLink, setShareLink] = useState<string | null>(null);

  const { glowRadius, glowOpacity, borderRadius, gradientAngle, baseColor, backdropBlur } = params;
  const rgb = hexToRgb(baseColor);
  const rgbaColor = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)` : `rgba(102, 126, 234, 0.3)`;

  useEffect(() => {
    setBreathKey((k) => k + 1);
  }, [params]);

  const cardStyle = useMemo<React.CSSProperties>(() => ({
    position: 'relative',
    width: '320px',
    height: '420px',
    borderRadius: `${borderRadius}px`,
    background: `linear-gradient(${gradientAngle}deg, ${baseColor}cc 0%, ${rgbaColor} 100%)`,
    backdropFilter: `blur(${backdropBlur}px)`,
    WebkitBackdropFilter: `blur(${backdropBlur}px)`,
    border: '1px solid rgba(255, 255, 255, 0.15)',
    overflow: 'visible'
  }), [borderRadius, gradientAngle, baseColor, rgbaColor, backdropBlur]);

  const glowStyle = useMemo<React.CSSProperties>(() => ({
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: `calc(100% + ${glowRadius * 2}px)`,
    height: `calc(100% + ${glowRadius * 2}px)`,
    transform: 'translate(-50%, -50%)',
    background: `radial-gradient(ellipse at center, rgba(255, 255, 255, ${0.2 * glowOpacity}) 0%, rgba(255, 255, 255, 0) 70%)`,
    borderRadius: `${borderRadius}px`,
    zIndex: -1,
    filter: `blur(${glowRadius / 2}px)`
  }), [glowRadius, glowOpacity, borderRadius]);

  const shineStyle = useMemo<React.CSSProperties>(() => ({
    position: 'absolute',
    inset: 0,
    borderRadius: `${borderRadius}px`,
    background: `linear-gradient(${gradientAngle + 90}deg, rgba(255, 255, 255, 0.1) 0%, transparent 50%, rgba(0, 0, 0, 0.1) 100%)`,
    pointerEvents: 'none'
  }), [borderRadius, gradientAngle]);

  const handleCopyCSS = async () => {
    const css = generateCardCSS(params);
    const success = await copyToClipboard(css);
    onShowToast(success ? 'CSS 已复制到剪贴板' : '复制失败');
  };

  const handleSavePNG = async () => {
    if (!cardRef.current) return;
    try {
      onShowToast('正在生成图片...');
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false
      });
      const link = document.createElement('a');
      link.download = `glow-card-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      onShowToast('图片已保存');
    } catch (err) {
      onShowToast('保存失败');
    }
  };

  const handleGenerateShareLink = async () => {
    try {
      onShowToast('正在生成分享链接...');
      const result = await shareCard(params);
      if (result) {
        const fullUrl = `${window.location.origin}${result.shareUrl}`;
        setShareLink(fullUrl);
        const saved: SavedCard = {
          ...params,
          id: result.id,
          createdAt: Date.now()
        };
        onAddToHistory(saved);
        onShowToast('分享链接已生成');
      }
    } catch (err) {
      onShowToast('生成失败');
    }
  };

  const handleCopyShareLink = async () => {
    if (!shareLink) return;
    const success = await copyToClipboard(shareLink);
    onShowToast(success ? '分享链接已复制' : '复制失败');
  };

  return (
    <section className="preview-section">
      <div className="preview-container">
        <div className="card-wrapper">
          <div
            key={breathKey}
            ref={cardRef}
            className={`glow-card breath-animation`}
            style={cardStyle}
          >
            <div className="card-glow" style={glowStyle} />
            <div className="card-shine" style={shineStyle} />
            <div className="card-content">
              <div className="card-avatar" style={{ background: `linear-gradient(135deg, ${baseColor}, ${rgbaColor})` }}>
                ✨
              </div>
              <h3 className="card-title">光晕卡片工坊</h3>
              <p className="card-desc">打造属于你的专属视觉卡片，享受光影的艺术魅力</p>
              <div className="card-tags">
                <span className="card-tag" style={{ background: `${baseColor}40` }}>设计</span>
                <span className="card-tag" style={{ background: `${baseColor}40` }}>创意</span>
                <span className="card-tag" style={{ background: `${baseColor}40` }}>美学</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="action-buttons">
        <button className="action-btn" onClick={handleCopyCSS}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          复制CSS
        </button>
        <button className="action-btn primary" onClick={handleSavePNG}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          保存为PNG
        </button>
        <button className="action-btn" onClick={handleGenerateShareLink}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          生成分享链接
        </button>
      </div>

      {shareLink && (
        <div className="share-link-box">
          <input type="text" value={shareLink} readOnly className="share-link-input" />
          <button className="copy-link-btn" onClick={handleCopyShareLink}>复制</button>
        </div>
      )}
    </section>
  );
}

export default Preview;
