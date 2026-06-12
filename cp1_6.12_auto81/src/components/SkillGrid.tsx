import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import gsap from 'gsap';
import type { Member, MatchResult } from '../utils/skillMatch';
import { getSkillColor } from '../utils/skillMatch';

interface SkillGridProps {
  members: Member[];
  matchResults: MatchResult[];
  onCardClick: (member: Member) => void;
  previousOrder: string[];
}

const CARD_HEIGHT = 220;
const CARD_GAP = 16;

const getBadgeColor = (percent: number): string => {
  if (percent >= 70) return '#51cf66';
  if (percent >= 40) return '#ff922b';
  return '#ff4757';
};

const SkillGrid: React.FC<SkillGridProps> = ({
  members,
  matchResults,
  onCardClick,
  previousOrder,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const [dimensions, setDimensions] = React.useState({ width: 1200, height: 800 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const columnCount = useMemo(() => {
    if (dimensions.width >= 1200) return 3;
    if (dimensions.width >= 768) return 2;
    return 1;
  }, [dimensions.width]);

  const columnWidth = useMemo(() => {
    return dimensions.width / columnCount;
  }, [dimensions.width, columnCount]);

  const rowCount = useMemo(() => {
    return Math.ceil(members.length / columnCount);
  }, [members.length, columnCount]);

  const matchMap = useMemo(() => {
    const map = new Map<string, number>();
    matchResults.forEach((r) => map.set(r.memberId, r.matchPercent));
    return map;
  }, [matchResults]);

  useEffect(() => {
    if (previousOrder.length === 0 || !containerRef.current) return;

    const currentOrder = members.map((m) => m.id);
    if (JSON.stringify(currentOrder) === JSON.stringify(previousOrder)) return;

    const container = containerRef.current;
    const currentCards = container.querySelectorAll('[data-member-id]');

    currentCards.forEach((card) => {
      const memberId = card.getAttribute('data-member-id');
      if (!memberId) return;

      const prevIndex = previousOrder.indexOf(memberId);
      if (prevIndex === -1) return;

      const currIndex = currentOrder.indexOf(memberId);
      if (currIndex === prevIndex) return;

      const prevRow = Math.floor(prevIndex / columnCount);
      const prevCol = prevIndex % columnCount;
      const currRow = Math.floor(currIndex / columnCount);
      const currCol = currIndex % columnCount;

      const dx = (prevCol - currCol) * columnWidth;
      const dy = (prevRow - currRow) * CARD_HEIGHT;

      gsap.fromTo(
        card,
        { x: dx, y: dy },
        { x: 0, y: 0, duration: 0.4, ease: 'power2.out' }
      );
    });
  }, [members, previousOrder, columnCount, columnWidth]);

  const Cell = useCallback(
    ({ columnIndex, rowIndex, style }: { columnIndex: number; rowIndex: number; style: React.CSSProperties }) => {
      const idx = rowIndex * columnCount + columnIndex;
      if (idx >= members.length) return <div style={style} />;

      const member = members[idx];
      const matchPercent = matchMap.get(member.id);

      return (
        <div style={style}>
          <div
            data-member-id={member.id}
            ref={(el) => {
              if (el) cardsRef.current.set(member.id, el);
            }}
            onClick={() => onCardClick(member)}
            style={{
              background: '#16213e',
              borderRadius: 12,
              padding: 20,
              margin: CARD_GAP / 2,
              cursor: 'pointer',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              boxShadow: '0 4px 20px rgba(138, 43, 226, 0.3)',
              position: 'relative',
              height: CARD_HEIGHT - CARD_GAP,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-5px)';
              (e.currentTarget as HTMLDivElement).style.boxShadow =
                '0 8px 30px rgba(138, 43, 226, 0.5)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLDivElement).style.boxShadow =
                '0 4px 20px rgba(138, 43, 226, 0.3)';
            }}
          >
            {matchPercent !== undefined && (
              <div
                style={{
                  position: 'absolute',
                  top: 10,
                  left: 10,
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: getBadgeColor(matchPercent),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 9,
                  fontWeight: 700,
                  color: '#fff',
                  transition: 'background 0.3s ease',
                  zIndex: 2,
                }}
              >
                {matchPercent}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <img
                src={member.avatar}
                alt={member.name}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  border: '2px solid #ccc',
                  objectFit: 'cover',
                  flexShrink: 0,
                }}
              />
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 15,
                    color: '#e0e0e0',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {member.name}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: '#a0a0c0',
                    background: 'rgba(138, 43, 226, 0.2)',
                    padding: '2px 8px',
                    borderRadius: 10,
                    display: 'inline-block',
                    marginTop: 2,
                  }}
                >
                  {member.role}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {member.skills.slice(0, 5).map((skill, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    background: 'rgba(255,255,255,0.06)',
                    padding: '3px 8px',
                    borderRadius: 12,
                    fontSize: 11,
                    color: '#e0e0e0',
                  }}
                >
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: getSkillColor(skill.category),
                      display: 'inline-block',
                      flexShrink: 0,
                    }}
                  />
                  {skill.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    },
    [members, columnCount, matchMap, onCardClick]
  );

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <Grid
        columnCount={columnCount}
        columnWidth={columnWidth}
        height={dimensions.height}
        rowCount={rowCount}
        rowHeight={CARD_HEIGHT}
        width={dimensions.width}
        overscanRowCount={4}
      >
        {Cell}
      </Grid>
    </div>
  );
};

export default SkillGrid;
