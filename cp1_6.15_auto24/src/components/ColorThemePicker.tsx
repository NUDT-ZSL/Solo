import React, { memo } from 'react';
import { ColorTheme } from '../types';
import { Palette } from 'lucide-react';

interface ColorThemePickerProps {
  themes: ColorTheme[];
  selectedId: string;
  onSelect: (id: string) => void;
}

const ColorThemePicker: React.FC<ColorThemePickerProps> = memo(({ themes, selectedId, onSelect }) => {
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
          <Palette size={18} />
        </div>
        <h3 className="text-white font-semibold text-lg">颜色主题</h3>
        <span className="ml-auto text-white/50 text-sm">{themes.length} 种</span>
      </div>
      
      <div className="flex flex-wrap gap-3">
        {themes.map((theme) => {
          const isSelected = selectedId === theme.id;
          return (
            <button
              key={theme.id}
              onClick={() => onSelect(theme.id)}
              className={`
                group relative flex flex-col items-center gap-2
                transition-all duration-300 ease-out
              `}
              title={theme.name}
            >
              <div 
                className={`
                  relative w-14 h-14 rounded-2xl overflow-hidden
                  transition-all duration-300 ease-out
                `}
                style={{
                  boxShadow: isSelected 
                    ? `0 0 30px ${theme.primary}80, 0 0 60px ${theme.primary}40, 0 8px 16px rgba(0,0,0,0.25)` 
                    : '0 2px 8px rgba(0,0,0,0.1)',
                  border: isSelected ? '3px solid rgba(255,255,255,0.9)' : '2px solid rgba(255,255,255,0.2)',
                  transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                }}
              >
                <div 
                  className="absolute inset-0 bg-transition"
                  style={{ backgroundColor: theme.background }}
                />
                <div 
                  className="absolute top-2 left-2 w-5 h-5 rounded-full"
                  style={{ backgroundColor: theme.primary }}
                />
                <div 
                  className="absolute top-2 right-2 w-4 h-4 rounded-full"
                  style={{ backgroundColor: theme.secondary }}
                />
                <div 
                  className="absolute bottom-2 left-2 w-6 h-2 rounded-full"
                  style={{ backgroundColor: theme.accent }}
                />
                <div 
                  className="absolute bottom-2 right-2 w-2 h-2 rounded-full"
                  style={{ backgroundColor: theme.border }}
                />
              </div>
              <span 
                className={`
                  text-xs font-medium transition-all duration-200
                `}
                style={{
                  color: isSelected ? '#ffffff' : 'rgba(255,255,255,0.6)',
                  transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                }}
              >
                {theme.name}
              </span>
              {isSelected && (
                <div 
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-lg z-10"
                  style={{ backgroundColor: '#ffffff' }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={theme.border} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});

ColorThemePicker.displayName = 'ColorThemePicker';

export default ColorThemePicker;
