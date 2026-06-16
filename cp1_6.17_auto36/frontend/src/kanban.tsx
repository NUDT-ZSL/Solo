import React, { useState, useRef, useCallback } from 'react';
import type { Card, CardStatus, CardTag, TeamMember } from './types';
import { COLUMN_LABELS, TAG_COLORS, TAG_LABELS } from './types';
import { api } from './api';

interface KanbanProps {
  cards: Card[];
  onCardsChange: (cards: Card[]) => void;
  teamMembers: TeamMember[];
  highRiskCardIds: Set<string>;
  onOpenVoting: () => void;
  projectId: string;
}

const COLUMNS: CardStatus[] = ['discussion', 'scheduling', 'confirmed', 'in_progress', 'completed'];

interface DragData {
  cardId: string;
  cardWidth: number;
  cardHeight: number;
  offsetX: number;
  offsetY: number;
  sourceColumn: CardStatus;
  sourceIndex: number;
  targetColumn: CardStatus;
  targetIndex: number;
  lastClientX: number;
  lastClientY: number;
}

export const Kanban: React.FC<KanbanProps> = ({
  cards,
  onCardsChange,
  teamMembers,
  highRiskCardIds,
  onOpenVoting,
  projectId
}) => {
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [targetColumn, setTargetColumn] = useState<CardStatus | null>(null);
  const [targetIndex, setTargetIndex] = useState<number>(-1);
  const [pulsingCardId, setPulsingCardId] = useState<string | null>(null);
  const [cardHeight, setCardHeight] = useState<number>(100);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCard, setNewCard] = useState({
    title: '',
    description: '',
    estimateDays: 1,
    dependencyId: '',
    tag: 'feature' as CardTag,
    assignee: ''
  });

  const boardRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const dragDataRef = useRef<DragData | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const columnRefs = useRef<Map<CardStatus, HTMLDivElement>>(new Map());

  const getMemberName = useCallback((id: string) => {
    return teamMembers.find(m => m.id === id)?.name || id;
  }, [teamMembers]);

  const getCardsByStatus = useCallback((status: CardStatus) => {
    return cards.filter(c => c.status === status);
  }, [cards]);

  const updateGhostPosition = useCallback(() => {
    if (!ghostRef.current || !dragDataRef.current || !boardRef.current) return;
    const data = dragDataRef.current;
    const boardRect = boardRef.current.getBoundingClientRect();
    const x = data.lastClientX - boardRect.left - data.offsetX;
    const y = data.lastClientY - boardRect.top - data.offsetY;
    ghostRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }, []);

  const detectDropTarget = useCallback(() => {
    if (!dragDataRef.current) return;
    const data = dragDataRef.current;
    let foundColumn: CardStatus | null = null;
    let foundIndex = -1;

    columnRefs.current.forEach((colEl, colStatus) => {
      const colRect = colEl.getBoundingClientRect();
      if (data.lastClientX >= colRect.left && data.lastClientX <= colRect.right) {
        foundColumn = colStatus;
        const contentEl = colEl.querySelector<HTMLDivElement>('.column-content');
        if (!contentEl) return;
        const cardEls = Array.from(contentEl.querySelectorAll<HTMLDivElement>('[data-card]'));
        const nonDraggingCards = cardEls.filter(el => el.dataset.card !== data.cardId);

        if (nonDraggingCards.length === 0) {
          foundIndex = 0;
          return;
        }

        let closestIdx = nonDraggingCards.length;
        for (let idx = 0; idx < nonDraggingCards.length; idx++) {
          const cardEl = nonDraggingCards[idx];
          const cardRect = cardEl.getBoundingClientRect();
          const cardMiddle = cardRect.top + cardRect.height / 2;
          if (data.lastClientY < cardMiddle) {
            closestIdx = idx;
            break;
          }
        }
        foundIndex = closestIdx;
      }
    });

    if (foundColumn) {
      const columnChanged = foundColumn !== data.targetColumn;
      const indexChanged = foundIndex !== data.targetIndex;
      if (columnChanged || indexChanged) {
        data.targetColumn = foundColumn;
        data.targetIndex = foundIndex;
        setTargetColumn(foundColumn);
        setTargetIndex(foundIndex);
      }
    }
  }, []);

  const animationLoop = useCallback(() => {
    updateGhostPosition();
    detectDropTarget();
    rafIdRef.current = requestAnimationFrame(animationLoop);
  }, [updateGhostPosition, detectDropTarget]);

  const handleDragStart = useCallback((e: React.MouseEvent, card: Card) => {
    e.preventDefault();
    e.stopPropagation();
    const cardEl = e.currentTarget as HTMLDivElement;
    const cardRect = cardEl.getBoundingClientRect();
    const boardRect = boardRef.current?.getBoundingClientRect();
    if (!boardRect) return;

    const sourceCards = getCardsByStatus(card.status);
    const sourceIndex = sourceCards.findIndex(c => c.id === card.id);

    dragDataRef.current = {
      cardId: card.id,
      cardWidth: cardRect.width,
      cardHeight: cardRect.height,
      offsetX: e.clientX - cardRect.left,
      offsetY: e.clientY - cardRect.top,
      sourceColumn: card.status,
      sourceIndex,
      targetColumn: card.status,
      targetIndex: sourceIndex,
      lastClientX: e.clientX,
      lastClientY: e.clientY
    };

    setCardHeight(cardRect.height);
    setDraggingCardId(card.id);
    setTargetColumn(card.status);
    setTargetIndex(sourceIndex);

    if (ghostRef.current) {
      ghostRef.current.style.width = `${cardRect.width}px`;
      ghostRef.current.style.height = `${cardRect.height}px`;
      ghostRef.current.style.display = 'block';
      const startX = cardRect.left - boardRect.left;
      const startY = cardRect.top - boardRect.top;
      ghostRef.current.style.transform = `translate3d(${startX}px, ${startY}px, 0)`;
    }

    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      if (!dragDataRef.current) return;
      dragDataRef.current.lastClientX = moveEvent.clientX;
      dragDataRef.current.lastClientY = moveEvent.clientY;
    };

    const handleMouseUp = async () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      const dragData = dragDataRef.current;
      if (ghostRef.current) {
        ghostRef.current.style.display = 'none';
      }
      if (dragData && dragData.sourceColumn !== dragData.targetColumn) {
        try {
          const updatedCard = await api.updateCardStatus(dragData.cardId, dragData.targetColumn);
          const newCards = cards.map(c => c.id === dragData.cardId ? updatedCard : c);
          onCardsChange(newCards);
          setPulsingCardId(dragData.cardId);
          setTimeout(() => {
            setPulsingCardId(null);
          }, 300);
        } catch (err) {
          console.error('Failed to update card status:', err);
        }
      }
      dragDataRef.current = null;
      setDraggingCardId(null);
      setTargetColumn(null);
      setTargetIndex(-1);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    rafIdRef.current = requestAnimationFrame(animationLoop);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [cards, getCardsByStatus, onCardsChange, animationLoop]);

  const handleAddCard = async () => {
    if (!newCard.title.trim() || !newCard.assignee) return;
    try {
      const createdCard = await api.createCard({
        title: newCard.title,
        description: newCard.description,
        estimateDays: newCard.estimateDays,
        dependencyId: newCard.dependencyId || undefined,
        tag: newCard.tag,
        assignee: newCard.assignee,
        projectId
      });
      onCardsChange([...cards, createdCard]);
      setShowAddModal(false);
      setNewCard({
        title: '',
        description: '',
        estimateDays: 1,
        dependencyId: '',
        tag: 'feature',
        assignee: ''
      });
    } catch (err) {
      console.error('Failed to create card:', err);
    }
  };

  const renderCard = (card: Card) => {
    const isDragging = draggingCardId === card.id;
    const isPulsing = pulsingCardId === card.id;
    const isHighRisk = highRiskCardIds.has(card.id);

    return (
      <div
        key={card.id}
        data-card={card.id}
        className={`kanban-card ${isDragging ? 'card-source-hidden' : ''} ${isPulsing ? 'card-drop-pulse' : ''}`}
        onMouseDown={(e) => handleDragStart(e, card)}
      >
        {isHighRisk && (
          <div className="risk-pulse" title="高风险">
            <span className="risk-icon">!</span>
          </div>
        )}
        <div className="card-header">
          <span className="card-tag" style={{ backgroundColor: TAG_COLORS[card.tag] }}>
            {TAG_LABELS[card.tag]}
          </span>
          <span className="card-estimate">{card.estimateDays}天</span>
        </div>
        <h4 className="card-title">{card.title}</h4>
        <p className="card-description">{card.description}</p>
        {card.dependencyId && (
          <div className="card-dependency">
            <span className="dependency-label">依赖: </span>
            <span className="dependency-title">
              {cards.find(c => c.id === card.dependencyId)?.title || '未知卡片'}
            </span>
          </div>
        )}
        <div className="card-footer">
          <span className="card-assignee">
            👤 {getMemberName(card.assignee)}
          </span>
        </div>
      </div>
    );
  };

  const renderGhostCard = () => {
    if (!draggingCardId) return null;
    const card = cards.find(c => c.id === draggingCardId);
    if (!card) return null;

    return (
      <div
        ref={ghostRef}
        className="ghost-card-following"
        style={{ display: 'none' }}
      >
        <div className="card-header">
          <span className="card-tag" style={{ backgroundColor: TAG_COLORS[card.tag] }}>
            {TAG_LABELS[card.tag]}
          </span>
          <span className="card-estimate">{card.estimateDays}天</span>
        </div>
        <h4 className="card-title">{card.title}</h4>
        <p className="card-description">{card.description}</p>
        <div className="card-footer">
          <span className="card-assignee">
            👤 {getMemberName(card.assignee)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="kanban-container">
      <div className="kanban-header">
        <h2>需求看板</h2>
        <div className="kanban-actions">
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            + 添加需求
          </button>
          <button className="btn btn-secondary" onClick={onOpenVoting}>
            🗳️ 进入排期
          </button>
        </div>
      </div>

      <div className="kanban-board" ref={boardRef}>
        {COLUMNS.map(status => {
          const columnCards = getCardsByStatus(status);
          const isDropTarget = targetColumn === status && draggingCardId !== null;

          const renderCardsWithPlaceholders = () => {
            const elements: React.ReactNode[] = [];
            let placeholderInserted = false;

            columnCards.forEach((card) => {
              const isCurrentDragging = card.id === draggingCardId;

              if (isCurrentDragging) {
                elements.push(
                  <div
                    key={`placeholder-source-${card.id}`}
                    className="drop-placeholder-source"
                    style={{ height: `${cardHeight}px` }}
                  />
                );
                return;
              }

              const currentIndex = elements.filter(el => 
                el && typeof el === 'object' && 'key' in el && 
                String((el as any).key).startsWith('placeholder-target-')
              ).length + elements.filter(el =>
                el && typeof el === 'object' && 'key' in el &&
                !String((el as any).key).startsWith('placeholder-')
              ).length;

              if (isDropTarget && targetIndex === currentIndex && !placeholderInserted) {
                elements.push(
                  <div
                    key={`placeholder-target-${status}-${currentIndex}`}
                    className="drop-placeholder"
                  />
                );
                placeholderInserted = true;
              }

              elements.push(renderCard(card));
            });

            const nonDraggingCount = columnCards.filter(c => c.id !== draggingCardId).length;
            if (isDropTarget && targetIndex >= nonDraggingCount && !placeholderInserted) {
              elements.push(
                <div
                  key={`placeholder-target-${status}-end`}
                  className="drop-placeholder"
                />
              );
            }

            return elements;
          };

          return (
            <div
              key={status}
              data-column={status}
              ref={el => { if (el) columnRefs.current.set(status, el); }}
              className={`kanban-column ${isDropTarget ? 'column-highlight' : ''}`}
            >
              <div className="column-header">
                <h3>{COLUMN_LABELS[status]}</h3>
                <span className="column-count">{columnCards.length}</span>
              </div>
              <div className="column-content">
                {renderCardsWithPlaceholders()}
              </div>
            </div>
          );
        })}

        {renderGhostCard()}
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>添加新需求</h3>
            <div className="form-group">
              <label>标题 *</label>
              <input
                type="text"
                value={newCard.title}
                onChange={e => setNewCard({ ...newCard, title: e.target.value })}
                placeholder="输入需求标题"
              />
            </div>
            <div className="form-group">
              <label>描述</label>
              <textarea
                value={newCard.description}
                onChange={e => setNewCard({ ...newCard, description: e.target.value })}
                placeholder="详细描述需求内容"
                rows={3}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>估时 (人天) *</label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={newCard.estimateDays}
                  onChange={e => setNewCard({ ...newCard, estimateDays: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="form-group">
                <label>标签 *</label>
                <select
                  value={newCard.tag}
                  onChange={e => setNewCard({ ...newCard, tag: e.target.value as CardTag })}
                >
                  <option value="feature">功能</option>
                  <option value="tech">技术</option>
                  <option value="design">设计</option>
                  <option value="ops">运维</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>前置依赖</label>
              <select
                value={newCard.dependencyId}
                onChange={e => setNewCard({ ...newCard, dependencyId: e.target.value })}
              >
                <option value="">无依赖</option>
                {cards.filter(c => c.status !== 'completed').map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>负责人 *</label>
              <select
                value={newCard.assignee}
                onChange={e => setNewCard({ ...newCard, assignee: e.target.value })}
              >
                <option value="">请选择负责人</option>
                {teamMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                ))}
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn btn-default" onClick={() => setShowAddModal(false)}>
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddCard}
                disabled={!newCard.title.trim() || !newCard.assignee}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
