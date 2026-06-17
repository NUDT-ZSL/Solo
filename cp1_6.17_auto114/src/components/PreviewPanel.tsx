import { useMemo, useState } from 'react';
import { useFontContext, getLuminance, PreviewText, DEFAULT_PREVIEW_TEXT } from '../context/FontContext';

export default function PreviewPanel() {
  const ctx = useFontContext();
  const [showEditor, setShowEditor] = useState(false);
  const [draftText, setDraftText] = useState<PreviewText>(ctx.previewText);

  const textColor = useMemo(() => {
    const lum = getLuminance(ctx.backgroundColor);
    return lum > 0.5 ? '#0F172A' : '#F8FAFC';
  }, [ctx.backgroundColor]);

  const previewStyle = useMemo(
    () => ({
      backgroundColor: ctx.backgroundColor,
      '--heading-font': ctx.headingFont,
      '--body-font': ctx.bodyFont,
      '--heading-weight': ctx.headingWeight,
      '--body-weight': ctx.bodyWeight,
      '--heading-size': `${ctx.headingSize}px`,
      '--body-size': `${ctx.bodySize}px`,
      '--line-height': ctx.lineHeight,
      '--heading-spacing': `${ctx.headingSpacing}px`,
      '--text-color': textColor,
    } as React.CSSProperties),
    [
      ctx.backgroundColor,
      ctx.headingFont,
      ctx.bodyFont,
      ctx.headingWeight,
      ctx.bodyWeight,
      ctx.headingSize,
      ctx.bodySize,
      ctx.lineHeight,
      ctx.headingSpacing,
      textColor,
    ]
  );

  const editorContrastColor = useMemo(() => {
    const lum = getLuminance(ctx.backgroundColor);
    return lum > 0.5 ? 'rgba(15, 23, 42, 0.85)' : 'rgba(248, 250, 252, 0.95)';
  }, [ctx.backgroundColor]);

  const handleOpenEditor = () => {
    setDraftText(ctx.previewText);
    setShowEditor(true);
  };

  const handleSave = () => {
    ctx.setPreviewText(draftText);
    setShowEditor(false);
  };

  const handleReset = () => {
    setDraftText({ ...DEFAULT_PREVIEW_TEXT });
  };

  const handleCancel = () => {
    setShowEditor(false);
  };

  return (
    <main className="preview-panel" style={previewStyle}>
      <div className="preview-toolbar">
        <button
          type="button"
          className="preview-edit-btn"
          onClick={handleOpenEditor}
          style={{ color: textColor, borderColor: textColor }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          编辑文本
        </button>
      </div>

      <div className="preview-content">
        <h1 className="preview-h1">{ctx.previewText.h1}</h1>
        <h2 className="preview-h2">{ctx.previewText.h2}</h2>
        <p className="preview-p">{ctx.previewText.p1}</p>
        <blockquote className="preview-blockquote">
          {ctx.previewText.blockquote}
          <br />
          <span className="preview-cite">{ctx.previewText.cite}</span>
        </blockquote>
        <p className="preview-p">{ctx.previewText.p2}</p>
      </div>

      {showEditor && (
        <div className="preview-editor-overlay" onClick={handleCancel}>
          <div
            className="preview-editor-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: editorContrastColor }}
          >
            <div className="preview-editor-header">
              <h3 style={{ color: ctx.backgroundColor === '#1E293B' ? '#0F172A' : '#0F172A' }}>
                自定义预览文本
              </h3>
              <button type="button" className="preview-editor-close" onClick={handleCancel}>
                ×
              </button>
            </div>
            <div className="preview-editor-body">
              <label>
                <span>标题 (H1)</span>
                <input
                  type="text"
                  value={draftText.h1}
                  onChange={(e) => setDraftText({ ...draftText, h1: e.target.value })}
                />
              </label>
              <label>
                <span>副标题 (H2)</span>
                <input
                  type="text"
                  value={draftText.h2}
                  onChange={(e) => setDraftText({ ...draftText, h2: e.target.value })}
                />
              </label>
              <label>
                <span>正文段落 1</span>
                <textarea
                  rows={4}
                  value={draftText.p1}
                  onChange={(e) => setDraftText({ ...draftText, p1: e.target.value })}
                />
              </label>
              <label>
                <span>引用文字</span>
                <input
                  type="text"
                  value={draftText.blockquote}
                  onChange={(e) => setDraftText({ ...draftText, blockquote: e.target.value })}
                />
              </label>
              <label>
                <span>引用来源</span>
                <input
                  type="text"
                  value={draftText.cite}
                  onChange={(e) => setDraftText({ ...draftText, cite: e.target.value })}
                />
              </label>
              <label>
                <span>正文段落 2</span>
                <textarea
                  rows={4}
                  value={draftText.p2}
                  onChange={(e) => setDraftText({ ...draftText, p2: e.target.value })}
                />
              </label>
            </div>
            <div className="preview-editor-footer">
              <button type="button" className="btn-secondary" onClick={handleReset}>
                恢复默认
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn-secondary" onClick={handleCancel}>
                  取消
                </button>
                <button type="button" className="btn-primary" onClick={handleSave}>
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
