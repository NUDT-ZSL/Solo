import React, { useState, useCallback, memo } from 'react';
import { useColorContext, ColorToken } from '../context/ColorContext';

const TokenItem = memo(({
  token,
  index,
  schemeId,
  onUpdate,
  onDelete,
  canDelete,
}: {
  token: ColorToken;
  index: number;
  schemeId: string;
  onUpdate: (index: number, token: ColorToken) => void;
  onDelete: (index: number) => void;
  canDelete: boolean;
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(token.name);

  const handleColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(index, { ...token, value: e.target.value });
  }, [index, token, onUpdate]);

  const handleNameSave = useCallback(() => {
    let newName = editName.trim();
    if (!newName.startsWith('--')) {
      newName = '--' + newName;
    }
    if (newName !== token.name) {
      onUpdate(index, { ...token, name: newName });
    }
    setIsEditingName(false);
  }, [editName, index, token, onUpdate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setEditName(token.name);
      setIsEditingName(false);
    }
  }, [handleNameSave, token.name]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        borderRadius: '8px',
        backgroundColor: '#f9fafb',
        transition: 'background-color 0.2s ease',
      }}
      className="colorplay-token-item"
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#f3f4f6';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#f9fafb';
      }}
    >
      <div style={{ position: 'relative' }}>
        <input
          type="color"
          value={token.value}
          onChange={handleColorChange}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: '2px solid #ffffff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            cursor: 'pointer',
            padding: 0,
            appearance: 'none',
            WebkitAppearance: 'none',
            backgroundColor: 'transparent',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: token.value,
            pointerEvents: 'none',
            border: '2px solid #ffffff',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
        {isEditingName ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={handleKeyDown}
            autoFocus
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              padding: '2px 6px',
              outline: 'none',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          />
        ) : (
          <span
            onClick={() => setIsEditingName(true)}
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: '#374151',
              cursor: 'pointer',
              fontFamily: "'JetBrains Mono', monospace",
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {token.name}
          </span>
        )}
        <span
          style={{
            fontSize: '12px',
            color: '#6b7280',
            fontFamily: "'JetBrains Mono', monospace",
            textTransform: 'uppercase',
          }}
        >
          {token.value}
        </span>
      </div>

      <button
        onClick={() => onDelete(index)}
        disabled={!canDelete}
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '6px',
          border: 'none',
          backgroundColor: canDelete ? '#fee2e2' : '#f3f4f6',
          color: canDelete ? '#dc2626' : '#9ca3af',
          cursor: canDelete ? 'pointer' : 'not-allowed',
          fontSize: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background-color 0.2s ease',
          padding: 0,
        }}
        onMouseEnter={(e) => {
          if (canDelete) {
            e.currentTarget.style.backgroundColor = '#fecaca';
          }
        }}
        onMouseLeave={(e) => {
          if (canDelete) {
            e.currentTarget.style.backgroundColor = '#fee2e2';
          }
        }}
      >
        ×
      </button>
    </div>
  );
});

TokenItem.displayName = 'TokenItem';

export const ColorEditor: React.FC = () => {
  const { state, getCurrentScheme, updateToken, addToken, deleteToken } = useColorContext();
  const currentScheme = getCurrentScheme();

  const handleUpdateToken = useCallback((schemeId: string, index: number, token: ColorToken) => {
    updateToken(schemeId, index, token);
  }, [updateToken]);

  const handleAddToken = useCallback(() => {
    if (currentScheme) {
      addToken(currentScheme.id);
    }
  }, [currentScheme, addToken]);

  const handleDeleteToken = useCallback((index: number) => {
    if (currentScheme) {
      deleteToken(currentScheme.id, index);
    }
  }, [currentScheme, deleteToken]);

  if (!currentScheme) {
    return (
      <div
        style={{
          padding: '20px',
          textAlign: 'center',
          color: '#9ca3af',
          fontSize: '14px',
        }}
      >
        请选择一个配色方案进行编辑
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '20px',
        borderTop: '1px solid #e5e7eb',
        backgroundColor: '#ffffff',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '15px',
            fontWeight: 600,
            color: '#1f2937',
          }}
        >
          {currentScheme.name} - 颜色变量
        </h3>
        <button
          onClick={handleAddToken}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            backgroundColor: '#ffffff',
            color: '#374151',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f9fafb';
            e.currentTarget.style.borderColor = '#9ca3af';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff';
            e.currentTarget.style.borderColor = '#d1d5db';
          }}
        >
          + 添加变量
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {currentScheme.tokens.map((token, index) => (
          <TokenItem
            key={`${currentScheme.id}-${index}-${token.name}`}
            token={token}
            index={index}
            schemeId={currentScheme.id}
            onUpdate={(idx, t) => handleUpdateToken(currentScheme.id, idx, t)}
            onDelete={handleDeleteToken}
            canDelete={currentScheme.tokens.length > 1}
          />
        ))}
      </div>
    </div>
  );
};
