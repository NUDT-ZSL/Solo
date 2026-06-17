import { useState, useEffect, ChangeEvent } from 'react';
import { Card, ValidationErrors, validateCard } from './CardData';

interface CardEditorProps {
  card: Partial<Card>;
  onCardChange: (card: Partial<Card>) => void;
  onSave: () => void;
  onStartBattle: () => void;
  savedMessage: string | null;
  restoreMessage: string | null;
}

export default function CardEditor({
  card,
  onCardChange,
  onSave,
  onStartBattle,
  savedMessage,
  restoreMessage
}: CardEditorProps) {
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSavePressed, setIsSavePressed] = useState(false);
  const [isBattlePressed, setIsBattlePressed] = useState(false);
  const [showSavedBadge, setShowSavedBadge] = useState(false);

  useEffect(() => {
    if (savedMessage) {
      setShowSavedBadge(true);
      const timer = setTimeout(() => {
        setShowSavedBadge(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [savedMessage]);

  useEffect(() => {
    const validationErrors = validateCard(card);
    setErrors(validationErrors);
  }, [card]);

  const handleInputChange = (
    field: keyof Card,
    value: string | number
  ) => {
    const newValue =
      field === 'name' ? (value as string) : Number(value) || 0;
    onCardChange({ ...card, [field]: newValue });
  };

  const handleSaveClick = () => {
    setIsSavePressed(true);
    setTimeout(() => setIsSavePressed(false), 150);
    onSave();
  };

  const handleBattleClick = () => {
    setIsBattlePressed(true);
    setTimeout(() => setIsBattlePressed(false), 150);
    onStartBattle();
  };

  const isValid = Object.keys(errors).length === 0;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>卡牌编辑器</h2>

      {restoreMessage && (
        <div style={styles.restoreBanner}>
          {restoreMessage}
        </div>
      )}

      <div style={styles.formGroup}>
        <label style={styles.label}>卡牌名称（最多10字符）</label>
        <input
          type="text"
          value={card.name || ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            handleInputChange('name', e.target.value)
          }
          maxLength={10}
          style={{
            ...styles.input,
            borderColor: errors.name ? '#F44336' : '#0F3460'
          }}
          placeholder="输入卡牌名称"
        />
        {errors.name && <span style={styles.errorText}>{errors.name}</span>}
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>消耗费用（0-10）</label>
        <input
          type="number"
          min={0}
          max={10}
          value={card.cost ?? ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            handleInputChange('cost', e.target.value)
          }
          style={{
            ...styles.input,
            borderColor: errors.cost ? '#F44336' : '#0F3460'
          }}
          placeholder="0-10"
        />
        {errors.cost && <span style={styles.errorText}>{errors.cost}</span>}
      </div>

      <div style={styles.row}>
        <div style={{ ...styles.formGroup, ...styles.halfWidth }}>
          <label style={styles.label}>攻击力（0-20）</label>
          <input
            type="number"
            min={0}
            max={20}
            value={card.attack ?? ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              handleInputChange('attack', e.target.value)
            }
            style={{
              ...styles.input,
              borderColor: errors.attack ? '#F44336' : '#0F3460'
            }}
            placeholder="0-20"
          />
          {errors.attack && (
            <span style={styles.errorText}>{errors.attack}</span>
          )}
        </div>

        <div style={{ ...styles.formGroup, ...styles.halfWidth }}>
          <label style={styles.label}>生命值（0-20）</label>
          <input
            type="number"
            min={0}
            max={20}
            value={card.health ?? ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              handleInputChange('health', e.target.value)
            }
            style={{
              ...styles.input,
              borderColor: errors.health ? '#F44336' : '#0F3460'
            }}
            placeholder="0-20"
          />
          {errors.health && (
            <span style={styles.errorText}>{errors.health}</span>
          )}
        </div>
      </div>

      <div style={styles.buttonRow}>
        <div style={styles.saveButtonWrapper}>
          <button
            onClick={handleSaveClick}
            disabled={!isValid}
            style={{
              ...styles.button,
              ...styles.saveButton,
              opacity: isValid ? 1 : 0.5,
              cursor: isValid ? 'pointer' : 'not-allowed',
              transform: isSavePressed ? 'scale(0.95)' : 'scale(1)',
              flex: 1
            }}
          >
            保存卡牌
          </button>
          <div
            style={{
              ...styles.savedBadge,
              opacity: showSavedBadge ? 1 : 0,
              transform: showSavedBadge
                ? 'translateX(0) scale(1)'
                : 'translateX(10px) scale(0.85)',
              pointerEvents: showSavedBadge ? 'auto' : 'none'
            }}
          >
            <span style={styles.savedBadgeCheck}>✓</span>
            <span style={styles.savedBadgeText}>已保存</span>
          </div>
        </div>
        <button
          onClick={handleBattleClick}
          disabled={!isValid}
          style={{
            ...styles.button,
            ...styles.battleButton,
            opacity: isValid ? 1 : 0.5,
            cursor: isValid ? 'pointer' : 'not-allowed',
            transform: isBattlePressed ? 'scale(0.95)' : 'scale(1)',
            flex: 1
          }}
        >
          战斗测试
        </button>
      </div>

      {savedMessage && (
        <p style={styles.successMessage}>{savedMessage}</p>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    minHeight: '100%'
  },
  title: {
    color: '#E2E8F0',
    fontSize: '22px',
    fontWeight: 600,
    margin: '0 0 8px 0'
  },
  restoreBanner: {
    backgroundColor: '#2196F3',
    color: '#FFFFFF',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    color: '#CBD5E1',
    fontSize: '14px',
    fontWeight: 500
  },
  input: {
    backgroundColor: '#0F3460',
    border: '2px solid #0F3460',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#E2E8F0',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s ease'
  },
  errorText: {
    color: '#F44336',
    fontSize: '12px',
    fontWeight: 500
  },
  row: {
    display: 'flex',
    gap: '16px'
  },
  halfWidth: {
    flex: 1
  },
  buttonRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px'
  },
  button: {
    flex: 1,
    padding: '12px 20px',
    border: 'none',
    borderRadius: '8px',
    color: '#FFFFFF',
    fontSize: '15px',
    fontWeight: 600,
    transition: 'transform 0.15s ease, opacity 0.2s ease'
  },
  saveButtonWrapper: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    position: 'relative'
  },
  saveButton: {
    backgroundColor: '#3B82F6'
  },
  savedBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#10B981',
    padding: '6px 12px',
    borderRadius: '20px',
    boxShadow: '0 2px 10px rgba(16, 185, 129, 0.4)',
    transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
    flexShrink: 0,
    whiteSpace: 'nowrap'
  },
  savedBadgeCheck: {
    color: '#FFFFFF',
    fontWeight: 800,
    fontSize: '13px',
    lineHeight: 1
  },
  savedBadgeText: {
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: '12px',
    lineHeight: 1
  },
  battleButton: {
    backgroundColor: '#F59E0B'
  },
  successMessage: {
    color: '#10B981',
    fontSize: '14px',
    fontWeight: 500,
    margin: '4px 0 0 0'
  }
};
