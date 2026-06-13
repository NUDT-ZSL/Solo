import React, { useMemo, useRef, useEffect, memo } from 'react';
import { useColorContext, ColorScheme, ColorToken } from '../context/ColorContext';
import { ComponentSet } from './ComponentSet';

const applyTokensToElement = (element: HTMLElement, tokens: ColorToken[]) => {
  tokens.forEach(token => {
    element.style.setProperty(token.name, token.value);
  });
};

const SchemePreview = memo(({ scheme }: { scheme: ColorScheme }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      applyTokensToElement(containerRef.current, scheme.tokens);
    }
  }, [scheme.tokens]);

  const bgColor = useMemo(() => {
    const bgToken = scheme.tokens.find(t => t.name === '--background');
    return bgToken?.value || '#f9fafb';
  }, [scheme.tokens]);

  return (
    <div
      ref={containerRef}
      className="colorplay-preview-container"
      data-scroll-sync
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
  const scrollSyncRef = useRef<boolean>(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = (e: Event) => {
      if (scrollSyncRef.current) return;
      scrollSyncRef.current = true;

      const target = e.target as HTMLElement;
      const scrollTop = target.scrollTop;
      const scrollLeft = target.scrollLeft;

      const allContainers = container.querySelectorAll('[data-scroll-sync]');
      allContainers.forEach(el => {
        if (el !== target) {
          (el as HTMLElement).scrollTop = scrollTop;
          (el as HTMLElement).scrollLeft = scrollLeft;
        }
      });

      requestAnimationFrame(() => {
        scrollSyncRef.current = false;
      });
    };

    const allContainers = container.querySelectorAll('[data-scroll-sync]');
    allContainers.forEach(el => {
      el.addEventListener('scroll', handleScroll, { passive: true });
    });

    return () => {
      allContainers.forEach(el => {
        el.removeEventListener('scroll', handleScroll);
      });
    };
  }, [state.isCompareMode, state.compareSchemeIds.length]);

  const renderContent = useMemo(() => {
    if (state.isCompareMode) {
      const compareSchemes = getCompareSchemes();
      if (compareSchemes.length < 2) {
        return null;
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
                }}
              >
                {scheme.name}
              </div>
              <SchemePreview scheme={scheme} />
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

    return <SchemePreview scheme={currentScheme} />;
  }, [state.isCompareMode, state.compareSchemeIds, state.currentSchemeId, state.schemes]);

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        display: 'flex',
        minWidth: 0,
        backgroundColor: '#f9fafb',
      }}
    >
      {renderContent}
    </div>
  );
};
