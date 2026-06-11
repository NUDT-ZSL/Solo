import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card, List as ListType, Priority, Member } from '../types';

interface BoardViewProps {
  lists: ListType[];
  cards: Card[];
  members: Member[];
  currentUserEmail: string;
  onAddCard: (listId: string, title: string, description: string, priority: Priority, dueDate: string | null, assignee: string | null) => void;
  onMoveCard: (cardId: string, newListId: string, newOrder: number) => void;
  onUpdateCard?: (cardId: string, updates: Partial<Card>) => void;
}

interface DragState {
  cardId: string;
  sourceListId: string;
  startY: number;
  startOrder: number;
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
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragOverListId, setDragOverListId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number>(-1);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const dragCardRef = useRef<HTMLDivElement | null>(null);

  const getCardsForList = useCallback((listId: string) => {
    return cards
      .filter((c) => c.listId === listId)
      .sort((a, b) => a.order - b.order);
  }, [cards]);

  const handleDragStart = (e: React.DragEvent, card: Card) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.id);
    
    setDragState({
      cardId: card.id,
      sourceListId: card.listId,
      startY: e.clientY,
      startOrder: card.order,
    });

    setTimeout(() => {
      if (e.currentTarget instanceof HTMLElement) {
        e.currentTarget.classList.add('dragging');
      }
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.remove('dragging');
    }

    if (dragState && dragOverListId && dragOverIndex >= 0) {
      onMoveCard(dragState.cardId, dragOverListId, dragOverIndex);
    }

    setDragState(null);
    setDragOverListId(null);
    setDragOverIndex(-1);
  };

  const handleDragOver = (e: React.DragEvent, listId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (!dragState) return;

    const listCards = getCardsForList(listId);
    const listElement = e.currentTarget as HTMLElement;
    const cardsContainer = listElement.querySelector('.cards-container');
    if (!cardsContainer) return;

    const rect = cardsContainer.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const cardHeight = 100;

    let index = Math.floor(y / cardHeight);
    index = Math.max(0, Math.min(index, listCards.length));

    setDragOverListId(listId);
    setDragOverIndex(index);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const relatedTarget = e.relatedTarget as Node;
    const currentTarget = e.currentTarget as Node;
    if (currentTarget.contains(relatedTarget)) return;
    
    setDragOverListId(null);
    setDragOverIndex(-1);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
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

  const priorityColor = (priority: Priority) => {
    switch (priority) {
      case 'high': return 'var(--priority-high)';
      case 'medium': return 'var(--priority-medium)';
      case 'low': return 'var(--priority-low)';
    }
  };

  const priorityLabel = (priority: Priority) => {
    switch (priority) {
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
    }
  };

  const getMemberName = (email: string | null) => {
    if (!email) return '未分配';
    const member = members.find((m) => m.email === email);
    return member ? member.name : email;
  };

  const isOverdue = (card: Card) => {
    if (!card.dueDate || card.completedAt) return false;
    const due = new Date(card.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  };

  return (
    <div className="board-view">
      <div className="board-lists">
        {lists.map((list) => {
          const listCards = getCardsForList(list.id);
          return (
            <div
              key={list.id}
              className={`list-column ${dragOverListId === list.id ? 'drag-over' : ''}`}
              onDragOver={(e) => handleDragOver(e, list.id)}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="list-header">
                <h3 className="list-title">{list.title}</h3>
                <span className="list-count">{listCards.length}</span>
              </div>

              <div className="cards-container">
                {listCards.map((card, index) => (
                  <div
                    key={card.id}
                    className={`card ${dragState?.cardId === card.id ? 'dragging-source' : ''} ${
                      dragOverListId === list.id && dragOverIndex === index ? 'drop-target-before' : ''
                    } ${dragOverListId === list.id && dragOverIndex === index + 1 ? 'drop-target-after' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, card)}
                    onDragEnd={handleDragEnd}
                    onClick={() => setSelectedCard(card)}
                    style={{ animation: `fadeIn 0.3s ease-in-out ${index * 0.05}s both` }}
                  >
                    <div className="card-priority-bar" style={{ backgroundColor: priorityColor(card.priority) }} />
                    <div className="card-content">
                      <h4 className="card-title">{card.title}</h4>
                      {card.description && (
                        <p className="card-description">{card.description}</p>
                      )}
                      <div className="card-meta">
                        <span className="card-priority" style={{ color: priorityColor(card.priority) }}>
                          {priorityLabel(card.priority)}优先级
                        </span>
                        {card.dueDate && (
                          <span className={`card-due-date ${isOverdue(card) ? 'overdue' : ''}`}>
                            📅 {card.dueDate}
                          </span>
                        )}
                      </div>
                      <div className="card-assignee">
                        <span className="assignee-avatar">
                          {getMemberName(card.assignee).charAt(0).toUpperCase()}
                        </span>
                        <span className="assignee-name">{getMemberName(card.assignee)}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {dragOverListId === list.id && dragOverIndex === listCards.length && listCards.length > 0 && (
                  <div className="drop-indicator" />
                )}

                {dragOverListId === list.id && listCards.length === 0 && (
                  <div className="drop-indicator" />
                )}
              </div>

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

        .list-column.drag-over {
          background: var(--bg-secondary);
          border: 2px dashed var(--accent-color);
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

        .card {
          background: var(--bg-color);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          cursor: grab;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }

        .card:hover {
          box-shadow: var(--shadow-hover);
          transform: translateY(-2px);
        }

        .card.dragging {
          opacity: 0.4;
          transform: scale(1.1);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        }

        .card.dragging-source {
          opacity: 0.5;
        }

        .card.drop-target-before {
          margin-top: 2px;
          border-top: 3px solid var(--accent-color);
        }

        .card.drop-target-after {
          margin-bottom: 2px;
          border-bottom: 3px solid var(--accent-color);
        }

        .drop-indicator {
          height: 80px;
          border: 2px dashed var(--accent-color);
          border-radius: var(--radius);
          background: rgba(52, 152, 219, 0.1);
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
          color: var(--priority-high);
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};

export default BoardView;
