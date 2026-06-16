import { useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react';
import type { Ship, TradeRecord } from '../types';

interface SidePanelProps {
  ship: Ship;
  gold: number;
  tradeRecords: TradeRecord[];
  onUpgradeHull: () => void;
  onUpgradeCannon: () => void;
}

const ITEM_HEIGHT = 60;
const MAX_LEVEL = 5;
const LIST_MAX_HEIGHT = 300;

const SidePanel: React.FC<SidePanelProps> = ({
  ship,
  gold,
  tradeRecords,
  onUpgradeHull,
  onUpgradeCannon,
}) => {
  const [scrollOffset, setScrollOffset] = useState(0);
  const [containerHeight, setContainerHeight] = useState(LIST_MAX_HEIGHT);
  const listRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (listRef.current) {
      const h = Math.min(LIST_MAX_HEIGHT, listRef.current.clientHeight);
      setContainerHeight(h || LIST_MAX_HEIGHT);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (listRef.current) {
        setContainerHeight(Math.min(LIST_MAX_HEIGHT, listRef.current.clientHeight));
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleScroll = useCallback(() => {
    if (listRef.current) {
      setScrollOffset(listRef.current.scrollTop);
    }
  }, []);

  const durabilityPct = ship.maxDurability > 0
    ? (ship.durability / ship.maxDurability) * 100
    : 0;

  const durabilityColor =
    durabilityPct < 30 ? '#E63946' : durabilityPct < 60 ? '#F4A261' : '#2A9D8F';

  const hullCost = ship.hullLevel * 200;
  const cannonCost = ship.cannonLevel * 150;
  const hullMaxed = ship.hullLevel >= MAX_LEVEL;
  const cannonMaxed = ship.cannonLevel >= MAX_LEVEL;
  const hullDisabled = hullMaxed || gold < hullCost;
  const cannonDisabled = cannonMaxed || gold < cannonCost;

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const visibleCount = Math.ceil(containerHeight / ITEM_HEIGHT) + 2;
  const startIndex = Math.max(0, Math.floor(scrollOffset / ITEM_HEIGHT) - 1);
  const endIndex = Math.min(tradeRecords.length, startIndex + visibleCount + 2);
  const totalHeight = tradeRecords.length * ITEM_HEIGHT;
  const offsetY = startIndex * ITEM_HEIGHT;
  const visibleRecords = tradeRecords.slice(startIndex, endIndex);

  const upgradeBtnStyle = (disabled: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '8px 12px',
    background: 'transparent',
    border: '2px solid #F4A261',
    borderRadius: 6,
    color: disabled ? 'rgba(241,250,238,0.4)' : '#F1FAEE',
    fontSize: 13,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'transform 0.2s, opacity 0.2s',
    opacity: disabled ? 0.5 : 1,
    marginBottom: 8,
    boxSizing: 'border-box',
  });

  const renderRecords = () => {
    if (tradeRecords.length === 0) {
      return (
        <div style={{ textAlign: 'center', opacity: 0.5, padding: '16px 0', fontSize: 13 }}>
          暂无记录
        </div>
      );
    }

    return (
      <div style={{ position: 'relative', height: totalHeight }}>
        <div style={{ position: 'absolute', top: offsetY, left: 0, right: 0 }}>
          {visibleRecords.map((record, i) => {
            const actualIndex = startIndex + i;
            return (
              <div
                key={record.id}
                style={{
                  position: 'absolute',
                  top: actualIndex * ITEM_HEIGHT - offsetY,
                  left: 0,
                  right: 0,
                  height: ITEM_HEIGHT,
                  borderBottom: '1px solid rgba(241,250,238,0.1)',
                  padding: '6px 0',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 12, opacity: 0.6 }}>
                    {formatTime(record.timestamp)}
                  </span>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 13,
                      color: record.profit >= 0 ? '#2A9D8F' : '#E63946',
                    }}
                  >
                    {record.profit >= 0 ? '+' : ''}{record.profit} 金
                  </span>
                </div>
                <div style={{ fontSize: 12, marginBottom: 2 }}>
                  {record.fromPort} → {record.toPort}
                </div>
                {record.events.length > 0 && (
                  <div style={{ fontSize: 11, opacity: 0.6 }}>
                    {record.events.join(', ')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        background: 'linear-gradient(to bottom, #1D3557, #457B9D)',
        borderRadius: 8,
        padding: 20,
        height: '100%',
        overflowY: 'auto',
        color: '#F1FAEE',
        boxSizing: 'border-box',
      }}
    >
      <h3
        style={{
          margin: '0 0 12px 0',
          fontFamily: 'Cinzel, serif',
          fontSize: 16,
          color: '#F1FAEE',
        }}
      >
        🚢 船只状态
      </h3>

      <div style={{ fontSize: 13, marginBottom: 6 }}>
        船体等级: {ship.hullLevel}
      </div>
      <div style={{ fontSize: 13, marginBottom: 6 }}>
        火炮等级: {ship.cannonLevel}
      </div>
      <div style={{ fontSize: 13, marginBottom: 6 }}>
        载重: {ship.maxCapacity} 吨
      </div>

      <div style={{ fontSize: 13, marginBottom: 4 }}>耐久度</div>
      <div
        style={{
          width: '100%',
          height: 18,
          background: 'rgba(0,0,0,0.3)',
          borderRadius: 4,
          overflow: 'hidden',
          marginBottom: 16,
          position: 'relative',
        }}
      >
        <div
          style={{
            width: `${durabilityPct}%`,
            height: '100%',
            background: durabilityColor,
            borderRadius: 4,
            transition: 'width 0.3s',
          }}
        />
        <span
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: 11,
            fontWeight: 600,
            color: '#F1FAEE',
          }}
        >
          {Math.round(durabilityPct)}%
        </span>
      </div>

      <div style={{ fontSize: 18, fontWeight: 700, color: '#F4A261', marginBottom: 20 }}>
        💰 金币: {gold}
      </div>

      <h3 style={{ margin: '0 0 10px 0', fontSize: 15, color: '#F1FAEE' }}>
        🔧 升级
      </h3>

      <button
        disabled={hullDisabled}
        onClick={onUpgradeHull}
        style={upgradeBtnStyle(hullDisabled)}
        onMouseEnter={(e) => {
          if (!hullDisabled) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
        }}
      >
        升级船体 Lv.{ship.hullLevel}/{MAX_LEVEL} — {hullMaxed ? '已满级' : `${hullCost} 金`}
      </button>

      <button
        disabled={cannonDisabled}
        onClick={onUpgradeCannon}
        style={upgradeBtnStyle(cannonDisabled)}
        onMouseEnter={(e) => {
          if (!cannonDisabled) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
        }}
      >
        升级火炮 Lv.{ship.cannonLevel}/{MAX_LEVEL} — {cannonMaxed ? '已满级' : `${cannonCost} 金`}
      </button>

      <h3 style={{ margin: '16px 0 10px 0', fontSize: 15, color: '#F1FAEE' }}>
        📜 贸易记录
      </h3>

      <div
        ref={listRef}
        onScroll={handleScroll}
        style={{ overflowY: 'auto', maxHeight: LIST_MAX_HEIGHT }}
      >
        {renderRecords()}
      </div>
    </div>
  );
};

export default SidePanel;
