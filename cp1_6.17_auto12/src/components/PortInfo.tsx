import { useState, useRef, useCallback, useEffect } from 'react';
import type { Port, CargoItem, Ship, Good } from '../types';
import {
  calculateRouteDistance,
  calculateVoyageDuration,
  calculateCargoProfit,
} from '../GameEngine';

interface PortInfoProps {
  port: Port;
  destinationPort: Port | null;
  cargo: CargoItem[];
  ship: Ship;
  onAddCargo: (goodId: string, quantity: number, goods: Good[]) => void;
  onRemoveCargo: (goodId: string) => void;
  onStartVoyage: () => void;
  onClose: () => void;
}

const GOOD_ITEM_HEIGHT = 88;
const GOODS_LIST_MAX_HEIGHT = 220;

const PortInfo: React.FC<PortInfoProps> = ({
  port,
  destinationPort,
  cargo,
  ship,
  onAddCargo,
  onRemoveCargo,
  onStartVoyage,
  onClose,
}) => {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [scrollTop, setScrollTop] = useState(0);
  const [listHeight, setListHeight] = useState(GOODS_LIST_MAX_HEIGHT);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      setListHeight(Math.min(GOODS_LIST_MAX_HEIGHT, port.goods.length * GOOD_ITEM_HEIGHT));
    }
  }, [port.goods.length]);

  const handleScroll = useCallback(() => {
    if (listRef.current) {
      setScrollTop(listRef.current.scrollTop);
    }
  }, []);

  const currentWeight = cargo.reduce((sum, item) => sum + item.good.weight * item.quantity, 0);
  const remainingCapacity = ship.maxCapacity - currentWeight;

  const getDestSellPrice = (good: Good): number | null => {
    if (!destinationPort) return null;
    const exists = destinationPort.goods.some((g) => g.id === good.id);
    return exists ? good.sellPrice : Math.floor(good.sellPrice * 0.5);
  };

  const getMaxQuantity = (good: Good): number => {
    return Math.floor(remainingCapacity / good.weight);
  };

  const estimatedVoyageTime = destinationPort
    ? calculateVoyageDuration(calculateRouteDistance(port, destinationPort))
    : null;

  const estimatedProfit = destinationPort ? calculateCargoProfit(cargo, destinationPort) : 0;

  const canSetSail = cargo.length > 0 && !!destinationPort;

  const totalGoodsHeight = port.goods.length * GOOD_ITEM_HEIGHT;
  const visibleCount = Math.ceil(listHeight / GOOD_ITEM_HEIGHT) + 1;
  const startIndex = Math.max(0, Math.floor(scrollTop / GOOD_ITEM_HEIGHT) - 1);
  const endIndex = Math.min(port.goods.length, startIndex + visibleCount + 2);
  const offsetY = startIndex * GOOD_ITEM_HEIGHT;
  const visibleGoods = port.goods.slice(startIndex, endIndex);

  const renderGoodItem = (good: Good, index: number) => {
    const maxQty = getMaxQuantity(good);
    const qty = quantities[good.id] ?? 0;
    const destPrice = getDestSellPrice(good);
    const actualIndex = startIndex + index;

    return (
      <div
        key={good.id}
        style={{
          position: 'absolute',
          top: actualIndex * GOOD_ITEM_HEIGHT - offsetY,
          left: 0,
          right: 0,
          height: GOOD_ITEM_HEIGHT,
          boxSizing: 'border-box',
          paddingBottom: 6,
        }}
      >
        <div
          style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 8,
            padding: 8,
            height: '100%',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 16 }}>{good.emoji}</span>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{good.name}</span>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(241,250,238,0.7)', marginBottom: 4 }}>
            <div>买入: {good.basePrice} 金</div>
            <div>
              卖出: {destPrice !== null ? `${destPrice} 金` : `${good.sellPrice} 金`}
              {destPrice !== null && destinationPort && !destinationPort.goods.some((g) => g.id === good.id) && (
                <span style={{ color: '#E63946', marginLeft: 4 }}>(-50%)</span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="number"
              min={0}
              max={maxQty}
              value={qty}
              onChange={(e) => {
                const val = Math.min(maxQty, Math.max(0, Number(e.target.value) || 0));
                setQuantities((prev) => ({ ...prev, [good.id]: val }));
              }}
              style={{
                width: 50,
                padding: '2px 4px',
                borderRadius: 4,
                border: '1px solid rgba(241,250,238,0.3)',
                background: 'rgba(255,255,255,0.1)',
                color: '#F1FAEE',
                fontSize: 12,
                textAlign: 'center',
              }}
            />
            <button
              onClick={() => {
                if (qty > 0) {
                  onAddCargo(good.id, qty, port.goods);
                  setQuantities((prev) => ({ ...prev, [good.id]: 0 }));
                }
              }}
              disabled={qty <= 0 || maxQty <= 0}
              style={{
                background: '#E63946',
                color: '#F1FAEE',
                border: 'none',
                borderRadius: 4,
                padding: '2px 8px',
                fontSize: 11,
                cursor: qty > 0 && maxQty > 0 ? 'pointer' : 'not-allowed',
                opacity: qty > 0 && maxQty > 0 ? 1 : 0.5,
                transition: 'all 0.1s ease',
              }}
              onMouseEnter={(e) => {
                if (qty > 0 && maxQty > 0) (e.currentTarget as HTMLButtonElement).style.background = '#FF6B6B';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#E63946';
                (e.currentTarget as HTMLButtonElement).style.transform = '';
              }}
              onMouseDown={(e) => {
                if (qty > 0 && maxQty > 0) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)';
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = '';
              }}
            >
              装载
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        background: 'rgba(41, 50, 65, 0.92)',
        borderRadius: 12,
        padding: 16,
        width: 260,
        color: '#F1FAEE',
        position: 'relative',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          background: 'transparent',
          border: 'none',
          color: '#F1FAEE',
          fontSize: 18,
          cursor: 'pointer',
          lineHeight: 1,
        }}
      >
        ✕
      </button>

      <h3
        style={{
          margin: '0 0 12px 0',
          color: '#F1FAEE',
          fontFamily: 'Cinzel, serif',
          fontSize: 18,
        }}
      >
        {port.name}
      </h3>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>港口货物</div>
        <div
          ref={listRef}
          onScroll={handleScroll}
          style={{
            position: 'relative',
            overflowY: 'auto',
            maxHeight: GOODS_LIST_MAX_HEIGHT,
          }}
        >
          <div style={{ position: 'relative', height: totalGoodsHeight }}>
            {visibleGoods.map((good, i) => renderGoodItem(good, i))}
          </div>
        </div>
      </div>

      {cargo.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            当前装载 ({currentWeight}/{ship.maxCapacity})
          </div>
          {cargo.map((item) => (
            <div
              key={item.good.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 6,
                padding: '4px 8px',
                marginBottom: 4,
                fontSize: 12,
              }}
            >
              <span>
                {item.good.emoji} {item.good.name} ×{item.quantity}
                <span style={{ color: 'rgba(241,250,238,0.5)', marginLeft: 4 }}>
                  ({item.good.weight * item.quantity})
                </span>
              </span>
              <button
                onClick={() => onRemoveCargo(item.good.id)}
                style={{
                  background: 'rgba(230,57,70,0.3)',
                  color: '#F1FAEE',
                  border: '1px solid rgba(230,57,70,0.5)',
                  borderRadius: 4,
                  padding: '1px 6px',
                  fontSize: 11,
                  cursor: 'pointer',
                  transition: 'all 0.1s ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(230,57,70,0.6)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(230,57,70,0.3)';
                  (e.currentTarget as HTMLButtonElement).style.transform = '';
                }}
                onMouseDown={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)';
                }}
                onMouseUp={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = '';
                }}
              >
                卸载
              </button>
            </div>
          ))}
        </div>
      )}

      {destinationPort && (
        <div style={{ marginBottom: 12, fontSize: 12, color: 'rgba(241,250,238,0.8)' }}>
          <div>目的港: {destinationPort.name}</div>
          {estimatedVoyageTime !== null && (
            <div>预计航时: {Math.ceil(estimatedVoyageTime / 1000)} 秒</div>
          )}
          {cargo.length > 0 && (
            <div>预计利润: {estimatedProfit} 金</div>
          )}
        </div>
      )}

      {cargo.length > 0 && (
        <button
          onClick={onStartVoyage}
          disabled={!canSetSail}
          style={{
            width: '100%',
            padding: '8px 0',
            background: canSetSail ? '#E63946' : 'rgba(230,57,70,0.3)',
            color: '#F1FAEE',
            border: 'none',
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
            cursor: canSetSail ? 'pointer' : 'not-allowed',
            transition: 'all 0.1s ease',
          }}
          onMouseEnter={(e) => {
            if (canSetSail) (e.currentTarget as HTMLButtonElement).style.background = '#FF6B6B';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = canSetSail ? '#E63946' : 'rgba(230,57,70,0.3)';
            (e.currentTarget as HTMLButtonElement).style.transform = '';
          }}
          onMouseDown={(e) => {
            if (canSetSail) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = '';
          }}
        >
          确认出发
        </button>
      )}
    </div>
  );
};

export default PortInfo;
