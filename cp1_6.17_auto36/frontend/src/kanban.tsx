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

interface DragState {
  cardId: string | null;
  startY: number;
  offsetX: number;
  offsetY: number;
  ghostPosition: { x: number; y: number } | null;
  targetColumn: CardStatus | null;
  targetIndex: number;
}

export const Kanban: React.FC<KanbanProps> = ({
  cards,
  onCardsChange,
  teamMembers,
  highRiskCardIds,
  onOpenVoting,
  projectId
}) => {
  const [dragState, setDragState] = useState<DragState>({
    cardId: null,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    ghostPosition: null,
    targetColumn: null,
    targetIndex: -1
  });
  
  const [pulsingCardId, setPulsingCardId] = useState<string | null>(null);
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
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  
  const getMemberName = useCallback((id: string) => {
    return teamMembers.find(m => m.id === id)?.name || id;
  }, [teamMembers]);
  
  const getCardsByStatus = useCallback((status: CardStatus) => {
    return cards.filter(c => c.status === status);
  }, [cards]);
  
  const handleDragStart = useCallback((e: React.MouseEvent, card: Card) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const boardRect = boardRef.current?.getBoundingClientRect();
    
    if (!boardRect) return;
    
    setDragState({
      cardId: card.id,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      ghostPosition: {
        x: e.clientX - boardRect.left,
        y: e.clientY - boardRect.top
      },
      targetColumn: card.status,
      targetIndex: getCardsByStatus(card.status).findIndex(c => c.id === card.id)
    });
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const currentBoardRect = boardRef.current?.getBoundingClientRect();
      if (!currentBoardRect) return;
      
      setDragState(prev => ({
        ...prev,
        ghostPosition: {
          x: moveEvent.clientX - currentBoardRect.left,
          y: moveEvent.clientY - currentBoardRect.top
        }
      }));
      
      const columns = document.querySelectorAll<HTMLDivElement>('[data-column]');
      let foundColumn: CardStatus | null = null;
      let foundIndex = -1;
      
      columns.forEach(col => {
        const colRect = col.getBoundingClientRect();
        if (moveEvent.clientX >= colRect.left && moveEvent.clientX <= colRect.right) {
          foundColumn = col.dataset.column as CardStatus;
          
          const columnCards = col.querySelectorAll<HTMLDivElement>('[data-card]');
          columnCards.forEach((cardEl, idx) => {
            const cardRect = cardEl.getBoundingClientRect();
            if (moveEvent.clientY < cardRect.top + cardRect.height / 2) {
              foundIndex = idx;
            } else if (idx === columnCards.length - 1) {
              foundIndex = idx + 1;
            }
          });
          
          if (columnCards.length === 0) {
            foundIndex = 0;
          }
        }
      });
      
      if (foundColumn) {
        setDragState(prev => ({
          ...prev,
          targetColumn: foundColumn,
          targetIndex: foundIndex
        }));
      }
    };
    
    const handleMouseUp = async (_upEvent: MouseEvent) => {
      if (dragState.cardId && dragState.targetColumn) {
        const card = cards.find(c => c.id === dragState.cardId);
        if (card && card.status !== dragState.targetColumn) {
          try {
            const updatedCard = await api.updateCardStatus(card.id, dragState.targetColumn);
            const newCards = cards.map(c => c.id === card.id ? updatedCard : c);
            onCardsChange(newCards);
            
            setPulsingCardId(card.id);
            setTimeout(() => setPulsingCardId(null), 300);
          } catch (err) {
            console.error('Failed to update card status:', err);
          }
        }
      }
      
      setDragState({
        cardId: null,
        startY: 0,
        offsetX: 0,
        offsetY: 0,
        ghostPosition: null,
        targetColumn: null,
        targetIndex: -1
      });
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [cards, dragState.cardId, dragState.targetColumn, getCardsByStatus, onCardsChange]);
  
  const handleAddCard = async () => {
    if (!newCard.title.trim() || !newCard.assignee) return;
    
    try {
      const card = await api.createCard({
        title: newCard.title,
        description: newCard.description,
        estimateDays: newCard.estimateDays,
        dependencyId: newCard.dependencyId || undefined,
        tag: newCard.tag,
        assignee: newCard.assignee,
        projectId
      });
      
      onCardsChange([...cards, card]);
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
    const isDragging = dragState.cardId === card.id;
    const isPulsing = pulsingCardId === card.id;
    const isHighRisk = highRiskCardIds.has(card.id);
    
    return (
      <div
        key={card.id}
        data-card={card.id}
        ref={el => { if (el) cardRefs.current.set(card.id, el); }}
        className={`kanban-card ${isDragging ? 'dragging' : ''} ${isPulsing ? 'pulsing' : ''}`}
        onMouseDown={(e) => handleDragStart(e, card)}
        style={{
          opacity: isDragging ? 0.5 : 1,
          transform: isPulsing ? 'scale(1.02)' : 'scale(1)',
          transition: isPulsing ? 'transform 0.15s ease-in-out' : 'none'
        }}
      >
        {isHighRisk && (
          <div className="risk-pulse" title="高风险">
            <span className="risk-icon">!</span>
          </div>
        )}
        
        <div className="card-header">
          <span 
            className="card-tag" 
            style={{ backgroundColor: TAG_COLORS[card.tag] }}
          >
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
    if (!dragState.cardId || !dragState.ghostPosition) return null;
    
    const card = cards.find(c => c.id === dragState.cardId);
    if (!card) return null;
    
    return (
      <div
        className="ghost-card"
        style={{
          left: dragState.ghostPosition.x - dragState.offsetX,
          top: dragState.ghostPosition.y - dragState.offsetY,
          opacity: 0.8,
          pointerEvents: 'none'
        }}
      >
        <div className="card-header">
          <span 
            className="card-tag" 
            style={{ backgroundColor: TAG_COLORS[card.tag] }}
          >
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
          const isDropTarget = dragState.targetColumn === status;
          
          return (
            <div
              key={status}
              data-column={status}
              className={`kanban-column ${isDropTarget ? 'drop-target' : ''}`}
            >
              <div className="column-header">
                <h3>{COLUMN_LABELS[status]}</h3>
                <span className="column-count">{columnCards.length}</span>
              </div>
              
              <div className="column-content">
                {columnCards.map(card => renderCard(card))}
                
                {isDropTarget && dragState.cardId && (
                  <div 
                    className="drop-placeholder"
                    style={{
                      order: dragState.targetIndex >= 0 ? dragState.targetIndex : columnCards.length
                    }}
                  />
                )}
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
