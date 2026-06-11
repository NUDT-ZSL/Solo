import { useEffect, useRef, useState, useCallback } from 'react';
import MilestoneCard from './MilestoneCard';
import type { Milestone } from '../types';

interface MilestoneListProps {
  milestones: Milestone[];
  newMilestoneId: string | null;
  onCelebrate: (id: string) => Promise<{ success: boolean; newProgress: number; message?: string } | null>;
  onUpdate: (id: string, data: { title?: string; description?: string }) => void;
}

interface CardVisibility {
  [key: string]: {
    opacity: number;
    translateY: number;
  };
}

const MilestoneList = ({ milestones, newMilestoneId, onCelebrate, onUpdate }: MilestoneListProps) => {
  const listRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [visibility, setVisibility] = useState<CardVisibility>({});
  const rafIdRef = useRef<number | null>(null);

  const calculateVisibility = useCallback(() => {
    const newVisibility: CardVisibility = {};
    const viewportHeight = window.innerHeight;

    milestones.forEach((milestone) => {
      const cardElement = cardRefs.current[milestone.id];
      if (cardElement) {
        const rect = cardElement.getBoundingClientRect();
        const cardTop = rect.top;
        const cardBottom = rect.bottom;

        if (cardBottom < 0 || cardTop > viewportHeight) {
          newVisibility[milestone.id] = { opacity: 0.4, translateY: 10 };
        } else {
          const distanceFromTop = Math.max(0, cardTop);
          const maxDistance = viewportHeight * 0.5;
          const progress = Math.min(1, distanceFromTop / maxDistance);
          const opacity = 0.4 + (1 - progress) * 0.6;
          const translateY = progress * 10;

          newVisibility[milestone.id] = { opacity, translateY };
        }
      } else {
        newVisibility[milestone.id] = { opacity: 1, translateY: 0 };
      }
    });

    setVisibility(newVisibility);
  }, [milestones]);

  const onScroll = useCallback(() => {
    if (rafIdRef.current !== null) {
      return;
    }
    rafIdRef.current = requestAnimationFrame(() => {
      calculateVisibility();
      rafIdRef.current = null;
    });
  }, [calculateVisibility]);

  useEffect(() => {
    calculateVisibility();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [onScroll, calculateVisibility]);

  useEffect(() => {
    const timer = setTimeout(() => {
      calculateVisibility();
    }, 100);
    return () => clearTimeout(timer);
  }, [milestones, calculateVisibility]);

  const setCardRef = (id: string) => (el: HTMLDivElement | null) => {
    cardRefs.current[id] = el;
  };

  const getAnimationClass = (milestone: Milestone) => {
    if (milestone.id === newMilestoneId) {
      return 'slide-from-top';
    }
    return 'slide-from-right';
  };

  if (milestones.length === 0) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.emptyIcon}>🎯</div>
        <p style={styles.emptyText}>还没有里程碑</p>
        <p style={styles.emptySubtext}>点击下方按钮创建第一个里程碑</p>
      </div>
    );
  }

  return (
    <div ref={listRef} style={styles.list}>
      <style>{`
        @keyframes slideFromRight {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes slideFromTop {
          from {
            opacity: 0;
            transform: translateY(-50px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .slide-from-right {
          animation: slideFromRight 0.6s ease-out forwards;
        }
        
        .slide-from-top {
          animation: slideFromTop 0.5s ease-out forwards;
        }
      `}</style>
      
      {milestones.map((milestone, index) => {
        const cardVisibility = visibility[milestone.id] || { opacity: 1, translateY: 0 };
        return (
          <div
            key={milestone.id}
            ref={setCardRef(milestone.id)}
            className={getAnimationClass(milestone)}
            style={{
              ...styles.cardWrapper,
              opacity: cardVisibility.opacity,
              transform: `translateY(${cardVisibility.translateY}px)`,
              transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
              animationDelay: `${index * 0.1}s`,
            }}
          >
            <MilestoneCard
              milestone={milestone}
              onCelebrate={onCelebrate}
              onUpdate={onUpdate}
            />
          </div>
        );
      })}
    </div>
  );
};

const styles = {
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
    padding: '20px 0',
  },
  cardWrapper: {
    willChange: 'opacity, transform',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '80px 20px',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  emptyText: {
    fontSize: '20px',
    color: '#e2e8f0',
    marginBottom: '8px',
    fontWeight: '600' as const,
  },
  emptySubtext: {
    fontSize: '14px',
    color: '#64748b',
  },
};

export default MilestoneList;
