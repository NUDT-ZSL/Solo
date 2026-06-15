import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, AlignLeft, AlignCenter, AlignRight, Type, Palette, Edit2, X } from 'lucide-react';
import { AnnotationItem } from './types';
import { PRESET_COLORS } from './utils/colorUtils';

interface AnnotationCardProps {
  annotation: AnnotationItem;
  chartTitle?: string;
  onUpdate: (id: string, updates: Partial<AnnotationItem>) => void;
  onDelete: (id: string) => void;
}

export const AnnotationCard: React.FC<AnnotationCardProps> = ({
  annotation,
  chartTitle,
  onUpdate,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(annotation.text);
  const [editFontSize, setEditFontSize] = useState(annotation.fontSize);
  const [editColor, setEditColor] = useState(annotation.color);
  const [editAlign, setEditAlign] = useState<'left' | 'center' | 'right'>(annotation.align);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const handleSave = () => {
    onUpdate(annotation.id, {
      text: editText,
      fontSize: editFontSize,
      color: editColor,
      align: editAlign,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(annotation.text);
    setEditFontSize(annotation.fontSize);
    setEditColor(annotation.color);
    setEditAlign(annotation.align);
    setIsEditing(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      style={{
        position: 'relative',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        padding: '16px',
      }}
      className="annotation-card"
    >
      <div
        style={{
          position: 'absolute',
          top: '-8px',
          left: '32px',
          width: '16px',
          height: '16px',
          backgroundColor: 'white',
          transform: 'rotate(45deg)',
          boxShadow: '-2px -2px 4px rgba(0,0,0,0.03)',
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        {chartTitle && (
          <span style={{
            fontSize: '11px',
            color: '#9CA3AF',
            backgroundColor: '#F3F4F6',
            padding: '2px 8px',
            borderRadius: '4px',
          }}>
            标注：{chartTitle}
          </span>
        )}
        <div style={{ display: 'flex', gap: '2px' }}>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              title="编辑标注"
              style={{
                padding: '4px 6px',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                transition: 'background-color 0.2s ease, transform 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.backgroundColor = '#EFF6FF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Edit2 size={14} style={{ color: '#3B82F6' }} />
            </button>
          ) : (
            <button
              onClick={handleCancel}
              title="取消编辑"
              style={{
                padding: '4px 6px',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                transition: 'background-color 0.2s ease, transform 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.backgroundColor = '#F3F4F6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <X size={14} style={{ color: '#6B7280' }} />
            </button>
          )}
          <button
            onClick={() => onDelete(annotation.id)}
            title="删除标注"
            style={{
              padding: '4px 6px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'background-color 0.2s ease, transform 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.backgroundColor = '#FEE2E2';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Trash2 size={14} style={{ color: '#EF4444' }} />
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!isEditing ? (
          <motion.div
            key="view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <p
              style={{
                fontSize: `${annotation.fontSize}px`,
                color: annotation.color,
                textAlign: annotation.align,
                margin: 0,
                lineHeight: 1.6,
                wordBreak: 'break-word',
              }}
            >
              {annotation.text}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="edit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
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
                    zIndex: 1,
                  }}
                />
              )}
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  paddingLeft: isInputFocused ? '16px' : '12px',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: `${editFontSize}px`,
                  color: editColor,
                  resize: 'vertical',
                  minHeight: '60px',
                  outline: 'none',
                  fontFamily: 'system-ui, sans-serif',
                  textAlign: editAlign,
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
                <Type size={12} style={{ color: '#6B7280' }} />
                <span style={{ fontSize: '11px', color: '#6B7280' }}>字号: {editFontSize}px</span>
              </div>
              <input
                type="range"
                min="12"
                max="24"
                step="2"
                value={editFontSize}
                onChange={(e) => setEditFontSize(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <Palette size={12} style={{ color: '#6B7280' }} />
                <span style={{ fontSize: '11px', color: '#6B7280' }}>颜色</span>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setEditColor(color)}
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: color,
                      border: editColor === color ? '2px solid white' : '2px solid transparent',
                      cursor: 'pointer',
                      boxShadow: editColor === color
                        ? `0 0 0 2px ${color}, 0 2px 8px rgba(0,0,0,0.2)`
                        : '0 1px 3px rgba(0,0,0,0.1)',
                      transform: editColor === color ? 'scale(1.1)' : 'scale(1)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <AlignLeft size={12} style={{ color: '#6B7280' }} />
                <span style={{ fontSize: '11px', color: '#6B7280' }}>对齐</span>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[
                  { value: 'left' as const, icon: AlignLeft },
                  { value: 'center' as const, icon: AlignCenter },
                  { value: 'right' as const, icon: AlignRight },
                ].map(({ value, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setEditAlign(value)}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      backgroundColor: editAlign === value ? '#EFF6FF' : '#F3F4F6',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    <Icon
                      size={14}
                      style={{ color: editAlign === value ? '#3B82F6' : '#6B7280' }}
                      fill={editAlign === value ? '#3B82F6' : 'none'}
                    />
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={!editText.trim()}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: editText.trim() ? '#3B82F6' : '#D1D5DB',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: editText.trim() ? 'pointer' : 'not-allowed',
                fontSize: '13px',
                fontWeight: 500,
                transition: 'background-color 0.2s ease',
              }}
            >
              保存修改
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
