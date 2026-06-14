import React from 'react';
import { STAGE_CONFIG } from '../types';
import type { Candidate, CandidateStage } from '../types';

interface CandidateCardProps {
  candidate: Candidate;
  onDragStart: (e: React.DragEvent, candidate: Candidate) => void;
  onDragEnd: () => void;
  onScheduleInterview: (candidate: Candidate) => void;
  onRecordOffer: (candidate: Candidate) => void;
}

const CandidateCard: React.FC<CandidateCardProps> = ({
  candidate,
  onDragStart,
  onDragEnd,
  onScheduleInterview,
  onRecordOffer,
}) => {
  const stageConfig = STAGE_CONFIG.find((s) => s.key === candidate.stage);

  return (
    <div
      className="candidate-card"
      style={{ borderLeftColor: stageConfig?.color || '#3498db' }}
      draggable
      onDragStart={(e) => onDragStart(e, candidate)}
      onDragEnd={onDragEnd}
    >
      <div className="candidate-actions">
        {candidate.stage === 'interview' && (
          <button
            className="candidate-action-btn"
            title="安排面试"
            onClick={(e) => {
              e.stopPropagation();
              onScheduleInterview(candidate);
            }}
          >
            📅
          </button>
        )}
        {candidate.stage === 'offer' && (
          <button
            className="candidate-action-btn"
            title="录入Offer"
            onClick={(e) => {
              e.stopPropagation();
              onRecordOffer(candidate);
            }}
          >
            💼
          </button>
        )}
      </div>
      <div className="candidate-name">{candidate.name}</div>
      <div className="candidate-years">{candidate.yearsOfExperience}年经验</div>
      <div className="candidate-skills">
        {candidate.skills.slice(0, 3).map((s) => (
          <span key={s} className="skill-tag">{s}</span>
        ))}
        {candidate.skills.length > 3 && (
          <span className="skill-tag">+{candidate.skills.length - 3}</span>
        )}
      </div>
      {candidate.interviews.length > 0 && (
        <div className="interview-timeline">
          {candidate.interviews.map((intv) => (
            <div key={intv.id} className="interview-item">
              <strong>{intv.date}</strong> {intv.timeSlot}
            </div>
          ))}
        </div>
      )}
      {candidate.offer && (
        <div className="offer-info">
          <div><strong>Offer金额：</strong>{candidate.offer.salary}</div>
          <div><strong>入职日期：</strong>{candidate.offer.onboardDate}</div>
          {candidate.offer.notes && (
            <div><strong>备注：</strong>{candidate.offer.notes}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default CandidateCard;
