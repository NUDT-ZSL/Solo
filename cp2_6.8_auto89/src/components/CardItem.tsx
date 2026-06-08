import { memo, useState } from 'react';
import type { Card } from '../Types';

interface Props {
  card: Card;
  listId: string;
  isDragPlaceholder?: boolean;
}

function CardItemComp({ card, listId, isDragPlaceholder }: Props) {
  const [dragging, setDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    setDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({ cardId: card.id, fromListId: listId })
    );
    if (e.dataTransfer.setDragImage && e.currentTarget) {
      e.dataTransfer.setDragImage(e.currentTarget, 20, 20);
    }
  };

  const handleDragEnd = () => {
    setDragging(false);
  };

  if (isDragPlaceholder) {
    return (
      <>
        <div
          style={{
            height: '4px',
            background: '#3B82F6',
            borderRadius: '2px',
            margin: '2px 0',
            transition: 'all 0.2s ease',
          }}
        />
        <div
          className={`card-item ${dragging ? 'dragging' : ''}`}
          draggable
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="card-title">{card.title}</div>
          {card.content && <div className="card-tooltip">{card.content}</div>}
        </div>
      </>
    );
  }

  return (
    <div
      className={`card-item ${dragging ? 'dragging' : ''}`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="card-title">{card.title}</div>
      {card.content && <div className="card-tooltip">{card.content}</div>}
    </div>
  );
}

const CardItem = memo(CardItemComp);
export default CardItem;
