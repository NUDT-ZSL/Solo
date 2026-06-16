import { useState, useEffect, useRef } from 'react';
import {
  getQualityStars,
  getPriceRange,
  getQualityLabel,
  type Quality,
} from './potionEngine';
import './Inventory.css';

export interface PotionInventoryItem {
  id: string;
  name: string;
  quality: Quality;
  quantity: number;
  price: number;
}

interface InventoryProps {
  newPotion: { name: string; quality: Quality; quantity: number } | null;
  onGoldChange: (amount: number) => void;
  gold: number;
}

export default function Inventory({ newPotion, onGoldChange, gold }: InventoryProps) {
  const [inventory, setInventory] = useState<PotionInventoryItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [todayIncome, setTodayIncome] = useState(0);
  const [displayIncome, setDisplayIncome] = useState(0);
  const [isSettling, setIsSettling] = useState(false);
  const [newItemIds, setNewItemIds] = useState<Set<string>>(new Set());

  const animationRef = useRef<number | null>(null);
  const incomeRef = useRef(0);

  useEffect(() => {
    if (newPotion && newPotion.quantity > 0) {
      const itemId = `${newPotion.name}_${newPotion.quality}`;

      setInventory((prev) => {
        const existing = prev.find((item) => item.id === itemId);
        if (existing) {
          return prev.map((item) =>
            item.id === itemId
              ? { ...item, quantity: item.quantity + newPotion.quantity }
              : item
          );
        } else {
          const priceRange = getPriceRange(newPotion.quality);
          const defaultPrice = Math.floor((priceRange.min + priceRange.max) / 2 / 5) * 5;
          const newItem: PotionInventoryItem = {
            id: itemId,
            name: newPotion.name,
            quality: newPotion.quality,
            quantity: newPotion.quantity,
            price: defaultPrice,
          };
          return [...prev, newItem];
        }
      });

      setNewItemIds((prev) => {
        const next = new Set(prev);
        next.add(itemId);
        return next;
      });

      setTimeout(() => {
        setNewItemIds((prev) => {
          const next = new Set(prev);
          next.delete(itemId);
          return next;
        });
      }, 600);
    }
  }, [newPotion]);

  const handlePriceChange = (id: string, value: number) => {
    setInventory((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, price: Math.round(value / 5) * 5 } : item
      )
    );
  };

  const handleSell = (id: string) => {
    const item = inventory.find((i) => i.id === id);
    if (!item || item.quantity === 0) return;

    const totalPrice = item.price * item.quantity;
    onGoldChange(totalPrice);
    setTodayIncome((prev) => prev + totalPrice);
    setInventory((prev) => prev.filter((i) => i.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
    }
  };

  const handleSellAll = () => {
    let totalPrice = 0;
    for (const item of inventory) {
      totalPrice += item.price * item.quantity;
    }
    if (totalPrice > 0) {
      onGoldChange(totalPrice);
      setTodayIncome((prev) => prev + totalPrice);
      setInventory([]);
      setSelectedId(null);
    }
  };

  const handleSettle = () => {
    if (isSettling) return;
    setIsSettling(true);
    setDisplayIncome(0);
    incomeRef.current = 0;

    const startTime = performance.now();
    const targetValue = todayIncome;
    const duration = 500;

    const animate = (timestamp: number) => {
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(targetValue * eased);

      setDisplayIncome(current);
      incomeRef.current = current;

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsSettling(false);
        setTodayIncome(0);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const selectedItem = inventory.find((i) => i.id === selectedId);
  const priceRange = selectedItem ? getPriceRange(selectedItem.quality) : null;

  return (
    <div className="inventory-container">
      <div className="income-section">
        <div className="gold-display">
          <span className="gold-icon">💰</span>
          <span className="gold-label">总资产</span>
          <span className="gold-amount">{gold}</span>
        </div>
        <div className="today-income">
          <span className="income-label">今日收入</span>
          <span className="income-amount">{todayIncome} 金</span>
        </div>
        <button
          className={`settle-button ${isSettling ? 'settling' : ''}`}
          onClick={handleSettle}
          disabled={isSettling || todayIncome === 0}
        >
          {isSettling ? '结算中...' : '📅 日结算'}
        </button>
        {isSettling && (
          <div className="settle-animation">
            <span className="settle-label">结算收入</span>
            <span className="settle-value">+{displayIncome}</span>
          </div>
        )}
      </div>

      <div className="inventory-section">
        <h3 className="section-title">🏺 药水仓库</h3>
        {inventory.length === 0 ? (
          <div className="empty-inventory">仓库空空如也~</div>
        ) : (
          <div className="potion-list">
            {inventory.map((item, index) => (
              <div
                key={item.id}
                className={`potion-card ${selectedId === item.id ? 'selected' : ''} ${
                  newItemIds.has(item.id) ? 'new-item' : ''
                }`}
                onClick={() => setSelectedId(item.id)}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="potion-icon">🧪</div>
                <div className="potion-info">
                  <div className="potion-name">{item.name}</div>
                  <div className="potion-quality">{getQualityStars(item.quality)} {getQualityLabel(item.quality)}</div>
                </div>
                <div className="potion-quantity">×{item.quantity}</div>
                <div className="potion-price">{item.price}金/瓶</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="shop-section">
        <h3 className="section-title">🏪 商店</h3>
        {selectedItem ? (
          <div className="shop-controls">
            <div className="selected-potion">
              <span className="selected-name">{selectedItem.name}</span>
              <span className="selected-quantity">库存: {selectedItem.quantity}</span>
            </div>

            <div className="price-slider-container">
              <div className="price-label">
                <span>售价</span>
                <span className="price-value">{selectedItem.price} 金</span>
              </div>
              <input
                type="range"
                min={priceRange?.min || 10}
                max={priceRange?.max || 100}
                step={5}
                value={selectedItem.price}
                onChange={(e) => handlePriceChange(selectedItem.id, Number(e.target.value))}
                className="price-slider"
              />
              <div className="price-range">
                <span>{priceRange?.min}金</span>
                <span>{priceRange?.max}金</span>
              </div>
            </div>

            <button
              className="sell-button"
              onClick={() => handleSell(selectedItem.id)}
              disabled={selectedItem.quantity === 0}
            >
              售卖全部 (+{selectedItem.price * selectedItem.quantity}金)
            </button>
          </div>
        ) : (
          <div className="no-selection">
            {inventory.length > 0 ? '点击选择药水上架售卖' : '先炼制一些药水吧'}
          </div>
        )}

        {inventory.length > 0 && (
          <button
            className="sell-all-button"
            onClick={handleSellAll}
            disabled={inventory.length === 0}
          >
            💰 一键售卖全部
          </button>
        )}
      </div>
    </div>
  );
}
