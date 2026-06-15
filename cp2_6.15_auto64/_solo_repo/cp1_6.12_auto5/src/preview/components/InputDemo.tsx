import React, { useMemo } from 'react';
import { calculateContrast } from '@/utils/contrastCheck';

interface Props {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  accent: string;
}

export const InputDemo: React.FC<Props> = React.memo(function InputDemo({
  primary,
  secondary,
  background,
  text,
  accent,
}) {
  const textContrast = useMemo(
    () => calculateContrast(text, background),
    [text, background]
  );

  const containerStyle = useMemo(
    () => ({
      '--c-primary': primary,
      '--c-secondary': secondary,
      '--c-background': background,
      '--c-text': text,
      '--c-accent': accent,
    } as React.CSSProperties),
    [primary, secondary, background, text, accent]
  );

  return (
    <article className="preview-card">
      <header className="preview-card__head">
        <h3 className="preview-card__title">输入框 Input</h3>
        <span
          className={`preview-card__badge ${
            textContrast.passAA
              ? 'preview-card__badge--ok'
              : 'preview-card__badge--warn'
          }`}
          title={`文字对比度 ${textContrast.ratio}:1`}
        >
          {textContrast.passAA
            ? '✓ 文字对比度达标'
            : `⚠ 文字 ${textContrast.ratio}:1`}
        </span>
      </header>
      <div className="demo-stage" style={containerStyle}>
        <div className="demo-input">
          <label
            className="demo-input__label"
            style={{ color: 'var(--c-text)' }}
          >
            邮箱地址
          </label>
          <input
            type="text"
            className="demo-input__field"
            placeholder="name@example.com"
            style={{
              backgroundColor: 'var(--c-background)',
              color: 'var(--c-text)',
              borderColor: 'color-mix(in srgb, var(--c-secondary) 33%, transparent)',
            }}
          />
          <span
            className="demo-input__hint"
            style={{ color: 'var(--c-text)' }}
          >
            我们会将登录链接发送到此邮箱 · 强调色
            <span
              style={{
                color: 'var(--c-accent)',
                fontWeight: 600,
                marginLeft: 4,
              }}
            >
              {accent.toUpperCase()}
            </span>
          </span>
        </div>
      </div>
    </article>
  );
},
  (prev, next) =>
    prev.primary === next.primary &&
    prev.secondary === next.secondary &&
    prev.background === next.background &&
    prev.text === next.text &&
    prev.accent === next.accent
);

export default InputDemo;
