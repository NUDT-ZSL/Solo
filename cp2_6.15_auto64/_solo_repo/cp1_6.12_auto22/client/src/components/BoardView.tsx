import React, { useState, useMemo } from 'react';
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
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { Card, List as ListType, Priority, Member } from '../types';
import { SortableCard, DraggableCardProps } from './SortableCard';

interface BoardViewProps {
  lists: ListType[];
  cards: Card[];
  members: Member[];
  currentUserEmail: string;
  onAddCard: (listId: string, title: string, description: string, priority: Priority, dueDate: string | null, assignee: string | null) => void;
  onMoveCard: (cardId: string, newListId: string, newOrder: number) => void;
  onUpdateCard?: (cardId: string, updates: Partial<Card>) => void;
}

interface DragItemData {
  type: 'card';
  card: Card;
  listId: string;
}

const BoardView: React.FC<BoardViewProps> = ({
  lists,
  cards,
  members,
  currentUserEmail,
  onAddCard,
  onMoveCard,
  onUpdateCard,
}) => {
  const [addingToListId, setAddingToListId] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardDesc, setNewCardDesc] = useState('');
  const [newCardPriority, setNewCardPriority] = useState<Priority>('medium');
  const [newCardDueDate, setNewCardDueDate] = useState('');
  const [newCardAssignee, setNewCardAssignee] = useState('');
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const cardsByListId = useMemo(() => {
    const map: Record<string, Card[]> = {};
    lists.forEach((list) => {
      map[list.id] = cards
        .filter((c) => c.listId === list.id)
        .sort((a, b) => a.order - b.order);
    });
    return map;
  }, [cards, lists]);

  const getMemberName = (email: string | null) => {
    if (!email) return '未分配';
    const member = members.find((m) => m.email === email);
    return member ? member.name : email;
  };

  const priorityColor = (priority: Priority) => {
    switch (priority) {
      case 'high': return '#e74c3c';
      case 'medium': return '#f39c12';
      case 'low': return '#27ae60';
    }
  };

  const priorityLabel = (priority: Priority) => {
    switch (priority) {
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
    }
  };

  const isOverdue = (card: Card) => {
    if (!card.dueDate || card.completedAt) return false;
    const due = new Date(card.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  };

  const handleAddCard = (listId: string) => {
    if (!newCardTitle.trim()) return;

    onAddCard(
      listId,
      newCardTitle.trim(),
      newCardDesc.trim(),
      newCardPriority,
      newCardDueDate || null,
      newCardAssignee || null
    );

    setAddingToListId(null);
    setNewCardTitle('');
    setNewCardDesc('');
    setNewCardPriority('medium');
    setNewCardDueDate('');
    setNewCardAssignee('');
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const cardId = active.id as string;
    const card = cards.find((c) => c.id === cardId);
    if (card) {
      setActiveCard(card);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeCard = cards.find((c) => c.id === activeId);
    if (!activeCard) return;

    const overList = lists.find((l) => l.id === overId);
    const overCard = cards.find((c) => c.id === overId);

    const targetListId = overList ? overList.id : overCard ? overCard.listId : null;
    if (!targetListId || targetListId === activeCard.listId) return;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const activeCard = cards.find((c) => c.id === activeId);
    if (!activeCard) return;

    const activeListCards = cardsByListId[activeCard.listId] || [];
    const oldIndex = activeListCards.findIndex((c) => c.id === activeId);

    let targetListId: string;
    let newIndex: number;

    const overList = lists.find((l) => l.id === overId);
    if (overList) {
      targetListId = overList.id;
      newIndex = (cardsByListId[overList.id] || []).length;
    } else {
      const overCard = cards.find((c) => c.id === overId);
      if (!overCard) return;
      targetListId = overCard.listId;
      const targetListCards = cardsByListId[targetListId] || [];
      newIndex = targetListCards.findIndex((c) => c.id === overId);
    }

    if (activeCard.listId === targetListId) {
      if (oldIndex === newIndex) return;
      const targetListCards = cardsByListId[targetListId] || [];
      const newOrder = arrayMove(targetListCards, oldIndex, newIndex);
      const movedCard = newOrder[newIndex];
      onMoveCard(movedCard.id, targetListId, newIndex);
    } else {
      onMoveCard(activeCard.id, targetListId, newIndex);
    }
  };

  return (
    <div className="board-view">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="board-lists">
          {lists.map((list, listIndex) => {
            const listCards = cardsByListId[list.id] || [];
            return (
              <div
                key={list.id}
                className="list-column"
                style={{ animation: `fadeIn 0.3s ease-in-out ${listIndex * 0.05}s both` }}
              >
                <div className="list-header">
                  <h3 className="list-title">{list.title}</h3>
                  <span className="list-count">{listCards.length}</span>
                </div>

                <SortableContext
                  items={listCards.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div
                    className="cards-container"
                    data-list-id={list.id}
                  >
                    {listCards.map((card, cardIndex) => (
                      <SortableCard
                        key={card.id}
                        card={card}
                        index={cardIndex}
                        priorityColor={priorityColor}
                        priorityLabel={priorityLabel}
                        getMemberName={getMemberName}
                        isOverdue={isOverdue}
                        onClick={() => setSelectedCard(card)}
                      />
                    ))}
                  </div>
                </SortableContext>

                {addingToListId === list.id ? (
                  <div className="add-card-form fade-in">
                    <input
                      type="text"
                      className="add-card-input"
                      placeholder="输入卡片标题..."
                      value={newCardTitle}
                      onChange={(e) => setNewCardTitle(e.target.value)}
                      autoFocus
                    />
                    <textarea
                      className="add-card-textarea"
                      placeholder="描述（可选）"
                      value={newCardDesc}
                      onChange={(e) => setNewCardDesc(e.target.value)}
                      rows={2}
                    />
                    <div className="add-card-options">
                      <select
                        className="add-card-select"
                        value={newCardPriority}
                        onChange={(e) => setNewCardPriority(e.target.value as Priority)}
                      >
                        <option value="high">高优先级</option>
                        <option value="medium">中优先级</option>
                        <option value="low">低优先级</option>
                      </select>
                      <input
                        type="date"
                        className="add-card-date"
                        value={newCardDueDate}
                        onChange={(e) => setNewCardDueDate(e.target.value)}
                      />
                      <select
                        className="add-card-select"
                        value={newCardAssignee}
                        onChange={(e) => setNewCardAssignee(e.target.value)}
                      >
                        <option value="">选择负责人</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.email}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="add-card-actions">
                      <button
                        className="btn btn-primary"
                        onClick={() => handleAddCard(list.id)}
                        disabled={!newCardTitle.trim()}
                      >
                        添加卡片
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          setAddingToListId(null);
                          setNewCardTitle('');
                          setNewCardDesc('');
                          setNewCardPriority('medium');
                          setNewCardDueDate('');
                          setNewCardAssignee('');
                        }}
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="add-card-btn"
                    onClick={() => setAddingToListId(list.id)}
                  >
                    + 添加卡片
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeCard ? (
            <div className="drag-overlay-card">
              <div
                className="card-priority-bar"
                style={{ backgroundColor: priorityColor(activeCard.priority) }}
              />
              <div className="card-content">
                <h4 className="card-title">{activeCard.title}</h4>
                {activeCard.description && (
                  <p className="card-description">{activeCard.description}</p>
                )}
                <div className="card-meta">
                  <span
                    className="card-priority"
                    style={{ color: priorityColor(activeCard.priority) }}
                  >
                    {priorityLabel(activeCard.priority)}优先级
                  </span>
                  {activeCard.dueDate && (
                    <span
                      className={`card-due-date ${isOverdue(activeCard) ? 'overdue' : ''}`}
                    >
                      📅 {activeCard.dueDate}
                    </span>
                  )}
                </div>
                <div className="card-assignee">
                  <span className="assignee-avatar">
                    {getMemberName(activeCard.assignee).charAt(0).toUpperCase()}
                  </span>
                  <span className="assignee-name">
                    {getMemberName(activeCard.assignee)}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {selectedCard && (
        <div className="card-modal-overlay fade-in" onClick={() => setSelectedCard(null)}>
          <div className="card-modal" onClick={(e) => e.stopPropagation()}>
            <div className="card-modal-header">
              <h2>{selectedCard.title}</h2>
              <button className="close-btn" onClick={() => setSelectedCard(null)}>×</button>
            </div>
            <div className="card-modal-body">
              <div className="card-modal-section">
                <label>描述</label>
                <p>{selectedCard.description || '暂无描述'}</p>
              </div>
              <div className="card-modal-section">
                <label>优先级</label>
                <span style={{ color: priorityColor(selectedCard.priority), fontWeight: 600 }}>
                  {priorityLabel(selectedCard.priority)}优先级
                </span>
              </div>
              <div className="card-modal-section">
                <label>截止日期</label>
                <p className={isOverdue(selectedCard) ? 'overdue' : ''}>
                  {selectedCard.dueDate || '未设置'}
                </p>
              </div>
              <div className="card-modal-section">
                <label>负责人</label>
                <p>{getMemberName(selectedCard.assignee)}</p>
              </div>
              <div className="card-modal-section">
                <label>创建时间</label>
                <p>{new Date(selectedCard.createdAt).toLocaleString('zh-CN')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .board-view {
          flex: 1;
          overflow-x: auto;
          padding: 24px;
        }

        .board-lists {
          display: flex;
          gap: 20px;
          min-height: calc(100vh - 180px);
        }

        .list-column {
          flex: 1;
          min-width: 280px;
          max-width: 400px;
          background: var(--bg-color);
          border-radius: var(--radius);
          padding: 16px;
          box-shadow: var(--shadow);
          display: flex;
          flex-direction: column;
          transition: var(--transition);
        }

        .list-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 2px solid var(--bg-secondary);
        }

        .list-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--primary-color);
        }

        .list-count {
          background: var(--bg-secondary);
          color: var(--text-secondary);
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 500;
        }

        .cards-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-height: 100px;
        }

        .drag-overlay-card {
          background: var(--bg-color);
          border-radius: var(--radius);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
          transform: scale(1.1);
          opacity: 0.85;
          cursor: grabbing;
          position: relative;
          overflow: hidden;
          width: 100%;
          pointer-events: none;
        }

        .card-priority-bar {
          height: 4px;
          width: 100%;
          position: absolute;
          top: 0;
          left: 0;
        }

        .card-content {
          padding: 14px 16px 12px;
        }

        .card-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--primary-color);
          margin-bottom: 8px;
          line-height: 1.4;
        }

        .card-description {
          font-size: 13px;
          color: var(--text-secondary);
          margin-bottom: 12px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .card-meta {
          display: flex;
          gap: 12px;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }

        .card-priority {
          font-size: 12px;
          font-weight: 500;
        }

        .card-due-date {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .card-due-date.overdue {
          color: var(--priority-high);
          font-weight: 500;
        }

        .card-assignee {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .assignee-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--accent-color);
          color: white;
          font-size: 11px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .assignee-name {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .add-card-btn {
          width: 100%;
          padding: 12px;
          margin-top: 12px;
          border-radius: var(--radius);
          color: var(--text-secondary);
          font-size: 14px;
          border: 2px dashed var(--border-color);
          transition: var(--transition);
        }

        .add-card-btn:hover {
          border-color: var(--accent-color);
          color: var(--accent-color);
          background: rgba(52, 152, 219, 0.05);
        }

        .add-card-form {
          margin-top: 12px;
          padding: 12px;
          background: var(--bg-secondary);
          border-radius: var(--radius);
        }

        .add-card-input,
        .add-card-textarea,
        .add-card-select,
        .add-card-date {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          font-size: 13px;
          margin-bottom: 8px;
          background: var(--bg-color);
          transition: var(--transition);
        }

        .add-card-input:focus,
        .add-card-textarea:focus,
        .add-card-select:focus,
        .add-card-date:focus {
          outline: none;
          border-color: var(--accent-color);
        }

        .add-card-textarea {
          resize: vertical;
          min-height: 60px;
        }

        .add-card-options {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 12px;
        }

        .add-card-actions {
          display: flex;
          gap: 8px;
        }

        .btn {
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: var(--transition);
          border: none;
        }

        .btn-primary {
          background: var(--accent-color);
          color: white;
        }

        .btn-primary:hover {
          background: var(--accent-light);
        }

        .btn-secondary {
          background: var(--bg-color);
          color: var(--text-secondary);
          border: 1px solid var(--border-color);
        }

        .btn-secondary:hover {
          background: var(--bg-secondary);
        }

        .card-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .card-modal {
          background: var(--bg-color);
          border-radius: var(--radius);
          width: 90%;
          max-width: 500px;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .card-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-color);
        }

        .card-modal-header h2 {
          font-size: 20px;
          color: var(--primary-color);
        }

        .close-btn {
          font-size: 28px;
          color: var(--text-secondary);
          cursor: pointer;
          background: none;
          border: none;
          line-height: 1;
        }

        .close-btn:hover {
          color: var(--primary-color);
        }

        .card-modal-body {
          padding: 24px;
        }

        .card-modal-section {
          margin-bottom: 20px;
        }

        .card-modal-section label {
          display: block;
          font-size: 12px;
          color: var(--text-secondary);
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .card-modal-section p {
          font-size: 14px;
          color: var(--text-primary);
          line-height: 1.6;
        }

        .card-modal-section p.overdue {
          color: #e74c3c;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};

export default BoardView;
