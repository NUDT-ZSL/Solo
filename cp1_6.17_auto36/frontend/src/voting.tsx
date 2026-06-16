import React, { useState, useEffect, useMemo } from 'react';
import type { Card, Vote, VoteResult, TeamMember } from './types';
import { TAG_COLORS, TAG_LABELS } from './types';
import { api } from './api';
import { calculatePriority, validateVote } from '../../engine/votingEngine';

interface VotingProps {
  cards: Card[];
  currentUser: TeamMember;
  onClose: () => void;
  onConfirm: () => void;
  minVoters?: number;
}

export const Voting: React.FC<VotingProps> = ({
  cards,
  currentUser,
  onClose,
  onConfirm,
  minVoters = 3
}) => {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [selectedScores, setSelectedScores] = useState<Record<string, number>>({});
  const [voteResults, setVoteResults] = useState<VoteResult[]>([]);
  const [votingPhase, setVotingPhase] = useState<'voting' | 'results'>('voting');
  const [animatingItem, setAnimatingItem] = useState<string | null>(null);
  const [dragItem, setDragItem] = useState<string | null>(null);
  const [manualOrder, setManualOrder] = useState<string[]>([]);
  
  const schedulingCards = useMemo(() => 
    cards.filter(c => c.status === 'scheduling'),
    [cards]
  );
  
  useEffect(() => {
    const loadVotes = async () => {
      const allVotes = await api.getVotes();
      setVotes(allVotes);
      
      const userVotes = allVotes.filter(v => v.userId === currentUser.id);
      const scores: Record<string, number> = {};
      userVotes.forEach(v => {
        scores[v.cardId] = v.score;
      });
      setSelectedScores(scores);
    };
    loadVotes();
  }, [currentUser.id]);
  
  const handleVote = async (cardId: string, score: number) => {
    if (!validateVote(score)) return;
    
    try {
      const newVote = await api.submitVote(cardId, currentUser.id, score);
      
      setVotes(prev => {
        const existing = prev.findIndex(v => v.cardId === cardId && v.userId === currentUser.id);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = newVote;
          return updated;
        }
        return [...prev, newVote];
      });
      
      setSelectedScores(prev => ({
        ...prev,
        [cardId]: score
      }));
      
      const btn = document.querySelector(`[data-score-btn="${cardId}-${score}"]`);
      if (btn) {
        btn.classList.add('score-btn-selected');
        setTimeout(() => btn.classList.remove('score-btn-selected'), 150);
      }
    } catch (err) {
      console.error('Failed to submit vote:', err);
    }
  };
  
  const calculateResults = () => {
    const votesWithRole = votes.map(v => ({
      ...v,
      userRole: currentUser.role
    }));
    
    const results = calculatePriority(votesWithRole, schedulingCards, minVoters);
    setVoteResults(results);
    setManualOrder(results.map(r => r.cardId));
    setVotingPhase('results');
  };
  
  const handleConfirmOrder = async () => {
    try {
      for (let i = 0; i < manualOrder.length; i++) {
        const cardId = manualOrder[i];
        await api.updateCardStatus(cardId, 'confirmed');
      }
      onConfirm();
    } catch (err) {
      console.error('Failed to confirm order:', err);
    }
  };
  
  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    setDragItem(cardId);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  
  const handleDrop = (e: React.DragEvent, targetCardId: string) => {
    e.preventDefault();
    if (!dragItem || dragItem === targetCardId) {
      setDragItem(null);
      return;
    }
    
    const newOrder = [...manualOrder];
    const dragIndex = newOrder.indexOf(dragItem);
    const targetIndex = newOrder.indexOf(targetCardId);
    
    newOrder.splice(dragIndex, 1);
    newOrder.splice(targetIndex, 0, dragItem);
    
    setManualOrder(newOrder);
    setAnimatingItem(dragItem);
    setTimeout(() => setAnimatingItem(null), 200);
    setDragItem(null);
  };
  
  const getVoteCount = (cardId: string) => {
    const cardVotes = votes.filter(v => v.cardId === cardId);
    return new Set(cardVotes.map(v => v.userId)).size;
  };
  
  const canCalculateResults = schedulingCards.every(card => 
    getVoteCount(card.id) >= minVoters
  );
  
  const getCardById = (id: string) => cards.find(c => c.id === id);
  
  const getResultForCard = (cardId: string) => 
    voteResults.find(r => r.cardId === cardId);
  
  const renderVotingPhase = () => (
    <div className="voting-phase">
      <div className="voting-info">
        <span className="voting-user">投票人: {currentUser.name}</span>
        <span className="min-voters">最少投票人数: {minVoters}人</span>
      </div>
      
      <div className="voting-cards">
        {schedulingCards.map(card => {
          const voteCount = getVoteCount(card.id);
          const userScore = selectedScores[card.id];
          const hasEnoughVotes = voteCount >= minVoters;
          
          return (
            <div key={card.id} className="voting-card">
              <div className="voting-card-header">
                <span 
                  className="card-tag" 
                  style={{ backgroundColor: TAG_COLORS[card.tag] }}
                >
                  {TAG_LABELS[card.tag]}
                </span>
                <span className="card-estimate">{card.estimateDays}天</span>
                <span className={`vote-count ${hasEnoughVotes ? 'complete' : ''}`}>
                  {voteCount}/{minVoters}票
                </span>
              </div>
              
              <h4 className="voting-card-title">{card.title}</h4>
              <p className="voting-card-desc">{card.description}</p>
              
              <div className="score-buttons">
                <span className="score-label">紧急程度:</span>
                {[1, 2, 3, 4, 5].map(score => (
                  <button
                    key={score}
                    data-score-btn={`${card.id}-${score}`}
                    className={`score-btn ${userScore === score ? 'selected' : ''}`}
                    onClick={() => handleVote(card.id, score)}
                    title={`${score}分`}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="voting-actions">
        <button className="btn btn-default" onClick={onClose}>
          返回看板
        </button>
        <button 
          className="btn btn-primary" 
          onClick={calculateResults}
          disabled={!canCalculateResults}
        >
          计算排序结果
        </button>
      </div>
    </div>
  );
  
  const renderResultsPhase = () => (
    <div className="results-phase">
      <h3>排期推荐列表</h3>
      <p className="results-hint">
        按加权平均分降序排列，分数相同则按估时从少到多。可拖拽调整顺序。
      </p>
      
      <div className="results-list">
        {manualOrder.map((cardId, index) => {
          const card = getCardById(cardId);
          const result = getResultForCard(cardId);
          const isAnimating = animatingItem === cardId;
          const isDragging = dragItem === cardId;
          
          if (!card || !result) return null;
          
          return (
            <div
              key={cardId}
              className={`result-item ${isAnimating ? 'swapping' : ''} ${isDragging ? 'dragging' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, cardId)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, cardId)}
              style={{
                transform: isAnimating ? 'scale(1.02)' : 'scale(1)',
                opacity: isDragging ? 0.5 : 1,
                transition: 'all 0.2s ease'
              }}
            >
              <div className="result-rank">
                <span className="rank-badge">#{index + 1}</span>
              </div>
              
              <div className="result-card-info">
                <span 
                  className="card-tag" 
                  style={{ backgroundColor: TAG_COLORS[card.tag] }}
                >
                  {TAG_LABELS[card.tag]}
                </span>
                <h4 className="result-title">{card.title}</h4>
                <span className="result-estimate">{card.estimateDays}天</span>
              </div>
              
              <div className="result-score">
                <div className="score-value">{result.weightedScore.toFixed(1)}</div>
                <div className="score-votes">{result.totalVotes}人投票</div>
              </div>
              
              <div className="result-drag-handle">⋮⋮</div>
            </div>
          );
        })}
      </div>
      
      <div className="voting-actions">
        <button className="btn btn-default" onClick={() => setVotingPhase('voting')}>
          返回投票
        </button>
        <button className="btn btn-primary" onClick={handleConfirmOrder}>
          确认排期，批量设为已确认
        </button>
      </div>
    </div>
  );
  
  return (
    <div className="modal-overlay">
      <div className="modal-content voting-modal">
        <div className="modal-header">
          <h2>🗳️ 排期投票</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          {schedulingCards.length === 0 ? (
            <div className="empty-state">
              <p>当前没有待排期的需求</p>
              <p className="hint">请先将需求卡片拖入「排期中」列</p>
              <button className="btn btn-primary" onClick={onClose}>
                返回看板
              </button>
            </div>
          ) : (
            <>
              {votingPhase === 'voting' ? renderVotingPhase() : renderResultsPhase()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
