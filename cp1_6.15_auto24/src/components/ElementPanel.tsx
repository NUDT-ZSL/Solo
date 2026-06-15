import React, { useState } from 'react';
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

const ElementPanel: React.FC<ElementPanelProps> = ({ category, options, selectedId, theme, onSelect }) => {
  const [isDragging, setIsDragging] = useState(false);

  const icon = categoryIcons[category];
  const label = categoryLabels[category];

  return (
    <div 
      className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10"
      style={{ 
        borderColor: isDragging ? theme.primary : undefined,
        transition: 'border-color 0.3s ease',
      }}
      onMouseDown={() => setIsDragging(true)}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
    >
      <div className="flex items-center gap-2 mb-4">
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
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
                ${isSelected ? 'card-selected ring-2' : 'bg-white/5 hover:bg-white/10'}
              `}
              style={{
                color: isSelected ? '#ffffff' : 'rgba(255,255,255,0.8)',
                backgroundColor: isSelected ? theme.primary : undefined,
                ringColor: isSelected ? theme.secondary : undefined,
              }}
            >
              <div className="flex items-center gap-2">
                <div 
                  className={`
                    w-3 h-3 rounded-full transition-all duration-200
                    ${isSelected ? 'scale-110' : ''}
                  `}
                  style={{ 
                    backgroundColor: isSelected ? '#ffffff' : theme.secondary,
                    opacity: isSelected ? 1 : 0.6,
                  }}
                />
                <span className="truncate">{option.name}</span>
              </div>
              {isSelected && (
                <div 
                  className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
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
};

export default ElementPanel;
