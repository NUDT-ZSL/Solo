import React, { useState, useCallback, useEffect } from 'react';

interface SeasoningPortion {
  name: string;
  portion: number;
}

interface SeasoningDef {
  name: string;
  color: string;
  border: string;
  emoji: string;
}

const SEASONINGS: SeasoningDef[] = [
  { name: '盐', color: '#FFFFFF', border: '#D0C8B8', emoji: '🧂' },
  { name: '糖', color: '#FFB6C1', border: '#FF8FA3', emoji: '🍬' },
  { name: '酱油', color: '#5C4033', border: '#3E2723', emoji: '🫗' },
  { name: '醋', color: '#DAA520', border: '#B8860B', emoji: '🍶' },
  { name: '辣椒油', color: '#DC143C', border: '#B22222', emoji: '🌶️' },
  { name: '芝麻油', color: '#CD853F', border: '#8B5A2B', emoji: '🫒' },
  { name: '蚝油', color: '#2F4F4F', border: '#1C3333', emoji: '🥄' },
  { name: '料酒', color: '#DEB887', border: '#C19A6B', emoji: '🍾' },
];

const MAX_PORTION = 3;
const MAX_TOTAL = 10;

interface Props {
  onSubmit: (dishName: string, seasonings: SeasoningPortion[]) => void;
  onOverflow: () => void;
}

const RecordPanel: React.FC<Props> = ({ onSubmit, onOverflow }) => {
  const [dishName, setDishName] = useState('');
  const [portions, setPortions] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    SEASONINGS.forEach((s) => (init[s.name] = 0));
    return init;
  });
  const [lastIncrement, setLastIncrement] = useState<Record<string, boolean>>({});
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const total = Object.values(portions).reduce((a, b) => a + b, 0);

  const handleClick = useCallback(
    (name: string) => {
      setPortions((prev) => {
        const current = prev[name];
        const wasIncrement = lastIncrement[name];

        if (current === 0) {
          if (total >= MAX_TOTAL) {
            onOverflow();
            return prev;
          }
          setLastIncrement((p) => ({ ...p, [name]: true }));
          return { ...prev, [name]: 1 };
        }

        if (current > 0 && current < MAX_PORTION && wasIncrement) {
          if (total >= MAX_TOTAL) {
            onOverflow();
            return prev;
          }
          setLastIncrement((p) => ({ ...p, [name]: true }));
          return { ...prev, [name]: current + 1 };
        }

        if (current === MAX_PORTION) {
          setLastIncrement((p) => ({ ...p, [name]: false }));
          return { ...prev, [name]: current - 1 };
        }

        if (!wasIncrement) {
          setLastIncrement((p) => ({ ...p, [name]: false }));
          return { ...prev, [name]: current - 1 };
        }

        if (total >= MAX_TOTAL) {
          setLastIncrement((p) => ({ ...p, [name]: false }));
          return { ...prev, [name]: current - 1 };
        }

        setLastIncrement((p) => ({ ...p, [name]: true }));
        return { ...prev, [name]: current + 1 };
      });
    },
    [lastIncrement, total, onOverflow]
  );

  const handleSubmit = useCallback(() => {
    const seasonings: SeasoningPortion[] = SEASONINGS.map((s) => ({
      name: s.name,
      portion: portions[s.name],
    })).filter((s) => s.portion > 0);

    if (seasonings.length === 0) return;
    onSubmit(dishName || '未命名菜品', seasonings);
  }, [dishName, portions, onSubmit]);

  const handleReset = useCallback(() => {
    setDishName('');
    const init: Record<string, number> = {};
    SEASONINGS.forEach((s) => (init[s.name] = 0));
    setPortions(init);
    setLastIncrement({});
  }, []);

  const hasActive = total > 0;

  return (
    <div style={{ ...styles.panel, ...(isMobile ? styles.panelMobile : {}) }}>
      <div style={styles.inputRow}>
        <div style={styles.dishInputWrapper}>
          <span style={styles.inputIcon}>🍳</span>
          <input
            type="text"
            placeholder="输入菜品名称，如：红烧肉"
            value={dishName}
            onChange={(e) => setDishName(e.target.value)}
            style={styles.dishInput}
          />
        </div>
      </div>

      <div style={styles.totalRow}>
        <span style={styles.totalLabel}>总份量</span>
        <span
          style={{
            ...styles.totalValue,
            color: total >= MAX_TOTAL ? '#DC143C' : '#FF8C42',
          }}
        >
          {total}
        </span>
        <span style={styles.totalMax}> / {MAX_TOTAL}</span>
      </div>

      <div
        style={{
          ...styles.grid,
          ...(isMobile ? styles.gridMobile : {}),
        }}
      >
        {SEASONINGS.map((s) => {
          const p = portions[s.name];
          const active = p > 0;
          return (
            <div key={s.name} style={styles.seasoningItem}>
              <div
                style={{
                  ...styles.portionBadge,
                  opacity: active ? 1 : 0,
                  transform: active ? 'translateY(0)' : 'translateY(8px)',
                  backgroundColor: active ? '#FF8C42' : '#CCCCCC',
                }}
              >
                {p}
              </div>
              <button
                onClick={() => handleClick(s.name)}
                style={{
                  ...styles.circle,
                  backgroundColor: s.color,
                  border: `3px solid ${active ? '#FF8C42' : s.border}`,
                  boxShadow: active
                    ? `0 0 0 3px rgba(255,140,66,0.3), 0 6px 16px rgba(0,0,0,0.15)`
                    : '0 4px 10px rgba(0,0,0,0.1)',
                  transform: active ? 'scale(1.05)' : 'scale(1)',
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
                onMouseUp={(e) =>
                  (e.currentTarget.style.transform = active ? 'scale(1.05)' : 'scale(1)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = active ? 'scale(1.05)' : 'scale(1)')
                }
              >
                <span style={styles.emoji}>{s.emoji}</span>
              </button>
              <div style={styles.seasoningName}>{s.name}</div>
            </div>
          );
        })}
      </div>

      <div style={styles.btnRow}>
        <button
          onClick={handleReset}
          style={{
            ...styles.btn,
            ...styles.btnSecondary,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#C0B09A')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#D7CCC0')}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          🔄 重置
        </button>
        <button
          onClick={handleSubmit}
          disabled={!hasActive}
          style={{
            ...styles.btn,
            ...styles.btnPrimary,
            ...(hasActive ? {} : styles.btnDisabled),
          }}
          onMouseEnter={(e) => {
            if (hasActive) e.currentTarget.style.backgroundColor = '#E07030';
          }}
          onMouseLeave={(e) => {
            if (hasActive) e.currentTarget.style.backgroundColor = '#FF8C42';
          }}
          onMouseDown={(e) => {
            if (hasActive) e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          ✨ 生成图谱
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
    padding: '20px 32px',
    backgroundColor: '#FFEBD6',
    borderBottom: '1px solid #E8D5BE',
  },
  panelMobile: {
    padding: '16px',
  },
  inputRow: {
    marginBottom: 14,
  },
  dishInputWrapper: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#FFF8F0',
    borderRadius: 10,
    padding: '0 12px',
    border: '2px solid #E8D5BE',
    transition: 'border-color 0.2s',
  },
  inputIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  dishInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    height: 42,
    fontSize: 15,
    color: '#3E2723',
    fontFamily: 'inherit',
  },
  totalRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 4,
  },
  totalLabel: {
    fontSize: 14,
    color: '#8D6E63',
    marginRight: 8,
  },
  totalValue: {
    fontSize: 26,
    fontWeight: 800,
    transition: 'color 0.2s',
  },
  totalMax: {
    fontSize: 14,
    color: '#A0896E',
    marginLeft: 2,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '18px 16px',
    maxWidth: 420,
    margin: '0 auto',
    justifyItems: 'center',
  },
  gridMobile: {
    gridTemplateColumns: 'repeat(4, 1fr)',
    maxWidth: '100%',
    gap: '14px 10px',
  },
  seasoningItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    position: 'relative',
    width: 76,
  },
  portionBadge: {
    position: 'absolute',
    top: -4,
    right: 2,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    color: '#FFF',
    fontSize: 12,
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    padding: '0 6px',
    zIndex: 2,
    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
  },
  circle: {
    width: 60,
    height: 60,
    borderRadius: '50%',
    border: '3px solid',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)',
    outline: 'none',
    padding: 0,
  },
  emoji: {
    fontSize: 24,
    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))',
  },
  seasoningName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#5C4033',
  },
  btnRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: 14,
    marginTop: 18,
  },
  btn: {
    padding: '10px 28px',
    borderRadius: 10,
    border: 'none',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontFamily: 'inherit',
  },
  btnPrimary: {
    backgroundColor: '#FF8C42',
    color: '#FFF',
    boxShadow: '0 4px 12px rgba(255,140,66,0.35)',
  },
  btnSecondary: {
    backgroundColor: '#D7CCC0',
    color: '#5C4033',
  },
  btnDisabled: {
    backgroundColor: '#D7CCC0',
    color: '#A0896E',
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
};

export default RecordPanel;
