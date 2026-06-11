import React from 'react';
import type { ThemeColors } from '@/store/types';
import { calculateContrast } from '@/utils/contrastCheck';

interface Props {
  colors: ThemeColors;
}

export const InputDemo: React.FC<Props> = React.memo(function InputDemo({ colors }) {
  const textContrast = calculateContrast(colors.text, colors.background);
  const fieldContrast = calculateContrast(colors.text, colors.background);
  const badgeOk = textContrast.passAA && fieldContrast.passAA;

  return (
    <article className="preview-card">
      <header className="preview-card__head">
        <h3 className="preview-card__title">输入框 Input</h3>
        <span
          className={`preview-card__badge ${
            badgeOk ? 'preview-card__badge--ok' : 'preview-card__badge--warn'
          }`}
        >
          {badgeOk ? '✓ 对比度达标' : `⚠ 文字 ${textContrast.ratio}:1`}
        </span>
      </header>
      <div className="demo-stage" style={{ backgroundColor: colors.background }}>
        <div className="demo-input">
          <label className="demo-input__label" style={{ color: colors.text }}>
            邮箱地址
          </label>
          <input
            type="text"
            className="demo-input__field"
            placeholder="name@example.com"
            style={{
              backgroundColor: colors.background,
              color: colors.text,
              borderColor: `${colors.secondary}55`,
            }}
          />
          <span className="demo-input__hint" style={{ color: colors.text }}>
            我们会将登录链接发送到此邮箱 · 由强调色
            <span style={{ color: colors.accent, fontWeight: 600, marginLeft: 2 }}>
              ·{colors.accent.toUpperCase()}
            </span>{' '}
            点缀
          </span>
        </div>
      </div>
    </article>
  );
});

export default InputDemo;
