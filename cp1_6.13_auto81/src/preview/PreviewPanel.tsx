import React, { useMemo, useRef, useEffect, memo } from 'react';
import { useColorContext, ColorScheme, ColorToken } from '../context/ColorContext';
import { ComponentSet } from './ComponentSet';

const applyTokensToElement = (element: HTMLElement, tokens: ColorToken[]) => {
  tokens.forEach(token => {
    element.style.setProperty(token.name, token.value);
  });
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

const getLuminance = (r: number, g: number, b: number): number => {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};

const adjustColor = (hex: string, amount: number): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const adjust = (channel: number) => {
    const adjusted = channel + amount;
    return Math.max(0, Math.min(255, Math.round(adjusted)));
  };

  return `rgb(${adjust(rgb.r)}, ${adjust(rgb.g)}, ${adjust(rgb.b)})`;
};

const generatePreviewBackground = (tokens: ColorToken[]): string => {
  const bgToken = tokens.find(t => t.name === '--background');
  const primaryToken = tokens.find(t => t.name === '--primary');

  if (bgToken) {
    const rgb = hexToRgb(bgToken.value);
    if (rgb) {
      const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
      if (luminance < 0.5) {
        return adjustColor(bgToken.value, 30);
      }
      return bgToken.value;
    }
  }

  if (primaryToken) {
    const rgb = hexToRgb(primaryToken.value);
    if (rgb) {
      const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
      const adjustAmount = luminance < 0.5 ? 180 : -50;
      return adjustColor(primaryToken.value, adjustAmount);
    }
  }

  return '#f9fafb';
};

interface SchemePreviewProps {
  scheme: ColorScheme;
  onScroll?: (scrollTop: number, scrollLeft: number) => void;
  scrollTarget?: { top: number; left: number } | null;
}

const SchemePreview = memo(({ scheme, onScroll, scrollTarget }: SchemePreviewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScroll = useRef(false);

  useEffect(() => {
    if (containerRef.current) {
      applyTokensToElement(containerRef.current, scheme.tokens);
    }
  }, [scheme.tokens]);

  useEffect(() => {
    if (scrollTarget && containerRef.current && !isProgrammaticScroll.current) {
      isProgrammaticScroll.current = true;
      containerRef.current.scrollTop = scrollTarget.top;
      containerRef.current.scrollLeft = scrollTarget.left;
      requestAnimationFrame(() => {
        isProgrammaticScroll.current = false;
      });
    }
  }, [scrollTarget]);

  const bgColor = useMemo(() => {
    return generatePreviewBackground(scheme.tokens);
  }, [scheme.tokens]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isProgrammaticScroll.current) return;
    const target = e.currentTarget;
    onScroll?.(target.scrollTop, target.scrollLeft);
  };

  return (
    <div
      ref={containerRef}
      className="colorplay-preview-container"
      data-scroll-sync
      onScroll={handleScroll}
      style={{
        flex: 1,
        minWidth: 0,
        backgroundColor: bgColor,
        padding: '32px',
        overflowY: 'auto',
        transition: 'background-color 0.3s ease',
      }}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <ComponentSet />
      </div>
    </div>
  );
});

SchemePreview.displayName = 'SchemePreview';

export const PreviewPanel: React.FC = () => {
  const { state, getCurrentScheme, getCompareSchemes } = useColorContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = React.useState<{ top: number; left: number } | null>(null);
  const isSyncing = useRef(false);

  const handlePanelScroll = useMemo(() => {
    return (schemeId: string, top: number, left: number) => {
      if (isSyncing.current) return;
      isSyncing.current = true;
      setScrollPosition({ top, left });
      requestAnimationFrame(() => {
        isSyncing.current = false;
      });
    };
  }, []);

  const renderContent = useMemo(() => {
    if (state.isCompareMode) {
      const compareSchemes = getCompareSchemes();
      if (compareSchemes.length < 2 || compareSchemes.length > 4) {
        return (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6b7280',
              fontSize: '14px',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ fontSize: '48px' }}>🎨</div>
            <div>请在左侧选择 2-4 个配色方案进行对比</div>
          </div>
        );
      }

      return (
        <div
          style={{
            display: 'flex',
            height: '100%',
            gap: '2px',
            backgroundColor: '#e5e7eb',
          }}
        >
          {compareSchemes.map(scheme => (
            <div
              key={scheme.id}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
                height: '100%',
              }}
            >
              <div
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#ffffff',
                  borderBottom: '1px solid #e5e7eb',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#374151',
                  textAlign: 'center',
                  flexShrink: 0,
                }}
              >
                {scheme.name}
              </div>
              <SchemePreview
                scheme={scheme}
                onScroll={(top, left) => handlePanelScroll(scheme.id, top, left)}
                scrollTarget={scrollPosition}
              />
            </div>
          ))}
        </div>
      );
    }

    const currentScheme = getCurrentScheme();
    if (!currentScheme) {
      return (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#9ca3af',
            fontSize: '16px',
          }}
        >
          请选择或创建一个配色方案
        </div>
      );
    }

    return (
      <SchemePreview
        scheme={currentScheme}
        onScroll={(top, left) => handlePanelScroll(currentScheme.id, top, left)}
        scrollTarget={null}
      />
    );
  }, [state.isCompareMode, state.compareSchemeIds, state.currentSchemeId, state.schemes, scrollPosition, handlePanelScroll, getCompareSchemes, getCurrentScheme]);

  const containerBg = useMemo(() => {
    if (state.isCompareMode) {
      return '#e5e7eb';
    }
    const currentScheme = getCurrentScheme();
    if (currentScheme) {
      return generatePreviewBackground(currentScheme.tokens);
    }
    return '#f9fafb';
  }, [state.isCompareMode, state.currentSchemeId, state.schemes, getCurrentScheme]);

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        display: 'flex',
        minWidth: 0,
        backgroundColor: containerBg,
        transition: 'background-color 0.3s ease',
      }}
    >
      {renderContent}
    </div>
  );
};
