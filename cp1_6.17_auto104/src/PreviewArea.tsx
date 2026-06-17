import React from 'react';
import { TypographyParams, FONT_OPTIONS, SAMPLE_TEXT } from './helpers';

interface PreviewAreaProps {
  params: TypographyParams;
}

const PreviewArea: React.FC<PreviewAreaProps> = ({ params }) => {
  const font = FONT_OPTIONS.find((f) => f.value === params.fontFamily);
  const fontFamily = font
    ? `'${font.value}', ${font.fallback}`
    : params.fontFamily;

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: params.backgroundColor,
        minHeight: 500,
        padding: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        transition: 'background-color 0.2s ease-out',
        borderRadius: 12,
      }}
    >
      <p
        style={{
          fontFamily,
          fontWeight: params.fontWeight,
          fontSize: `${params.fontSize}px`,
          lineHeight: params.lineHeight,
          letterSpacing: `${params.letterSpacing}em`,
          color: params.textColor,
          maxWidth: 720,
          width: '100%',
          margin: 0,
          textAlign: 'center',
          wordBreak: 'break-word',
          transition:
            'font-weight 0.15s ease-out, font-size 0.15s ease-out, line-height 0.15s ease-out, letter-spacing 0.15s ease-out, color 0.15s ease-out',
          willChange: 'font-weight, font-size, line-height, letter-spacing, color',
        }}
      >
        {SAMPLE_TEXT}
      </p>
    </div>
  );
};

export default PreviewArea;
