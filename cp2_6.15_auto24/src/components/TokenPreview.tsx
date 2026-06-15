import React, { memo, useState } from 'react';
import type { NormalizedTokens, ColorToken, FontToken, SpacingToken, ShadowToken } from '../types';

interface TokenPreviewProps {
  tokens: NormalizedTokens;
}

const TokenPreview: React.FC<TokenPreviewProps> = memo(function TokenPreview({ tokens }) {
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);

  const renderColorPreview = (color: ColorToken, index: number) => (
    <div
      key={color.name}
      className="color-swatch-wrapper"
      onMouseEnter={() => setHoveredColor(color.name)}
      onMouseLeave={() => setHoveredColor(null)}
    >
      <div
        className="color-swatch"
        style={{
          backgroundColor: color.value,
          animationDelay: `${index * 30}ms`,
        }}
      />
      {hoveredColor === color.name && (
        <div className="color-tooltip">{color.name}</div>
      )}
    </div>
  );

  const renderFontPreview = (font: FontToken, index: number) => (
    <div key={font.name} className="font-preview-item" style={{ animationDelay: `${index * 50}ms` }}>
      <div className="font-name">{font.name}</div>
      <div className="font-samples">
        <div
          className="font-sample"
          style={{
            fontFamily: font.fontFamily,
            fontSize: font.fontSize,
            fontWeight: font.fontWeight || 400,
            lineHeight: font.lineHeight || 1.5,
            color: '#e0e0e0',
          }}
        >
          设计令牌 Design Token
        </div>
        <div
          className="font-sample"
          style={{
            fontFamily: font.fontFamily,
            fontSize: font.fontSize,
            fontWeight: font.fontWeight || 500,
            lineHeight: font.lineHeight || 1.5,
            color: '#a0a0a0',
          }}
        >
          字体样式示例 Font Sample
        </div>
        <div
          className="font-sample"
          style={{
            fontFamily: font.fontFamily,
            fontSize: font.fontSize,
            fontWeight: font.fontWeight || 700,
            lineHeight: font.lineHeight || 1.5,
            color: '#606060',
          }}
        >
          渐变色阶展示 Gradient
        </div>
      </div>
    </div>
  );

  const renderSpacingPreview = (spacing: SpacingToken, index: number) => {
    const pixelValue = spacing.pixelValue || 16;
    const displaySize = Math.min(Math.max(pixelValue, 4), 80);

    return (
      <div key={spacing.name} className="spacing-preview-item" style={{ animationDelay: `${index * 30}ms` }}>
        <div className="spacing-info">
          <span className="spacing-name">{spacing.name}</span>
          <span className="spacing-value">{spacing.value}</span>
        </div>
        <div
          className="spacing-ruler"
          style={{
            width: `${displaySize}px`,
            height: `${displaySize}px`,
          }}
        />
      </div>
    );
  };

  const renderShadowPreview = (shadow: ShadowToken, index: number) => (
    <div key={shadow.name} className="shadow-preview-item" style={{ animationDelay: `${index * 50}ms` }}>
      <div
        className="shadow-box"
        style={{ boxShadow: shadow.value }}
      />
      <div className="shadow-info">
        <span className="shadow-name">{shadow.name}</span>
        <span className="shadow-value">{shadow.value}</span>
      </div>
    </div>
  );

  return (
    <div className="token-preview">
      <div className="preview-section">
        <h3 className="preview-section-title">颜色预览</h3>
        {tokens.color.length > 0 ? (
          <div className="color-grid">
            {tokens.color.map((color, index) => renderColorPreview(color, index))}
          </div>
        ) : (
          <div className="empty-preview">暂无颜色令牌</div>
        )}
      </div>

      <div className="preview-section">
        <h3 className="preview-section-title">字体预览</h3>
        {tokens.font.length > 0 ? (
          <div className="font-preview-list">
            {tokens.font.map((font, index) => renderFontPreview(font, index))}
          </div>
        ) : (
          <div className="empty-preview">暂无字体令牌</div>
        )}
      </div>

      <div className="preview-section">
        <h3 className="preview-section-title">间距预览</h3>
        {tokens.spacing.length > 0 ? (
          <div className="spacing-preview-grid">
            {tokens.spacing.map((spacing, index) => renderSpacingPreview(spacing, index))}
          </div>
        ) : (
          <div className="empty-preview">暂无间距令牌</div>
        )}
      </div>

      {tokens.shadow.length > 0 && (
        <div className="preview-section">
          <h3 className="preview-section-title">阴影预览</h3>
          <div className="shadow-preview-list">
            {tokens.shadow.map((shadow, index) => renderShadowPreview(shadow, index))}
          </div>
        </div>
      )}
    </div>
  );
});

export default TokenPreview;
