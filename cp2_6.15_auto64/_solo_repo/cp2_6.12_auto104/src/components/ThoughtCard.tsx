import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Thought } from '../services/roomService';
import { animationConfig } from '../utils/animationConfig';

interface ThoughtCardProps {
  thought: Thought;
  onLike: (id: string) => void;
  onDislike: (id: string) => void;
  currentUserId: string;
  isNew?: boolean;
}

const formatTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  return `${Math.floor(hours / 24)}天前`;
};

const CrownIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <path
      d="M5 16L3 8L8 12L12 4L16 12L21 8L19 16H5Z"
      stroke="#f5a623"
      strokeWidth="2"
      fill="#ffd700"
    />
    <path d="M3 20H21" stroke="#f5a623" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const ThumbUpIcon = ({ active }: { active: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? '#4caf50' : 'none'}>
    <path
      d="M7 22V11M2 13V22H7V13H2ZM15.17 5.17L14.83 9H21C21.83 9 22.5 9.67 22.5 10.5V12.62C22.5 13.03 22.33 13.42 22.03 13.71L16.12 19.63C15.87 19.87 15.53 20 15.17 20H7V11L11.67 5.17C11.88 4.9 12.22 4.75 12.58 4.78C12.74 4.8 12.89 4.84 13.03 4.91L15.17 5.17Z"
      stroke={active ? '#4caf50' : '#7f8c8d'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ThumbDownIcon = ({ active }: { active: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? '#f44336' : 'none'}>
    <path
      d="M17 2V13M22 11V2H17V11H22ZM8.83 18.83L9.17 15H3C2.17 15 1.5 14.33 1.5 13.5V11.38C1.5 10.97 1.67 10.58 1.97 10.29L7.88 4.37C8.13 4.13 8.47 4 8.83 4H17V13L12.33 18.83C12.12 19.1 11.78 19.25 11.42 19.22C11.26 19.2 11.11 19.16 10.97 19.09L8.83 18.83Z"
      stroke={active ? '#f44336' : '#7f8c8d'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ThoughtCard: React.FC<ThoughtCardProps> = ({
  thought,
  onLike,
  onDislike,
  currentUserId,
  isNew = false,
}) => {
  const isLowScore = thought.score <= -5;
  const isHighScore = thought.score >= 10;
  const hasLiked = thought.likes.includes(currentUserId);
  const hasDisliked = thought.dislikes.includes(currentUserId);

  const pulseClass = useMemo(() => {
    if (isHighScore) return 'pulse-glow-positive';
    if (isLowScore) return 'pulse-glow-negative';
    return '';
  }, [isHighScore, isLowScore]);

  const cardVariants = {
    hidden: animationConfig.card.enter,
    visible: animationConfig.card.visible,
  };

  const scoreColor = thought.score > 0 ? '#4caf50' : thought.score < 0 ? '#f44336' : '#7f8c8d';
  const scorePrefix = thought.score > 0 ? '+' : '';

  return (
    <motion.div
      layout
      initial={isNew ? 'hidden' : false}
      animate="visible"
      variants={cardVariants}
      style={{
        position: 'relative',
        backgroundColor: 'var(--color-card-bg)',
        borderRadius: 'var(--card-radius)',
        padding: '16px',
        boxShadow: 'var(--shadow-soft)',
        breakInside: 'avoid',
        marginBottom: 'var(--card-spacing)',
        width: '100%',
      }}
      className={pulseClass}
    >
      {thought.hasCrown && (
        <motion.div
          style={{
            position: 'absolute',
            top: -12,
            right: -8,
            zIndex: 10,
          }}
          animate={animationConfig.crown.float}
        >
          <CrownIcon />
        </motion.div>
      )}

      {isLowScore && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
            borderRadius: 'var(--card-radius)',
            pointerEvents: 'none',
            zIndex: 5,
          }}
        />
      )}

      <div style={{ opacity: isLowScore ? 0.5 : 1, transition: 'opacity 0.3s ease' }}>
        <p
          style={{
            fontSize: '14px',
            lineHeight: 1.6,
            color: 'var(--color-text-primary)',
            marginBottom: '12px',
            wordBreak: 'break-word',
          }}
        >
          {thought.content}
        </p>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
            color: 'var(--color-text-secondary)',
            marginBottom: '12px',
          }}
        >
          <span>{thought.isAnonymous ? '匿名用户' : thought.author}</span>
          <span>{formatTime(thought.createdAt)}</span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            borderTop: '1px solid var(--color-border)',
            paddingTop: '12px',
          }}
        >
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onLike(thought.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'none',
              padding: '4px 8px',
              borderRadius: '6px',
            }}
          >
            <ThumbUpIcon active={hasLiked} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onDislike(thought.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'none',
              padding: '4px 8px',
              borderRadius: '6px',
            }}
          >
            <ThumbDownIcon active={hasDisliked} />
          </motion.button>

          <AnimatePresence mode="wait">
            <motion.span
              key={thought.score}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={animationConfig.score.change.transition}
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: scoreColor,
                marginLeft: 'auto',
              }}
            >
              {scorePrefix}
              {thought.score}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};
