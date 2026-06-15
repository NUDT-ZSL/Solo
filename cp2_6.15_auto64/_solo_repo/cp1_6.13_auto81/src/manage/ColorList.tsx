import React, { useState, useCallback, memo } from 'react';
import { useColorContext, ColorScheme } from '../context/ColorContext';

const SchemeCard = memo(({
  scheme,
  isActive,
  isCompareSelected,
  compareModeEnabled,
  onSelect,
  onDelete,
  onToggleCompare,
  isLastScheme,
}: {
  scheme: ColorScheme;
  isActive: boolean;
  isCompareSelected: boolean;
  compareModeEnabled: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onToggleCompare: () => void;
  isLastScheme: boolean;
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const previewColors = scheme.tokens.slice(0, 5);

  const handleClick = useCallback(() => {
    if (compareModeEnabled) {
      onToggleCompare();
    } else {
      setIsPressed(true);
      setTimeout(() => setIsPressed(false), 200);
      onSelect();
    }
  }, [compareModeEnabled, onSelect, onToggleCompare]);

  return (
    <div
      onClick={handleClick}
      style={{
        width: '240px',
        height: '100px',
        borderRadius: '12px',
        backgroundColor: '#ffffff',
        boxShadow: isActive && !compareModeEnabled
          ? '0 0 0 2px var(--primary, #3b82f6), 0 2px 8px rgba(0,0,0,0.06)'
          : '0 2px 8px rgba(0,0,0,0.06)',
        padding: '14px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        transform: isPressed ? 'scale(0.98)' : isCompareSelected ? 'scale(1.02)' : 'scale(1)',
        position: 'relative',
        border: isCompareSelected ? '2px solid var(--primary, #3b82f6)' : '2px solid transparent',
        boxSizing: 'border-box',
      }}
      className="colorplay-scheme-card"
      onMouseEnter={(e) => {
        if (!isPressed) {
          e.currentTarget.style.transform = isCompareSelected ? 'scale(1.02)' : 'scale(1.02)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isPressed) {
          e.currentTarget.style.transform = isCompareSelected ? 'scale(1.02)' : 'scale(1)';
        }
      }}
    >
      {isCompareSelected && (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: 'var(--primary, #3b82f6)',
            color: '#ffffff',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
          }}
        >
          ✓
        </div>
      )}

      <div
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#1f2937',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          paddingRight: isCompareSelected ? '28px' : 0,
        }}
      >
        {scheme.name}
      </div>

      <div style={{ display: 'flex', gap: '6px' }}>
        {previewColors.map((token, idx) => (
          <div
            key={idx}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              backgroundColor: token.value,
              transition: 'transform 0.2s ease',
              border: '2px solid #ffffff',
              boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
            }}
            className="colorplay-color-dot"
          />
        ))}
        {scheme.tokens.length > 5 && (
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              backgroundColor: '#f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              color: '#6b7280',
              fontWeight: 500,
            }}
          >
            +{scheme.tokens.length - 5}
          </div>
        )}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        disabled={isLastScheme}
        style={{
          position: 'absolute',
          bottom: '8px',
          right: '8px',
          width: '24px',
          height: '24px',
          borderRadius: '4px',
          border: 'none',
          backgroundColor: 'transparent',
          color: isLastScheme ? '#d1d5db' : '#9ca3af',
          fontSize: '14px',
          cursor: isLastScheme ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0,
          transition: 'opacity 0.2s ease, color 0.2s ease',
        }}
        className="colorplay-delete-btn"
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1';
          if (!isLastScheme) {
            e.currentTarget.style.color = '#dc2626';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '0';
          if (!isLastScheme) {
            e.currentTarget.style.color = '#9ca3af';
          }
        }}
      >
        ×
      </button>
    </div>
  );
});

SchemeCard.displayName = 'SchemeCard';

export const ColorList: React.FC = () => {
  const { state, setCurrentScheme, deleteScheme, toggleCompareScheme, addScheme } = useColorContext();
  const [newSchemeName, setNewSchemeName] = useState('');
  const [showNewInput, setShowNewInput] = useState(false);

  const handleCreateScheme = useCallback(() => {
    const name = newSchemeName.trim() || `方案 ${state.schemes.length + 1}`;
    addScheme(name);
    setNewSchemeName('');
    setShowNewInput(false);
  }, [newSchemeName, state.schemes.length, addScheme]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateScheme();
    } else if (e.key === 'Escape') {
      setShowNewInput(false);
      setNewSchemeName('');
    }
  }, [handleCreateScheme]);

  return (
    <div
      style={{
        width: '280px',
        backgroundColor: '#f9fafb',
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#ffffff',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 600,
              color: '#1f2937',
            }}
          >
            配色方案
          </h2>
          <button
            onClick={() => setShowNewInput(true)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: 'var(--primary, #3b82f6)',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.filter = 'brightness(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'brightness(1)';
            }}
          >
            + 新建
          </button>
        </div>

        {showNewInput && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={newSchemeName}
              onChange={(e) => setNewSchemeName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入方案名称..."
              autoFocus
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                fontSize: '13px',
                outline: 'none',
              }}
            />
            <button
              onClick={handleCreateScheme}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: 'var(--primary, #3b82f6)',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              创建
            </button>
          </div>
        )}

        {state.compareSchemeIds.length > 0 && (
          <div
            style={{
              marginTop: '12px',
              padding: '8px 12px',
              backgroundColor: '#eff6ff',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#1d4ed8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>已选择 {state.compareSchemeIds.length} 个方案对比</span>
            <button
              onClick={() => {
                state.compareSchemeIds.forEach(id => toggleCompareScheme(id));
              }}
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                color: '#1d4ed8',
                cursor: 'pointer',
                fontSize: '12px',
                textDecoration: 'underline',
                padding: 0,
              }}
            >
              清除
            </button>
          </div>
        )}
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          alignItems: 'center',
        }}
      >
        {state.schemes.map(scheme => (
          <SchemeCard
            key={scheme.id}
            scheme={scheme}
            isActive={state.currentSchemeId === scheme.id}
            isCompareSelected={state.compareSchemeIds.includes(scheme.id)}
            compareModeEnabled={state.compareSchemeIds.length > 0}
            onSelect={() => setCurrentScheme(scheme.id)}
            onDelete={() => deleteScheme(scheme.id)}
            onToggleCompare={() => toggleCompareScheme(scheme.id)}
            isLastScheme={state.schemes.length <= 1}
          />
        ))}
      </div>
    </div>
  );
};
