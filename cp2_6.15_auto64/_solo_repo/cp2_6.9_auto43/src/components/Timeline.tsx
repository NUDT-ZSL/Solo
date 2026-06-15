import React, { useRef, useState, useEffect, useCallback } from 'react';
import MilestoneCard from './MilestoneCard';
import type { Milestone, MonthInfo } from '../types';

interface TimelineProps {
  milestones: Milestone[];
  months: MonthInfo[];
  onMilestoneUpdate: (milestones: Milestone[]) => void;
  onProgressChange: (id: string, progress: number) => void;
  onDelete: (id: string) => void;
  onConflict: (existing: Milestone, incoming: Milestone) => Promise<boolean>;
}

const MONTH_WIDTH = 220;
const CARD_HEIGHT = 140;
const CARD_VERTICAL_GAP = 16;

const Timeline: React.FC<TimelineProps> = ({
  milestones,
  months,
  onMilestoneUpdate,
  onProgressChange,
  onDelete,
  onConflict,
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getMonthIndex = useCallback((dateStr: string): number => {
    const date = new Date(dateStr);
    return months.findIndex(
      (m) => m.year === date.getFullYear() && m.month === date.getMonth()
    );
  }, [months]);

  const getPositionedMilestones = useCallback(() => {
    const grouped = new Map<number, Milestone[]>();
    milestones.forEach((m) => {
      const idx = getMonthIndex(m.date);
      if (idx >= 0) {
        if (!grouped.has(idx)) grouped.set(idx, []);
        grouped.get(idx)!.push(m);
      }
    });
    return grouped;
  }, [milestones, getMonthIndex]);

  const positionedMilestones = getPositionedMilestones();

  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent, id: string) => {
      const milestone = milestones.find((m) => m.id === id);
      if (!milestone) return;

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const cardEl = cardRefs.current.get(id);
      if (cardEl) {
        const rect = cardEl.getBoundingClientRect();
        setDragOffset({
          x: clientX - rect.left,
          y: clientY - rect.top,
        });
      }

      setDraggingId(id);
      setDragPosition({ x: clientX, y: clientY });

      const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
        const mx =
          'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
        const my =
          'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
        setDragPosition({ x: mx, y: my });

        if (timelineRef.current) {
          const timelineRect = timelineRef.current.getBoundingClientRect();
          const relativeX = mx - timelineRect.left + (timelineRef.current.scrollLeft || 0);
          const monthIdx = Math.floor(relativeX / MONTH_WIDTH);
          if (monthIdx >= 0 && monthIdx < months.length) {
            setHoveredMonth(monthIdx);
          } else {
            setHoveredMonth(null);
          }
        }
      };

      const handleEnd = async (endEvent: MouseEvent | TouchEvent) => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('touchend', handleEnd);

        if (!timelineRef.current) {
          setDraggingId(null);
          setHoveredMonth(null);
          return;
        }

        const timelineRect = timelineRef.current.getBoundingClientRect();
        const endX =
          ('changedTouches' in endEvent ? endEvent.changedTouches[0].clientX : (endEvent as MouseEvent).clientX) -
          timelineRect.left +
          (timelineRef.current.scrollLeft || 0);

        let targetMonthIdx = Math.floor(endX / MONTH_WIDTH);
        if (targetMonthIdx < 0) targetMonthIdx = 0;
        if (targetMonthIdx >= months.length) targetMonthIdx = months.length - 1;

        const targetMonth = months[targetMonthIdx];
        const draggingMilestone = milestones.find((m) => m.id === draggingId);

        if (draggingMilestone && targetMonth) {
          const targetDate = new Date(draggingMilestone.date);
          targetDate.setFullYear(targetMonth.year, targetMonth.month, 15);
          const newDateStr = targetDate.toISOString().split('T')[0];

          const conflictMilestone = milestones.find(
            (m) => m.id !== draggingId && m.date === newDateStr
          );

          let shouldMove = true;
          if (conflictMilestone) {
            shouldMove = await onConflict(conflictMilestone, draggingMilestone);
          }

          if (shouldMove) {
            const updated = milestones.map((m) =>
              m.id === draggingId ? { ...m, date: newDateStr } : m
            );
            onMilestoneUpdate(updated);
          }
        }

        setDraggingId(null);
        setHoveredMonth(null);
      };

      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleMove, { passive: false });
      document.addEventListener('touchend', handleEnd);
    },
    [draggingId, milestones, months, onMilestoneUpdate, onConflict]
  );

  const getCardStyle = (milestone: Milestone, monthIdx: number, cardIdx: number): React.CSSProperties => {
    if (isMobile) {
      return {
        margin: '8px 12px',
      };
    }

    const baseLeft = monthIdx * MONTH_WIDTH + 20;
    const baseTop = 80 + cardIdx * (CARD_HEIGHT + CARD_VERTICAL_GAP);

    if (milestone.id === draggingId) {
      return {
        position: 'fixed',
        left: dragPosition.x - dragOffset.x,
        top: dragPosition.y - dragOffset.y,
        zIndex: 1000,
        pointerEvents: 'none',
        opacity: 0.9,
      };
    }

    return {
      position: 'absolute',
      left: baseLeft,
      top: baseTop,
      transition: draggingId ? 'left 0.2s ease, top 0.2s ease' : 'none',
    };
  };

  const totalHeight = isMobile
    ? 'auto'
    : Math.max(
        300,
        ...Array.from(positionedMilestones.entries()).map(([, cards]) => {
          return 80 + cards.length * (CARD_HEIGHT + CARD_VERTICAL_GAP) + 20;
        })
      );

  if (isMobile) {
    return (
      <div style={{ padding: '16px' }}>
        {months.map((month, monthIdx) => {
          const monthCards = positionedMilestones.get(monthIdx) || [];
          const isHovered = hoveredMonth === monthIdx;

          return (
            <div
              key={`${month.year}-${month.month}`}
              style={{
                display: 'flex',
                marginBottom: '16px',
                borderRadius: '12px',
                backgroundColor: isHovered ? 'rgba(52, 152, 219, 0.08)' : 'transparent',
                transition: 'background-color 0.2s ease',
              }}
            >
              <div
                style={{
                  width: '80px',
                  flexShrink: 0,
                  padding: '16px 12px',
                  backgroundColor: '#ecf0f1',
                  borderRadius: '12px 0 0 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#333' }}>
                  {month.label}
                </div>
                <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '2px' }}>
                  {month.yearLabel}
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  minHeight: '100px',
                  padding: '8px 0',
                  backgroundColor: '#fff',
                  borderRadius: '0 12px 12px 0',
                  border: '1px dashed #ddd',
                  borderLeft: 'none',
                }}
              >
                {monthCards.length === 0 ? (
                  <div
                    style={{
                      padding: '24px 12px',
                      color: '#bbb',
                      fontSize: '12px',
                      textAlign: 'center',
                    }}
                  >
                    拖拽任务到此处添加里程碑
                  </div>
                ) : (
                  monthCards.map((milestone, cardIdx) => (
                    <div
                      key={milestone.id}
                      ref={(el) => {
                        if (el) cardRefs.current.set(milestone.id, el);
                      }}
                      style={getCardStyle(milestone, monthIdx, cardIdx)}
                    >
                      <MilestoneCard
                        milestone={milestone}
                        isDragging={milestone.id === draggingId}
                        onDragStart={handleDragStart}
                        onProgressChange={onProgressChange}
                        onDelete={onDelete}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      ref={timelineRef}
      style={{
        overflowX: 'auto',
        overflowY: 'auto',
        position: 'relative',
        padding: '0 20px 20px',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: months.length * MONTH_WIDTH,
          height: totalHeight,
          minHeight: 300,
        }}
      >
        {/* 月份刻度 */}
        {months.map((month, idx) => {
          const isHovered = hoveredMonth === idx;
          return (
            <div
              key={`${month.year}-${month.month}`}
              style={{
                position: 'absolute',
                left: idx * MONTH_WIDTH,
                top: 0,
                width: MONTH_WIDTH,
                height: '100%',
                borderLeft: '1px solid #dfe6e9',
                backgroundColor: isHovered ? 'rgba(52, 152, 219, 0.05)' : 'transparent',
                transition: 'background-color 0.2s ease',
              }}
            >
              <div
                style={{
                  position: 'sticky',
                  top: 0,
                  padding: '16px 0',
                  textAlign: 'center',
                  backgroundColor: '#f5f6fa',
                  zIndex: 10,
                  borderBottom: '2px solid #dfe6e9',
                }}
              >
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#333' }}>
                  {month.label}
                </div>
                <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '4px' }}>
                  {month.yearLabel}
                </div>
              </div>
            </div>
          );
        })}

        {/* 最后一条刻度线 */}
        <div
          style={{
            position: 'absolute',
            left: months.length * MONTH_WIDTH,
            top: 0,
            width: 1,
            height: '100%',
            backgroundColor: '#dfe6e9',
          }}
        />

        {/* 里程碑卡片 */}
        {milestones.map((milestone) => {
          const monthIdx = getMonthIndex(milestone.date);
          if (monthIdx < 0) return null;

          const monthCards = positionedMilestones.get(monthIdx) || [];
          const cardIdx = monthCards.findIndex((m) => m.id === milestone.id);
          if (cardIdx < 0) return null;

          return (
            <div
              key={milestone.id}
              ref={(el) => {
                if (el) cardRefs.current.set(milestone.id, el);
              }}
              style={getCardStyle(milestone, monthIdx, cardIdx)}
            >
              <MilestoneCard
                milestone={milestone}
                isDragging={milestone.id === draggingId}
                onDragStart={handleDragStart}
                onProgressChange={onProgressChange}
                onDelete={onDelete}
              />
            </div>
          );
        })}

        {/* 空状态提示 */}
        {milestones.length === 0 && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#bbb',
              fontSize: '14px',
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            拖拽任务到此处添加里程碑
          </div>
        )}
      </div>
    </div>
  );
};

export default Timeline;
