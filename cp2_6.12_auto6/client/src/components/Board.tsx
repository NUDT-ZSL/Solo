import React, { useState, useCallback } from 'react';
import { Card, CardStatus, ColumnId } from '../types';
import { CardItem } from './CardItem';
import { CardModal } from './CardModal';

const COLUMNS: { id: ColumnId; title: string }[] = [
  { id: 'todo', title: '待办' },
  { id: 'in-progress', title: '进行中' },
  { id: 'done', title: '已完成' },
];

interface BoardProps {
  cards: Card[];
  currentUserId: string | null;
  userColor: string | null;
  userName: string | null;
  onAddCard: (card: {
    title: string;
    description: string;
    priority: Card['priority'];
    status: CardStatus;
    createdBy: string;
    creatorColor: string;
  }) => void;
  onUpdateCard: (card: Partial<Card> & { id: string }) => void;
  onDeleteCard: (id: string) => void;
  onMoveCard: (data: {
    id: string;
    newStatus: CardStatus;
    newOrder: number;
  }) => void;
}

export const Board: React.FC<BoardProps> = ({
  cards,
  currentUserId,
  userColor,
  userName,
  onAddCard,
  onUpdateCard,
  onDeleteCard,
  onMoveCard,
}) => {
  const [draggingCard, setDraggingCard] = useState<Card | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ColumnId | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialStatus, setModalInitialStatus] = useState<CardStatus>('todo');

  const getCardsByStatus = useCallback((status: CardStatus): Card[] => {
    return cards
      .filter((card) => card.status === status)
      .sort((a, b) => a.order - b.order);
  }, [cards]);

  const handleDragStart = (e: React.DragEvent, card: Card) => {
    setDraggingCard(card);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.id);
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '0.4';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '1';
    setDraggingCard(null);
    setDragOverColumn(null);
    setDragOverCardId(null);
  };

  const handleColumnDragOver = (e: React.DragEvent, columnId: ColumnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleColumnDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleCardDragOver = (e: React.DragEvent, targetCardId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggingCard && draggingCard.id !== targetCardId) {
      setDragOverCardId(targetCardId);
    }
  };

  const handleColumnDrop = (e: React.DragEvent, columnId: ColumnId) => {
    e.preventDefault();
    if (!draggingCard) return;

    const columnCards = getCardsByStatus(columnId).filter(
      (c) => c.id !== draggingCard.id
    );

    let newOrder: number;
    if (dragOverCardId) {
      const targetIndex = columnCards.findIndex((c) => c.id === dragOverCardId);
      newOrder = targetIndex >= 0 ? targetIndex : columnCards.length;
    } else {
      newOrder = columnCards.length;
    }

    if (draggingCard.status !== columnId || draggingCard.order !== newOrder) {
      onMoveCard({
        id: draggingCard.id,
        newStatus: columnId,
        newOrder,
      });
    }

    setDraggingCard(null);
    setDragOverColumn(null);
    setDragOverCardId(null);
  };

  const openAddModal = (status: CardStatus) => {
    setEditingCard(null);
    setModalInitialStatus(status);
    setIsModalOpen(true);
  };

  const openEditModal = (card: Card) => {
    setEditingCard(card);
    setIsModalOpen(true);
  };

  const handleModalSubmit = (data: {
    title: string;
    description: string;
    priority: Card['priority'];
  }) => {
    if (editingCard) {
      onUpdateCard({
        id: editingCard.id,
        ...data,
      });
    } else {
      if (currentUserId && userColor && userName) {
        onAddCard({
          ...data,
          status: modalInitialStatus,
          createdBy: userName,
          creatorColor: userColor,
        });
      }
    }
  };

  return (
    <>
      <div className="board-container">
        {COLUMNS.map((column) => {
          const columnCards = getCardsByStatus(column.id);
          const isDragOver = dragOverColumn === column.id;

          return (
            <div
              key={column.id}
              className={`board-column ${isDragOver ? 'column-drag-over' : ''}`}
              onDragOver={(e) => handleColumnDragOver(e, column.id)}
              onDragLeave={handleColumnDragLeave}
              onDrop={(e) => handleColumnDrop(e, column.id)}
            >
              <div className="column-header">
                <h2 className="column-title">{column.title}</h2>
                <span className="column-badge">{columnCards.length}</span>
                <button
                  className="column-add-btn"
                  onClick={() => openAddModal(column.id)}
                  title="添加需求"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              </div>

              <div className="column-cards">
                {columnCards.map((card, index) => (
                  <React.Fragment key={card.id}>
                    {draggingCard && dragOverCardId === card.id && draggingCard.id !== card.id && (
                      <div className="card-placeholder" />
                    )}
                    <div onDragOver={(e) => handleCardDragOver(e, card.id)}>
                      <CardItem
                        card={card}
                        onEdit={openEditModal}
                        onDelete={onDeleteCard}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        isDragging={draggingCard?.id === card.id}
                        index={index}
                      />
                    </div>
                  </React.Fragment>
                ))}
                {draggingCard && isDragOver && !dragOverCardId && (
                  <div className="card-placeholder" />
                )}
                {columnCards.length === 0 && !draggingCard && (
                  <div className="column-empty" onClick={() => openAddModal(column.id)}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span>点击添加需求</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <CardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        editingCard={editingCard}
        initialStatus={modalInitialStatus}
      />
    </>
  );
};
