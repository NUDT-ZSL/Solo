
import { BASE_SCENTS } from './types';
import type { ScentCard, ScentRatio } from './types';

interface HomePageProps {
  cards: ScentCard[];
  onCardClick: (card: ScentCard) => void;
  onCreateClick: () => void;
}

function getTotalRatio(ratios: ScentRatio): number {
  return ratios.rose + ratios.sandalwood + ratios.seaSalt + ratios.pine + ratios.incense;
}

function getDominantColor(ratios: ScentRatio): string {
  const total = getTotalRatio(ratios);
  if (total === 0) return '#D4A574';
  let maxKey: keyof ScentRatio = 'rose';
  let maxVal = 0;
  (Object.keys(ratios) as Array<keyof ScentRatio>).forEach(k => {
    if (ratios[k] > maxVal) {
      maxVal = ratios[k];
      maxKey = k;
    }
  });
  const scent = BASE_SCENTS.find(s => s.key === maxKey);
  return scent?.color || '#D4A574';
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
        <div className="waterfall-grid">
          {cards.map(card => (
            <div key={card.id} className="waterfall-item">
              <div className="scent-card" onClick={() => onCardClick(card)}>
                {card.imageData ? (
                  <img src={card.imageData} alt={card.title} loading="lazy" />
                ) : (
                  <div
                    className="card-image-placeholder"
                    style={{
                      background: `radial-gradient(circle, ${getDominantColor(card.scentRatios)} 0%, transparent 70%)`
                    }}
                  />
                )}
                <div className="card-content">
                  <div className="card-title" title={card.title}>{card.title}</div>
                  <div className="card-palette">
                    {BASE_SCENTS.map(scent => {
                      const total = getTotalRatio(card.scentRatios);
                      const ratio = total > 0 ? card.scentRatios[scent.key] / total : 0;
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default HomePage;
