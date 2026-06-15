import React from 'react';
import type { ChestData, GameOverData, ShopData, ModalId, Weapon, ShopItem } from '../types';
import { eventBus } from '../utils/EventBus';

interface ModalProps {
  id: ModalId;
  data: ChestData | GameOverData | ShopData | null;
  playerGold: number;
}

export const Modal: React.FC<ModalProps> = ({ id, data, playerGold }) => {
  if (!data) return null;

  const handleClose = () => {
    eventBus.emit('modal:close', { modalId: id });
  };

  const handleRestart = () => {
    eventBus.emit('game:restart', undefined);
    eventBus.emit('modal:close', { modalId: id });
  };

  const handleBuy = (index: number, item: ShopItem) => {
    if (playerGold < item.price) return;
    eventBus.emit('shop:buy', { index });
    eventBus.emit('modal:close', { modalId: id });
  };

  const overlayClass = `modal-overlay ${id}-modal`;
  const boxClass = `modal-box ${id}`;

  if (id === 'chest') {
    const chestData = data as ChestData;
    return (
      <div className={overlayClass} onClick={handleClose}>
        <div className={boxClass} onClick={(e) => e.stopPropagation()}>
          <div className="modal-title chest-title">🎁 发现宝箱！</div>
          <div className="modal-content">
            <div className="chest-reward">
              <span className="chest-reward-icon">💰</span>
              <span className="chest-reward-text">+ {chestData.gold} 金币</span>
            </div>
            {chestData.weapon && (
              <div className="chest-weapon">
                <span className="chest-weapon-icon">{chestData.weapon.icon}</span>
                <div className="chest-weapon-info">
                  <span className="chest-weapon-name">
                    {chestData.weapon.name}{' '}
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                      [{chestData.weapon.rarity}]
                    </span>
                  </span>
                  <span className="chest-weapon-damage">伤害: {chestData.weapon.damage}</span>
                </div>
              </div>
            )}
            <button className="modal-btn" onClick={handleClose}>
              确认
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (id === 'gameover') {
    const goData = data as GameOverData;
    return (
      <div className={overlayClass}>
        <div className={boxClass}>
          <div className={goData.victory ? 'gameover-victory' : 'gameover-defeat'}>
            {goData.victory ? '🏆 胜利！' : '💀 失败'}
          </div>
          <div className="modal-title gameover-title">
            {goData.victory ? '恭喜通关水晶地牢' : '你倒在了地牢深处...'}
          </div>
          <div className="gameover-stats">
            <div className="gameover-stat">
              <span className="gameover-stat-label">💰 总金币</span>
              <span className="gameover-stat-value">{goData.totalGold}</span>
            </div>
            <div className="gameover-stat">
              <span className="gameover-stat-label">⚔️ 击杀怪物</span>
              <span className="gameover-stat-value">{goData.killCount}</span>
            </div>
            <div className="gameover-stat">
              <span className="gameover-stat-label">🏰 到达层数</span>
              <span className="gameover-stat-value">{goData.reachedFloor}</span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button className="modal-btn" onClick={handleRestart}>
              重新开始
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (id === 'shop') {
    const shopData = data as ShopData;
    return (
      <div className={overlayClass} onClick={handleClose}>
        <div className={boxClass} onClick={(e) => e.stopPropagation()}>
          <div className="modal-title shop-title">🛒 冒险商店</div>
          <div className="modal-content">
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
              当前金币: <span style={{ color: '#ffd700', fontWeight: 'bold' }}>{playerGold}</span>
            </div>
            <div className="shop-items">
              {shopData.items.length === 0 && (
                <div style={{ padding: 20, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
                  商品已售罄
                </div>
              )}
              {shopData.items.map((item, idx) => (
                <div className="shop-item" key={idx}>
                  <div className="shop-item-info">
                    <span className="shop-item-icon">{item.icon}</span>
                    <span className="shop-item-label">{item.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="shop-item-price">{item.price}💰</span>
                    <button
                      className="shop-buy-btn"
                      onClick={() => handleBuy(idx, item)}
                      disabled={playerGold < item.price}
                      style={{ opacity: playerGold < item.price ? 0.4 : 1, cursor: playerGold < item.price ? 'not-allowed' : 'pointer' }}
                    >
                      购买
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button className="modal-btn secondary" onClick={handleClose}>
              离开商店
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
