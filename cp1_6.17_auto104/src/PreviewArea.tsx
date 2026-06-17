import React, { useMemo } from 'react';
import { TypographyParams, FONT_OPTIONS } from './helpers';

interface PreviewAreaProps {
  params: TypographyParams;
  text: string;
}

const PreviewArea: React.FC<PreviewAreaProps> = ({ params, text }) => {
  const font = useMemo(
    () => FONT_OPTIONS.find((f) => f.value === params.fontFamily),
    [params.fontFamily]
  );

  const fontFamily = useMemo(() => {
    return font ? `'${font.value}', ${font.fallback}` : params.fontFamily;
  }, [font, params.fontFamily]);

  const textStyle = useMemo(
    () => ({
      fontFamily,
      fontWeight: params.fontWeight,
      fontSize: `${params.fontSize}px`,
      lineHeight: params.lineHeight,
      letterSpacing: `${params.letterSpacing}em`,
      color: params.textColor,
      maxWidth: 720,
      width: '100%',
      margin: 0,
      textAlign: 'center' as const,
      wordBreak: 'break-word' as const,
      transition:
        'font-weight 0.15s ease-out, font-size 0.15s ease-out, line-height 0.15s ease-out, letter-spacing 0.15s ease-out, color 0.15s ease-out',
      willChange: 'font-weight, font-size, line-height, letter-spacing, color',
    }),
    [fontFamily, params.fontWeight, params.fontSize, params.lineHeight, params.letterSpacing, params.textColor]
  );

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
      <p style={textStyle}>{text}</p>
    </div>
  );
};

export default React.memo(PreviewArea, (prev, next) => {
  return (
    prev.params.fontFamily === next.params.fontFamily &&
    prev.params.fontWeight === next.params.fontWeight &&
    prev.params.fontSize === next.params.fontSize &&
    prev.params.lineHeight === next.params.lineHeight &&
    prev.params.letterSpacing === next.params.letterSpacing &&
    prev.params.backgroundColor === next.params.backgroundColor &&
    prev.params.textColor === next.params.textColor &&
    prev.text === next.text
  );
});
