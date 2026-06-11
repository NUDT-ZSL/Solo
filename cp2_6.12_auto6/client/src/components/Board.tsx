import React, { useState, useCallback, useMemo, memo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  DropAnimation,
  defaultDropAnimation,
  MeasuringStrategy,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { Card, CardStatus, ColumnId } from '../types';
import { SortableCard } from './SortableCard';
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

const MemoSortableCard = memo(SortableCard);

const dropAnimation: DropAnimation = {
  ...defaultDropAnimation,
  dragSourceOpacity: 0.5,
};

const measuring = {
  droppable: {
    strategy: MeasuringStrategy.Always,
  },
};

interface CardContainerProps {
  id: ColumnId;
  title: string;
  cards: Card[];
  onAddCard: (status: CardStatus) => void;
  onEditCard: (card: Card) => void;
  onDeleteCard: (id: string) => void;
}

const CardContainer: React.FC<CardContainerProps> = ({
  id,
  title,
  cards,
  onAddCard,
  onEditCard,
  onDeleteCard,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      type: 'column',
      columnId: id,
    },
  });

  return (
    <div
      className={`board-column ${isOver ? 'column-drag-over' : ''}`}
      ref={setNodeRef}
    >
      <div className="column-header">
        <h2 className="column-title">{title}</h2>
        <span className="column-badge">{cards.length}</span>
        <button
          className="column-add-btn"
          onClick={() => onAddCard(id)}
          title="添加需求"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      <div className="column-cards">
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
          id={id}
        >
          {cards.map((card, index) => (
            <MemoSortableCard
              key={card.id}
              card={card}
              onEdit={onEditCard}
              onDelete={onDeleteCard}
              index={index}
            />
          ))}
        </SortableContext>

        {cards.length === 0 && (
          <div
            className="column-empty"
            onClick={() => onAddCard(id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onAddCard(id);
              }
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>点击添加需求</span>
          </div>
        )}
      </div>
    </div>
  );
};

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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialStatus, setModalInitialStatus] = useState<CardStatus>('todo');

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 3,
    },
  });

  const sensors = useSensors(pointerSensor);

  const cardsByStatus = useMemo(() => {
    const result: Record<CardStatus, Card[]> = {
      todo: [],
      'in-progress': [],
      done: [],
    };
    for (const card of cards) {
      result[card.status].push(card);
    }
    for (const status of Object.keys(result) as CardStatus[]) {
      result[status].sort((a, b) => a.order - b.order);
    }
    return result;
  }, [cards]);

  const cardsMap = useMemo(() => {
    const map = new Map<string, Card>();
    for (const card of cards) {
      map.set(card.id, card);
    }
    return map;
  }, [cards]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const id = active.id as string;
      setActiveId(id);
      const card = cardsMap.get(id);
      if (card) {
        setActiveCard(card);
      }
    },
    [cardsMap]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      if (activeId === overId) return;

      const activeCardData = cardsMap.get(activeId);
      if (!activeCardData) return;

      let targetColumn: ColumnId | null = null;
      if (overId === 'todo' || overId === 'in-progress' || overId === 'done') {
        targetColumn = overId as ColumnId;
      } else {
        const overCard = cardsMap.get(overId);
        if (overCard) {
          targetColumn = overCard.status;
        }
      }
      if (!targetColumn) return;

      if (activeCardData.status === targetColumn) return;

      const overCard = cardsMap.get(overId);
      if (!overCard) return;

      const overItems = cardsByStatus[targetColumn];
      const overIndex = overItems.findIndex((c) => c.id === overId);
      const activeItems = cardsByStatus[activeCardData.status];
      const activeIndex = activeItems.findIndex((c) => c.id === activeId);

      if (overIndex < 0) return;
      if (activeIndex < 0) return;

      if (activeCardData.status !== targetColumn) {
        onMoveCard({
          id: activeId,
          newStatus: targetColumn,
          newOrder: overIndex,
        });
      }
    },
    [cardsMap, cardsByStatus, onMoveCard]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      setActiveCard(null);

      if (!over || active.id === over.id) {
        return;
      }

      const activeId = active.id as string;
      const overId = over.id as string;
      const activeCardData = cardsMap.get(activeId);
      if (!activeCardData) return;

      let targetColumn: ColumnId | null = null;
      let targetIndex: number | null = null;

      if (overId === 'todo' || overId === 'in-progress' || overId === 'done') {
        targetColumn = overId as ColumnId;
        targetIndex = cardsByStatus[targetColumn].length;
      } else {
        const overCard = cardsMap.get(overId);
        if (overCard) {
          targetColumn = overCard.status;
          const columnCards = cardsByStatus[targetColumn];
          const overIndex = columnCards.findIndex((c) => c.id === overId);
          targetIndex = overIndex >= 0 ? overIndex : columnCards.length;
        }
      }

      if (!targetColumn || targetIndex === null) return;

      const oldColumn = activeCardData.status;
      const isSameColumn = oldColumn === targetColumn;

      if (isSameColumn) {
        const oldIndex = cardsByStatus[oldColumn].findIndex((c) => c.id === activeId);
        if (oldIndex === targetIndex) return;
        arrayMove(cardsByStatus[oldColumn], oldIndex, targetIndex);
        onMoveCard({
          id: activeId,
          newStatus: targetColumn,
          newOrder: targetIndex,
        });
      } else {
        onMoveCard({
          id: activeId,
          newStatus: targetColumn,
          newOrder: targetIndex,
        });
      }
    },
    [cardsMap, cardsByStatus, onMoveCard]
  );

  const openAddModal = useCallback((status: CardStatus) => {
    setEditingCard(null);
    setModalInitialStatus(status);
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((card: Card) => {
    setEditingCard(card);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleModalSubmit = useCallback(
    (data: {
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
      closeModal();
    },
    [editingCard, currentUserId, userColor, userName, modalInitialStatus, onAddCard, onUpdateCard, closeModal]
  );

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActiveId(null);
          setActiveCard(null);
        }}
        measuring={measuring}
      >
        <div className="board-container">
          {COLUMNS.map((column) => (
            <CardContainer
              key={column.id}
              id={column.id}
              title={column.title}
              cards={cardsByStatus[column.id]}
              onAddCard={openAddModal}
              onEditCard={openEditModal}
              onDeleteCard={onDeleteCard}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={dropAnimation}>
          {activeCard ? (
            <div
              className="card-item card-drag-overlay"
              style={{
                transform: 'rotate(2deg) scale(1.05)',
                transformOrigin: 'center',
              }}
            >
              <div className="card-header">
                <span className={`priority-tag priority-${activeCard.priority}`}>
                  {activeCard.priority === 'high' ? '高' : activeCard.priority === 'medium' ? '中' : '低'}优先级
                </span>
                <div
                  className="creator-badge"
                  style={{ backgroundColor: activeCard.creatorColor }}
                />
              </div>
              <h3 className="card-title">{activeCard.title}</h3>
              {activeCard.description && (
                <p className="card-description">{activeCard.description}</p>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <CardModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
        editingCard={editingCard}
        initialStatus={modalInitialStatus}
      />
    </>
  );
};
