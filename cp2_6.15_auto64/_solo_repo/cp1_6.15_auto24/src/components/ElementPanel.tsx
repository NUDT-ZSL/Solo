import React, { memo } from 'react';
import { ElementCategory, ElementOption, ColorTheme } from '../types';
import { Scissors, Eye, Sparkles } from 'lucide-react';

interface ElementPanelProps {
  category: ElementCategory;
  options: ElementOption[];
  selectedId: string;
  theme: ColorTheme;
  onSelect: (id: string) => void;
}

const categoryIcons: Record<ElementCategory, React.ReactNode> = {
  hair: <Scissors size={18} />,
  eyes: <Eye size={18} />,
  accessory: <Sparkles size={18} />,
};

const categoryLabels: Record<ElementCategory, string> = {
  hair: '发型',
  eyes: '眼睛',
  accessory: '配饰',
};

const ElementPanel: React.FC<ElementPanelProps> = memo(({ category, options, selectedId, theme, onSelect }) => {
  const icon = categoryIcons[category];
  const label = categoryLabels[category];

  return (
    <div 
      className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10
                  transition-all duration-300 ease-out"
      style={{ borderColor: 'rgba(255,255,255,0.1)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white
                      transition-all duration-300 ease-out"
          style={{ backgroundColor: theme.primary }}
        >
          {icon}
        </div>
        <h3 className="text-white font-semibold text-lg">{label}</h3>
        <span className="ml-auto text-white/50 text-sm">{options.length} 种</span>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {options.map((option) => {
          const isSelected = selectedId === option.id;
          return (
            <button
              key={option.id}
              onClick={() => onSelect(option.id)}
              className={`
                relative p-3 rounded-xl text-sm font-medium text-left
                transition-all duration-200 ease-out
                card-hover
              `}
              style={{
                color: isSelected ? '#ffffff' : 'rgba(255,255,255,0.8)',
                backgroundColor: isSelected ? theme.primary : 'rgba(255,255,255,0.05)',
                boxShadow: isSelected 
                  ? `0 8px 16px rgba(0,0,0,0.25), 0 0 20px ${theme.primary}40` 
                  : 'none',
                transform: isSelected ? 'translateY(-2px)' : 'translateY(0)',
              }}
            >
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full transition-all duration-200"
                  style={{ 
                    backgroundColor: isSelected ? '#ffffff' : theme.secondary,
                    opacity: isSelected ? 1 : 0.6,
                    transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                  }}
                />
                <span className="truncate">{option.name}</span>
              </div>
              {isSelected && (
                <div 
                  className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center
                              animate-float"
                  style={{ backgroundColor: theme.accent }}
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

ElementPanel.displayName = 'ElementPanel';

export default ElementPanel;
