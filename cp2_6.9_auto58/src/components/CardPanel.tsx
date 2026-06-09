import { Card } from '../hooks/useBattleSimulator';

interface CardPanelProps {
  cards: Card[];
  selectedIds: string[];
  onCardSelect: (cardId: string) => void;
  flashingCardId: string | null;
  currentHp: { [cardId: string]: number };
}

export default function CardPanel({
  cards,
  selectedIds,
  onCardSelect,
  flashingCardId,
  currentHp,
}: CardPanelProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
        width: '100%',
      }}
    >
      {cards.map((card) => {
        const isSelected = selectedIds.includes(card.id);
        const isFlashing = flashingCardId === card.id;
        const hp = currentHp[card.id] ?? card.maxHp;
        const hpPercent = (hp / card.maxHp) * 100;

        return (
          <div
            key={card.id}
            onClick={() => onCardSelect(card.id)}
            className={`${isSelected ? 'card-selected' : ''} ${isFlashing ? 'card-flash' : ''}`}
            style={{
              background: 'linear-gradient(180deg, #1a1a3e 0%, #3a1a5e 100%)',
              border: `1px solid ${isSelected ? '#d4a843' : '#d4a843'}`,
              borderRadius: '12px',
              padding: '16px',
              cursor: 'pointer',
              transition: 'all 0.3s ease-out',
              transform: 'translateY(0) scale(1)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              userSelect: 'none',
              minHeight: '220px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px) scale(1.05)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(212,168,67,0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
            }}
          >
            <div
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#fff',
                textAlign: 'center',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)',
              }}
            >
              {card.name}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-around',
                marginTop: '8px',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>攻击</div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#fff' }}>{card.attack}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>防御</div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#fff' }}>{card.defense}</div>
              </div>
            </div>

            <div style={{ fontSize: '12px', color: '#ccc', textAlign: 'center' }}>
              暴击率: {(card.critRate * 100).toFixed(0)}%
            </div>

            <div style={{ marginTop: 'auto' }}>
              <div
                style={{
                  fontSize: '12px',
                  color: '#ddd',
                  marginBottom: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>生命值</span>
                <span>{hp} / {card.maxHp}</span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '12px',
                  background: 'rgba(0,0,0,0.5)',
                  borderRadius: '6px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${hpPercent}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, 
                      hsl(${Math.max(0, hpPercent * 1.2 - 20)}, 80%, 45%) 0%, 
                      hsl(${Math.max(0, hpPercent * 1.2)}, 80%, 50%) 100%)`,
                    transition: 'width 0.3s ease-out, background 0.3s ease-out',
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
