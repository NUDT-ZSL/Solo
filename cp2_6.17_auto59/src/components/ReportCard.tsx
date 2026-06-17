import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Report } from '../types';
import axiosClient from '../api/axiosClient';

interface ReportCardProps {
  report: Report;
  onUpdate?: (updated: Report) => void;
}

const ReportCard: React.FC<ReportCardProps> = ({ report, onUpdate }) => {
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedRating, setSelectedRating] = useState(report.rating);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [likes, setLikes] = useState(report.likes);

  const borderColor = report.type === 'daily' ? '#1976d2' : '#7b1fa2';
  const typeLabel = report.type === 'daily' ? '晨会' : '周报';

  const formatTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), {
        addSuffix: true,
        locale: zhCN,
      });
    } catch {
      return dateStr;
    }
  };

  const handleLike = async () => {
    try {
      setLikeAnimating(true);
      setLikes((prev) => prev + 1);
      setTimeout(() => setLikeAnimating(false), 300);
      const res = (await axiosClient.post(`/reports/${report.id}/like`)) as unknown as {
        success: boolean;
        data: Report;
      };
      if (res.success && onUpdate) {
        onUpdate(res.data);
      }
    } catch {
      setLikes((prev) => prev - 1);
    }
  };

  const handleRate = async (rating: number) => {
    try {
      setSelectedRating(rating);
      const res = (await axiosClient.post(`/reports/${report.id}/rate`, {
        rating,
      })) as unknown as { success: boolean; data: Report };
      if (res.success && onUpdate) {
        onUpdate(res.data);
      }
      setShowRatingModal(false);
    } catch {
    }
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 640,
        padding: 20,
        borderRadius: 12,
        background: '#ffffff',
        borderLeft: `4px solid ${borderColor}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        margin: '0 auto 16px auto',
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img
            src={report.user?.avatarUrl}
            alt={report.user?.name}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              border: '2px solid #e0e0e0',
              objectFit: 'cover',
            }}
          />
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: '#212121' }}>
              {report.user?.name}
            </div>
            <div style={{ fontSize: 12, color: '#757575' }}>{typeLabel}</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: '#757575', whiteSpace: 'nowrap' }}>
          {formatTime(report.createdAt)}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#3949ab', marginBottom: 4 }}>
          今日完成
        </div>
        <div style={{ fontSize: 14, color: '#212121', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {report.content.done}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#5c6bc0', marginBottom: 4 }}>
          明日计划
        </div>
        <div style={{ fontSize: 14, color: '#212121', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {report.content.plan}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#ff7043', marginBottom: 4 }}>
          遇到的阻碍
        </div>
        <div style={{ fontSize: 14, color: '#212121', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {report.content.blocker}
        </div>
      </div>

      {report.blockerType && report.blockerType !== '无' && (
        <div
          style={{
            display: 'inline-block',
            padding: '4px 10px',
            background: '#fff3e0',
            color: '#e65100',
            fontSize: 12,
            borderRadius: 4,
            marginBottom: 12,
          }}
        >
          阻碍类型：{report.blockerType}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          paddingTop: 12,
          borderTop: '1px solid #f0f0f0',
        }}
      >
        <button
          onClick={handleLike}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            background: likes > report.likes ? '#e8eaf6' : '#f5f5f5',
            color: '#3949ab',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            transition: 'all 0.15s ease',
            transform: likeAnimating ? 'scale(0.95)' : 'scale(1)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#e8eaf6';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              likes > report.likes ? '#e8eaf6' : '#f5f5f5';
          }}
        >
          <span style={{ fontSize: 16 }}>👍</span>
          <span>{likes}</span>
        </button>

        <button
          onClick={() => setShowRatingModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            background: selectedRating > 0 ? '#fff8e1' : '#f5f5f5',
            color: '#ffa000',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#fff8e1';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              selectedRating > 0 ? '#fff8e1' : '#f5f5f5';
          }}
        >
          <span style={{ fontSize: 16 }}>⭐</span>
          <span>{selectedRating > 0 ? `${selectedRating}分` : '评分'}</span>
        </button>
      </div>

      {showRatingModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowRatingModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              padding: 32,
              borderRadius: 12,
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
              minWidth: 320,
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, color: '#212121' }}>
              对此汇报评分
            </h3>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => handleRate(star)}
                  style={{
                    fontSize: 36,
                    background: 'transparent',
                    cursor: 'pointer',
                    padding: 4,
                    transition: 'transform 0.15s',
                    transform: hoverRating >= star ? 'scale(1.2)' : 'scale(1)',
                  }}
                >
                  {hoverRating >= star || selectedRating >= star ? '⭐' : '☆'}
                </button>
              ))}
            </div>
            <div style={{ textAlign: 'center', color: '#757575', fontSize: 14, marginBottom: 20 }}>
              {(hoverRating || selectedRating) > 0
                ? `${hoverRating || selectedRating} 星`
                : '点击星星进行评分'}
            </div>
            <button
              onClick={() => setShowRatingModal(false)}
              style={{
                width: '100%',
                padding: '10px 0',
                background: '#f5f5f5',
                color: '#212121',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 500,
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#eeeeee';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#f5f5f5';
              }}
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportCard;
