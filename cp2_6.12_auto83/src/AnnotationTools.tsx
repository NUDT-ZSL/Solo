import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlignLeft, AlignCenter, AlignRight, Type, Palette } from 'lucide-react';
import { PRESET_COLORS } from './utils/colorUtils';

interface AnnotationToolsProps {
  chartId: string;
  onAddAnnotation: (chartId: string, text: string, fontSize: number, color: string, align: 'left' | 'center' | 'right') => void;
}

export const AnnotationTools: React.FC<AnnotationToolsProps> = ({ chartId, onAddAnnotation }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [text, setText] = useState('');
  const [fontSize, setFontSize] = useState(14);
  const [selectedColor, setSelectedColor] = useState('#374151');
  const [align, setAlign] = useState<'left' | 'center' | 'right'>('left');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  const handleAdd = () => {
    if (text.trim()) {
      onAddAnnotation(chartId, text.trim(), fontSize, selectedColor, align);
      setText('');
      setIsExpanded(false);
    }
  };

  const handleToggle = () => {
    if (!isExpanded) {
      setIsExpanded(true);
    } else {
      setIsExpanded(false);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        style={{
          padding: '8px 16px',
          backgroundColor: '#3B82F6',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <Type size={14} />
        添加标注
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            transition={{ duration: 0.25, type: 'spring', stiffness: 300, damping: 25 }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              minWidth: '280px',
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
              padding: '16px',
              zIndex: 50,
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '-6px',
                left: '24px',
                width: '12px',
                height: '12px',
                backgroundColor: 'white',
                transform: 'rotate(45deg)',
                borderLeft: '1px solid #E5E7EB',
                borderTop: '1px solid #E5E7EB',
              }}
            />

            <div style={{ position: 'relative', marginBottom: '12px' }}>
              {isInputFocused && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '4px',
                    bottom: '4px',
                    width: '3px',
                    backgroundColor: '#EF4444',
                    borderRadius: '2px',
                  }}
                />
              )}
              <textarea
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                placeholder="输入标注文字..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  paddingLeft: isInputFocused ? '16px' : '12px',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: '13px',
                  resize: 'vertical',
                  minHeight: '60px',
                  outline: 'none',
                  fontFamily: 'system-ui, sans-serif',
                  transition: 'border-color 0.2s ease, padding-left 0.2s ease',
                }}
                onFocusCapture={(e) => {
                  e.currentTarget.style.borderColor = '#3B82F6';
                }}
                onBlurCapture={(e) => {
                  e.currentTarget.style.borderColor = '#E5E7EB';
                }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <Type size={13} style={{ color: '#6B7280' }} />
                <span style={{ fontSize: '12px', color: '#6B7280' }}>字号: {fontSize}px</span>
              </div>
              <input
                type="range"
                min="12"
                max="24"
                step="2"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                style={{
                  width: '100%',
                  height: '4px',
                  appearance: 'none',
                  background: '#E5E7EB',
                  borderRadius: '2px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <Palette size={13} style={{ color: '#6B7280' }} />
                <span style={{ fontSize: '12px', color: '#6B7280' }}>颜色</span>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: color,
                      border: selectedColor === color ? '2px solid white' : '2px solid transparent',
                      cursor: 'pointer',
                      boxShadow: selectedColor === color
                        ? `0 0 0 2px ${color}, 0 2px 8px rgba(0,0,0,0.2)`
                        : '0 1px 3px rgba(0,0,0,0.1)',
                      transform: selectedColor === color ? 'scale(1.1)' : 'scale(1)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <AlignLeft size={13} style={{ color: '#6B7280' }} />
                <span style={{ fontSize: '12px', color: '#6B7280' }}>对齐</span>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[
                  { value: 'left' as const, icon: AlignLeft },
                  { value: 'center' as const, icon: AlignCenter },
                  { value: 'right' as const, icon: AlignRight },
                ].map(({ value, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setAlign(value)}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      backgroundColor: align === value ? '#EFF6FF' : '#F3F4F6',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    <Icon size={14} style={{ color: align === value ? '#3B82F6' : '#6B7280' }} fill={align === value ? '#3B82F6' : 'none'} />
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleAdd}
              disabled={!text.trim()}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: text.trim() ? '#3B82F6' : '#D1D5DB',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: text.trim() ? 'pointer' : 'not-allowed',
                fontSize: '13px',
                fontWeight: 500,
                transition: 'background-color 0.2s ease',
              }}
            >
              确认添加
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
