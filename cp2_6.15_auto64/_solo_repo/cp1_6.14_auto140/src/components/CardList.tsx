import { Card } from '../http';

interface CardListProps {
  cards: Card[];
  selectedCardId: string | null;
  onCardClick: (cardId: string) => void;
}

const CardList = ({ cards, selectedCardId, onCardClick }: CardListProps) => {
  if (cards.length === 0) {
    return (
      <div className="card-list">
        <div className="empty-state">
          暂无会员卡<br />
          <span style={{ fontSize: '14px' }}>点击下方按钮新增</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card-list">
      {cards.map((card) => (
        <div
          key={card.id}
          className={`card-item ${selectedCardId === card.id ? 'selected' : ''}`}
          onClick={() => onCardClick(card.id)}
        >
          <div className="card-number">No.{card.cardNumber}</div>
          <div className="card-balance">
            <div className="balance-label">账户余额</div>
            <div>
              <span className="balance-amount">{card.balance.toFixed(1)}</span>
              <span className="balance-currency"> 元</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CardList;
