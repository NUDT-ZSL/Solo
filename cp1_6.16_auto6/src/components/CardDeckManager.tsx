import React from 'react';
import type { Card } from '../types';

interface CardDeckManagerProps {
  cards: Card[];
  selectedCardIds: string[];
  onCardSelect: (cardId: string) => void;
  onSaveDeck: () => void;
}

const CardDeckManager: React.FC<CardDeckManagerProps> = ({
  cards,
  selectedCardIds,
  onCardSelect,
  onSaveDeck
}) => {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      padding: '24px',
      gap: '24px',
      overflow: 'hidden'
    }}>
      <div style={{
        flex: 2,
        overflowY: 'auto',
        paddingRight: '12px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{ color: '#E94560', fontSize: '24px', margin: 0 }}>
            📚 卡池 ({cards.length}张)
          </h2>
          <span style={{ color: '#aaa', fontSize: '14px' }}>
            点击卡牌选择，最多10张
          </span>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px'
        }}>
          {cards.map(card => {
            const isSelected = selectedCardIds.includes(card.id);
            return (
              <div
                key={card.id}
                onClick={() => onCardSelect(card.id)}
                style={{
                  position: 'relative',
                  background: '#16213E',
                  border: `3px solid ${isSelected ? '#32CD32' : '#0F3460'}`,
                  borderRadius: '12px',
                  padding: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected 
                    ? '0 8px 24px rgba(50, 205, 50, 0.3)' 
                    : '0 4px 12px rgba(0,0,0,0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px) scale(1.05)';
                  e.currentTarget.style.boxShadow = isSelected 
                    ? '0 12px 32px rgba(50, 205, 50, 0.4)' 
                    : '0 8px 24px rgba(233, 69, 96, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = isSelected 
                    ? '0 8px 24px rgba(50, 205, 50, 0.3)' 
                    : '0 4px 12px rgba(0,0,0,0.3)';
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: '-8px',
                  left: '-8px',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: '#FFD700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '16px',
                  color: '#1A1A2E',
                  boxShadow: '0 2px 8px rgba(255, 215, 0, 0.5)',
                  zIndex: 10
                }}>
                  {card.cost}
                </div>
                
                <h3 style={{
                  color: '#E94560',
                  fontSize: '16px',
                  margin: '0 0 8px 0',
                  fontWeight: 700
                }}>
                  {card.name}
                </h3>
                
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '8px'
                }}>
                  <span style={{ color: '#FF6B6B', fontWeight: 600, fontSize: '14px' }}>
                    ⚔️ {card.attack}
                  </span>
                  <span style={{ color: '#4ECDC4', fontWeight: 600, fontSize: '14px' }}>
                    ❤️ {card.health}
                  </span>
                </div>
                
                <div style={{
                  background: 'rgba(15, 52, 96, 0.5)',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  color: '#bbb',
                  lineHeight: '1.4'
                }}>
                  <span style={{ color: '#FFD700', fontWeight: 600 }}>
                    {card.effectName}: 
                  </span>
                  {' '}{card.description}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div style={{
        width: '280px',
        flexShrink: 0,
        background: '#16213E',
        border: '2px solid #0F3460',
        borderRadius: '12px',
        padding: '20px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <h3 style={{
          color: '#E94560',
          fontSize: '20px',
          margin: '0 0 16px 0'
        }}>
          🃏 我的卡组
        </h3>
        
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          padding: '8px 12px',
          background: 'rgba(233, 69, 96, 0.1)',
          borderRadius: '6px'
        }}>
          <span style={{ color: '#ccc', fontSize: '14px' }}>已选卡牌</span>
          <span style={{ 
            color: selectedCardIds.length > 10 ? '#FF6B6B' : '#E94560',
            fontWeight: 700,
            fontSize: '18px'
          }}>
            {selectedCardIds.length}/10
          </span>
        </div>
        
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          overflowY: 'auto',
          marginBottom: '16px'
        }}>
          {selectedCardIds.length === 0 ? (
            <p style={{ 
              color: '#666', 
              textAlign: 'center', 
              padding: '40px 20px',
              fontSize: '14px'
            }}>
              从左侧卡池选择卡牌
            </p>
          ) : (
            selectedCardIds.map((cardId, index) => {
              const card = cards.find(c => c.id === cardId);
              if (!card) return null;
              return (
                <div
                  key={`${cardId}-${index}`}
                  onClick={() => onCardSelect(cardId)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 12px',
                    background: 'rgba(15, 52, 96, 0.5)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: '1px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(233, 69, 96, 0.2)';
                    e.currentTarget.style.borderColor = '#E94560';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(15, 52, 96, 0.5)';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  <span style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: '#FFD700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '12px',
                    color: '#1A1A2E',
                    marginRight: '10px'
                  }}>
                    {card.cost}
                  </span>
                  <span style={{ color: '#E94560', fontSize: '13px', fontWeight: 600 }}>
                    {card.name}
                  </span>
                  <span style={{ marginLeft: 'auto', color: '#888', fontSize: '11px' }}>
                    ⚔️{card.attack} ❤️{card.health}
                  </span>
                </div>
              );
            })
          )}
        </div>
        
        <button
          onClick={onSaveDeck}
          disabled={selectedCardIds.length === 0}
          style={{
            padding: '14px',
            background: selectedCardIds.length > 0 ? '#E94560' : '#555',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 700,
            cursor: selectedCardIds.length > 0 ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
            opacity: selectedCardIds.length > 0 ? 1 : 0.5
          }}
          onMouseEnter={(e) => {
            if (selectedCardIds.length > 0) {
              e.currentTarget.style.background = '#FF6B8A';
              e.currentTarget.style.transform = 'scale(1.02)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = selectedCardIds.length > 0 ? '#E94560' : '#555';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          💾 保存卡组
        </button>
      </div>
      
      <style>{`
        @media (max-width: 768px) {
          div[style*="display: flex; padding: 24px; gap: 24px;"] {
            flex-direction: column !important;
            padding: 12px !important;
            gap: 12px !important;
          }
          div[style*="grid-template-columns: repeat(4"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          div[style*="width: 280px"] {
            width: 100% !important;
            max-height: 300px;
          }
        }
      `}</style>
    </div>
  );
};

export default CardDeckManager;
