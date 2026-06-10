
import { BASE_SCENTS, getTotalScentsValue } from './types';
import type { ScentCard } from './types';

interface HomePageProps {
  cards: ScentCard[];
  onCardClick: (card: ScentCard, element?: HTMLElement) => void;
  onCreateClick: () => void;
}

function getDominantColor(card: ScentCard): string {
  const active = card.scents.filter(s => s.value > 0);
  if (active.length === 0) return '#D4A574';
  active.sort((a, b) => b.value - a.value);
  return active[0].color;
}

function HomePage({ cards, onCardClick, onCreateClick }: HomePageProps) {
  return (
    <div className="page">
      <header className="page-header">
        <h1>气味档案馆</h1>
        <button className="btn" onClick={onCreateClick}>
          + 创建气味卡片
        </button>
      </header>

      {cards.length === 0 ? (
        <div className="empty-state">
          <h3>档案馆还是空的</h3>
          <p>点击上方按钮，创建你的第一张气味卡片吧</p>
        </div>
      ) : (
        <div className="card-grid">
          {cards.map(card => (
            <div
              key={card.id}
              className="scent-card"
              onClick={(e) => onCardClick(card, e.currentTarget)}
            >
              {card.imageData ? (
                <img src={card.imageData} alt={card.title} loading="lazy" />
              ) : (
                <div
                  className="card-image-placeholder"
                  style={{
                    background: `radial-gradient(circle, ${getDominantColor(card)} 0%, transparent 70%)`
                  }}
                />
              )}
              <div className="card-content">
                <div className="card-title" title={card.title}>{card.title}</div>
                <div className="card-palette">
                  {card.scents.map(scent => {
                    const total = getTotalScentsValue(card.scents);
                    const ratio = total > 0 ? scent.value / total : 0;
                    return (
                      <div
                        key={scent.key}
                        className="palette-slice"
                        style={{
                          backgroundColor: ratio > 0 ? scent.color : 'transparent',
                          flex: ratio > 0 ? ratio : 0.01,
                          opacity: ratio > 0 ? 1 : 0
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default HomePage;
