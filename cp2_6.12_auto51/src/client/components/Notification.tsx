import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Badge } from '../types';
import { BADGE_CONFIGS } from '../types';

interface NotificationProps {
  badges: Badge[];
  onBadgeShown?: (badgeId: string) => void;
}

interface DisplayBadge extends Badge {
  displayId: number;
}

const badgeIconMap: Record<string, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
};

const Notification: React.FC<NotificationProps> = ({ badges, onBadgeShown }) => {
  const [displayBadges, setDisplayBadges] = useState<DisplayBadge[]>([]);
  const [displayCounter, setDisplayCounter] = useState(0);
  const [processedBadgeIds, setProcessedBadgeIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    badges.forEach((badge) => {
      if (!processedBadgeIds.has(badge.id)) {
        setProcessedBadgeIds((prev) => new Set(prev).add(badge.id));
        setDisplayCounter((prev) => {
          const newId = prev + 1;
          setDisplayBadges((current) => [...current, { ...badge, displayId: newId }]);
          return newId;
        });
      }
    });
  }, [badges, processedBadgeIds]);

  const removeBadge = (displayId: number) => {
    setDisplayBadges((prev) => prev.filter((b) => b.displayId !== displayId));
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence>
        {displayBadges.map((badge) => {
          const config = BADGE_CONFIGS.find((c) => c.type === badge.badgeType);
          const icon = badgeIconMap[badge.badgeType] || '🏅';
          const name = config?.name || '徽章';
          const gradient = config?.gradient || 'linear-gradient(135deg, #F5A623 0%, #F7B84E 100%)';
          const glowColor = config?.glowColor || '#F5A623';

          return (
            <motion.div
              key={badge.displayId}
              initial={{ x: 400, opacity: 0, scale: 0.8 }}
              animate={{
                x: 0,
                opacity: 1,
                scale: 1,
                transition: {
                  type: 'spring',
                  stiffness: 300,
                  damping: 25,
                  mass: 0.8,
                },
              }}
              exit={{
                x: -400,
                opacity: 0,
                scale: 0.8,
                transition: {
                  duration: 0.4,
                  ease: 'easeIn',
                },
              }}
              onAnimationComplete={(definition) => {
                if (definition === 'animate') {
                  const timer = setTimeout(() => {
                    removeBadge(badge.displayId);
                    onBadgeShown?.(badge.id);
                  }, 3000);
                  return () => clearTimeout(timer);
                }
              }}
              style={{
                background: '#FFFFFF',
                borderRadius: 16,
                padding: 0,
                boxShadow: `0 12px 40px ${glowColor}55, 0 4px 16px rgba(0,0,0,0.1)`,
                overflow: 'hidden',
                pointerEvents: 'auto',
                minWidth: 300,
                maxWidth: 360,
              }}
            >
              <div
                style={{
                  height: 6,
                  background: gradient,
                }}
              />
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '16px 20px',
                }}
              >
                <motion.div
                  animate={{
                    rotate: [0, -8, 8, -4, 4, 0],
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    delay: 0.3,
                    duration: 0.8,
                    ease: 'easeOut',
                  }}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: gradient,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontSize: 28,
                    boxShadow: `0 0 24px ${glowColor}88`,
                    flexShrink: 0,
                  }}
                >
                  {icon}
                </motion.div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#F5A623',
                      marginBottom: 4,
                      letterSpacing: 0.5,
                    }}
                  >
                    🎉 恭喜获得新徽章！
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.3 }}
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: '#3D2914',
                      marginBottom: 4,
                    }}
                  >
                    {name}
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.3 }}
                    style={{
                      fontSize: 13,
                      color: '#8B7355',
                    }}
                  >
                    获得于 {formatDate(badge.earnedAt)}
                  </motion.div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.1, backgroundColor: '#FFF5E6' }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => removeBadge(badge.displayId)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    border: 'none',
                    background: 'transparent',
                    color: '#A0896C',
                    fontSize: 16,
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  ✕
                </motion.button>
              </div>

              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{
                  delay: 0.5,
                  duration: 2.5,
                  ease: 'linear',
                }}
                style={{
                  height: 3,
                  background: gradient,
                  opacity: 0.6,
                }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default Notification;
