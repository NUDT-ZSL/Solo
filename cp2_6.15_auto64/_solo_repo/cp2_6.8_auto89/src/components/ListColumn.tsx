import { useState } from 'react';
import type { ListColumn as ListType } from '../Types';
import CardItem from './CardItem';
import AddCardForm from './AddCardForm';

interface Props {
  list: ListType;
  onAddCard: (listId: string, title: string, content: string) => void;
  onMoveCard: (cardId: string, fromListId: string, toListId: string, toIndex: number) => void;
}

export default function ListColumn({ list, onAddCard, onMoveCard }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const handleAdd = (title: string, content: string) => {
    onAddCard(list.id, title, content);
    setShowForm(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
    const cardsContainer = e.currentTarget.querySelector('.list-cards') as HTMLElement | null;
    if (!cardsContainer) return;
    const cardElements = cardsContainer.querySelectorAll<HTMLElement>('.card-item');
    let idx = cardElements.length;
    for (let i = 0; i < cardElements.length; i++) {
      const rect = cardElements[i].getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) {
        idx = i;
        break;
      }
    }
    setDragIndex(idx);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget === e.target) {
      setDragOver(false);
      setDragIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const data = e.dataTransfer.getData('application/json');
    if (!data) {
      setDragIndex(null);
      return;
    }
    try {
      const { cardId, fromListId } = JSON.parse(data);
      const toIndex = dragIndex ?? list.cards.length;
      onMoveCard(cardId, fromListId, list.id, toIndex);
    } catch {
      // ignore
    }
    setDragIndex(null);
  };

  return (
    <div
      className="list-column"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="list-title">{list.title} <span style={{ color: '#9CA3AF', fontWeight: 400 }}>({list.cards.length})</span></div>
      <div className={`list-cards ${dragOver ? 'drag-over' : ''}`}>
        {list.cards.map((card, idx) => (
          <CardItem
            key={card.id}
            card={card}
            listId={list.id}
            isDragPlaceholder={dragIndex === idx}
          />
        ))}
        {dragOver && dragIndex !== null && dragIndex >= list.cards.length && (
          <div
            style={{
              height: '4px',
              background: '#3B82F6',
              borderRadius: '2px',
              margin: '2px 0',
              transition: 'all 0.2s ease',
            }}
          />
        )}
      </div>
      {showForm ? (
        <AddCardForm onSubmit={handleAdd} onCancel={() => setShowForm(false)} />
      ) : (
        <button
          className="add-card-btn"
          onClick={() => setShowForm(true)}
          type="button"
        >
          + 添加卡片
        </button>
      )}
    </div>
  );
}
