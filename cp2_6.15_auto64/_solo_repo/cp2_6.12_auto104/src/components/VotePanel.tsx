import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { VoteSession, Thought } from '../services/roomService';
import { animationConfig } from '../utils/animationConfig';

interface VotePanelProps {
  session: VoteSession;
  thoughts: Thought[];
  onVote: (thoughtId: string) => void;
  hasVoted: boolean;
}

const ArcProgress: React.FC<{ progress: number; remainingTime: number }> = ({
  progress,
  remainingTime,
}) => {
  const size = 120;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius;
  const offset = circumference * (1 - progress);

  const startColor = { r: 76, g: 175, b: 80 };
  const endColor = { r: 244, g: 67, b: 54 };
  const currentColor = useMemo(() => {
    const r = Math.round(startColor.r + (endColor.r - startColor.r) * (1 - progress));
    const g = Math.round(startColor.g + (endColor.g - startColor.g) * (1 - progress));
    const b = Math.round(startColor.b + (endColor.b - startColor.b) * (1 - progress));
    return `rgb(${r}, ${g}, ${b})`;
  }, [progress]);

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size / 2 + 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width={size} height={size / 2 + 10} style={{ overflow: 'visible' }}>
        <path
          d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          fill="none"
          stroke="#e0e0e0"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <motion.path
          d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          fill="none"
          stroke={currentColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: 0 }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.1, ease: 'linear' }}
        />
      </svg>
      <motion.span
        key={remainingTime}
        initial={{ scale: 1.2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{
          position: 'absolute',
          bottom: 0,
          fontSize: '24px',
          fontWeight: 'bold',
          color: currentColor,
        }}
      >
        {remainingTime}
      </motion.span>
    </div>
  );
};

export const VotePanel: React.FC<VotePanelProps> = ({
  session,
  thoughts,
  onVote,
  hasVoted,
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState(
    Math.max(0, session.duration - Math.floor((Date.now() - session.startTime) / 1000)),
  );

  useEffect(() => {
    if (!session.isActive) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
      const remaining = Math.max(0, session.duration - elapsed);
      setRemainingTime(remaining);
    }, 100);

    return () => clearInterval(interval);
  }, [session.isActive, session.startTime, session.duration]);

  const progress = remainingTime / session.duration;

  const chartData = useMemo(() => {
    return session.options
      .map((opt) => {
        const thought = thoughts.find((t) => t.id === opt.thoughtId);
        return {
          name: thought?.content?.substring(0, 15) + (thought?.content.length! > 15 ? '...' : ''),
          votes: opt.votes,
          thoughtId: opt.thoughtId,
        };
      })
      .sort((a, b) => b.votes - a.votes);
  }, [session.options, thoughts]);

  const handleSubmit = () => {
    if (selectedOption && !hasVoted) {
      onVote(selectedOption);
    }
  };

  const maxVotes = Math.max(...chartData.map((d) => d.votes), 1);
  const barColors = ['#5b8aa8', '#7fa8c4', '#a3c6e0', '#c7e4fc', '#e0f0ff'];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: animationConfig.durations.normal, ease: animationConfig.easings.easeOut }}
      style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: 'var(--shadow-medium)',
        marginBottom: '24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px',
        }}
      >
        {session.isActive && (
          <ArcProgress progress={progress} remainingTime={remainingTime} />
        )}
        {!session.isActive && (
          <h2 style={{ color: 'var(--color-primary)', fontSize: '20px' }}>投票结果</h2>
        )}
      </div>

      <AnimatePresence mode="wait">
        {session.isActive && !hasVoted && (
          <motion.div
            key="voting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              style={{
                display: 'grid',
                gap: '12px',
                marginBottom: '20px',
              }}
            >
              {session.options.map((opt) => {
                const thought = thoughts.find((t) => t.id === opt.thoughtId);
                return (
                  <motion.button
                    key={opt.thoughtId}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedOption(opt.thoughtId)}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      border:
                        selectedOption === opt.thoughtId
                          ? '2px solid var(--color-secondary)'
                          : '2px solid var(--color-border)',
                      backgroundColor:
                        selectedOption === opt.thoughtId
                          ? 'rgba(245, 166, 35, 0.1)'
                          : 'var(--color-bg-gradient-start)',
                      textAlign: 'left',
                      fontSize: '14px',
                      color: 'var(--color-text-primary)',
                      transition: 'all var(--animation-fast) var(--ease-out)',
                    }}
                  >
                    {thought?.content}
                  </motion.button>
                );
              })}
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmit}
              disabled={!selectedOption}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                backgroundColor: selectedOption ? 'var(--color-secondary)' : '#ccc',
                color: 'white',
                fontSize: '16px',
                fontWeight: 600,
                cursor: selectedOption ? 'pointer' : 'not-allowed',
              }}
            >
              提交投票
            </motion.button>
          </motion.div>
        )}

        {session.isActive && hasVoted && (
          <motion.div
            key="voted"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: 'var(--color-text-secondary)',
            }}
          >
            <p style={{ fontSize: '18px' }}>您已完成投票，请等待结果...</p>
          </motion.div>
        )}

        {!session.isActive && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div style={{ height: '300px', marginTop: '20px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <XAxis type="number" domain={[0, 'auto']} />
                  <YAxis type="category" dataKey="name" width={120} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: 'var(--shadow-medium)',
                    }}
                  />
                  <Bar dataKey="votes" radius={[0, 8, 8, 0]} animationDuration={500}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={barColors[index % barColors.length]}
                        fillOpacity={entry.votes === maxVotes ? 1 : 0.7}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              {chartData.map((item, index) => (
                <motion.div
                  key={item.thoughtId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    margin: '8px 16px',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    backgroundColor:
                      item.votes === maxVotes
                        ? 'rgba(245, 166, 35, 0.2)'
                        : 'var(--color-bg-gradient-start)',
                    fontSize: '14px',
                  }}
                >
                  {item.votes === maxVotes && (
                    <span style={{ fontSize: '18px' }}>👑</span>
                  )}
                  <span>{item.name}</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                    {item.votes}票
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
