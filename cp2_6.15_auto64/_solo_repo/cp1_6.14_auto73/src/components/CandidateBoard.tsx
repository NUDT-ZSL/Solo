import React, { useState, useRef, useCallback } from 'react';
import CandidateCard from './CandidateCard';
import InterviewModal from './InterviewModal';
import OfferModal from './OfferModal';
import { candidatesApi } from '../utils/api';
import { STAGE_CONFIG } from '../types';
import type { Candidate, CandidateStage } from '../types';

interface CandidateBoardProps {
  candidates: Candidate[];
  onRefresh: () => void;
}

const CandidateBoard: React.FC<CandidateBoardProps> = ({ candidates, onRefresh }) => {
  const [draggedCandidate, setDraggedCandidate] = useState<Candidate | null>(null);
  const [dragOverStage, setDragOverStage] = useState<CandidateStage | null>(null);
  const [interviewCandidate, setInterviewCandidate] = useState<Candidate | null>(null);
  const [offerCandidate, setOfferCandidate] = useState<Candidate | null>(null);
  const dragTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const getCandidatesByStage = useCallback(
    (stage: CandidateStage) => candidates.filter((c) => c.stage === stage),
    [candidates]
  );

  const handleDragStart = (e: React.DragEvent, candidate: Candidate) => {
    setDraggedCandidate(candidate);
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };

    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', candidate.id);
    }

    const target = e.currentTarget as HTMLElement;
    setTimeout(() => {
      target.classList.add('dragging');
    }, 0);

    dragTimeoutRef.current = setTimeout(() => {
      if (draggedCandidate) {
        setDraggedCandidate(null);
        setDragOverStage(null);
        const el = document.querySelector('.dragging');
        if (el) el.classList.remove('dragging');
      }
    }, 30000);
  };

  const handleDragEnd = () => {
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }

    const el = document.querySelector('.dragging');
    if (el) el.classList.remove('dragging');

    setDraggedCandidate(null);
    setDragOverStage(null);
    dragStartPosRef.current = null;
  };

  const handleDragOver = (e: React.DragEvent, stage: CandidateStage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stage);

    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
    }
    dragTimeoutRef.current = setTimeout(() => {
      setDraggedCandidate(null);
      setDragOverStage(null);
      const el = document.querySelector('.dragging');
      if (el) el.classList.remove('dragging');
    }, 500);
  };

  const handleDragLeave = () => {
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStage: CandidateStage) => {
    e.preventDefault();
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }

    if (!draggedCandidate || draggedCandidate.stage === targetStage) {
      setDraggedCandidate(null);
      setDragOverStage(null);
      return;
    }

    try {
      await candidatesApi.update(draggedCandidate.id, { stage: targetStage });
      onRefresh();
    } catch (err) {
      console.error('Failed to update candidate stage:', err);
    }

    setDraggedCandidate(null);
    setDragOverStage(null);
  };

  const handleScheduleInterview = (candidate: Candidate) => {
    setInterviewCandidate(candidate);
  };

  const handleRecordOffer = (candidate: Candidate) => {
    setOfferCandidate(candidate);
  };

  return (
    <>
      <div className="content-header">
        <h1>候选人看板</h1>
      </div>
      <div className="candidate-board">
        {STAGE_CONFIG.map((stage) => {
          const stageCandidates = getCandidatesByStage(stage.key);
          return (
            <div
              key={stage.key}
              className={`swimlane ${dragOverStage === stage.key ? 'drag-over' : ''}`}
              onDragOver={(e) => handleDragOver(e, stage.key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.key)}
            >
              <div
                className="swimlane-header"
                style={{ borderBottom: `2px solid ${stage.color}` }}
              >
                <span style={{ color: stage.color }}>●</span>
                {' '}{stage.label}
                <span style={{
                  marginLeft: '8px',
                  fontSize: '12px',
                  color: '#636e72',
                  fontWeight: 400,
                }}>
                  {stageCandidates.length}
                </span>
              </div>
              <div className="swimlane-body">
                {stageCandidates.map((candidate) => (
                  <CandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onScheduleInterview={handleScheduleInterview}
                    onRecordOffer={handleRecordOffer}
                  />
                ))}
                {stageCandidates.length === 0 && (
                  <div style={{
                    textAlign: 'center',
                    padding: '24px 12px',
                    color: '#b0b4ba',
                    fontSize: '13px',
                  }}>
                    拖拽候选人至此
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {interviewCandidate && (
        <InterviewModal
          candidate={interviewCandidate}
          onClose={() => setInterviewCandidate(null)}
          onSaved={() => {
            setInterviewCandidate(null);
            onRefresh();
          }}
        />
      )}

      {offerCandidate && (
        <OfferModal
          candidate={offerCandidate}
          onClose={() => setOfferCandidate(null)}
          onSaved={() => {
            setOfferCandidate(null);
            onRefresh();
          }}
        />
      )}
    </>
  );
};

export default CandidateBoard;
