import React, { ReactNode } from 'react';

interface GlassHeaderProps {
  title: string;
  rightContent?: ReactNode;
  onBack?: () => void;
}

export function GlassHeader({ title, rightContent, onBack }: GlassHeaderProps) {
  return (
    <div className="sticky top-0 z-40 glass-effect border-b border-white/20">
      <div className="max-w-5xl mx-auto flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors text-text-primary"
              aria-label="返回"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
          )}
          <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
        </div>
        <div>{rightContent}</div>
      </div>
    </div>
  );
}
