import { useEffect, useState } from 'react';
import BandCard from './BandCard';
import type { Band, StageName } from '../types';
import { STAGE_LABELS } from '../types';
import { sortBandsByTime } from '../logic/bandManager';

interface ScheduleBoardProps {
  bands: Band[];
  favoriteIds: string[];
  onToggleFavorite: (bandId: string) => void;
  onBandClick: (band: Band) => void;
}

const START_HOUR = 12;
const END_HOUR = 22;
const TOTAL_HOURS = END_HOUR - START_HOUR;

function timeToPercent(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  const totalMinutes = (hours - START_HOUR) * 60 + minutes;
  return (totalMinutes / (TOTAL_HOURS * 60)) * 100;
}

export default function ScheduleBoard({
  bands,
  favoriteIds,
  onToggleFavorite,
  onBandClick,
}: ScheduleBoardProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const stages: StageName[] = ['main', 'electronic'];

  const timeMarkers = Array.from(
    { length: TOTAL_HOURS + 1 },
    (_, i) => START_HOUR + i
  );

  const getBandsByStage = (stage: StageName): Band[] => {
    return sortBandsByTime(bands.filter((band) => band.stage === stage));
  };

  if (isMobile) {
    return (
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #E0E0E0',
          padding: '16px',
        }}
      >
        {stages.map((stage) => {
          const stageBands = getBandsByStage(stage);
          return (
            <div key={stage} style={{ marginBottom: stage === 'main' ? '24px' : '0' }}>
              <h3
                style={{
                  color: '#2C3E50',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  marginBottom: '12px',
                }}
              >
                {STAGE_LABELS[stage]}
              </h3>
              {stageBands.length === 0 ? (
                <div style={{ color: '#95A5A6', fontSize: '14px', padding: '20px 0' }}>
                  暂无演出安排
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {stageBands.map((band) => (
                    <BandCard
                      key={band.id}
                      band={band}
                      isFavorite={favoriteIds.includes(band.id)}
                      onToggleFavorite={onToggleFavorite}
                      onClick={onBandClick}
                      compact
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  const hasAnyBands = bands.length > 0;

  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #E0E0E0',
        padding: '16px',
        position: 'relative',
      }}
    >
      {!hasAnyBands && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#95A5A6',
            fontSize: '16px',
            animation: 'fadeIn 0.3s ease',
            zIndex: 5,
          }}
        >
          未找到匹配演出
        </div>
      )}

      <div
        style={{
          position: 'relative',
          marginLeft: '80px',
          opacity: hasAnyBands ? 1 : 0.3,
          transition: 'opacity 0.3s ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '12px',
            paddingBottom: '8px',
            borderBottom: '1px solid #E0E0E0',
          }}
        >
          {timeMarkers.map((hour) => (
            <span
              key={hour}
              style={{
                fontSize: '12px',
                color: '#7f8c8d',
                width: `${100 / TOTAL_HOURS}%`,
                textAlign: 'left',
              }}
            >
              {hour.toString().padStart(2, '0')}:00
            </span>
          ))}
        </div>

        <div style={{ position: 'relative' }}>
          {stages.map((stage, stageIndex) => {
            const stageBands = getBandsByStage(stage);
            return (
              <div
                key={stage}
                style={{
                  marginBottom: stageIndex < stages.length - 1 ? '24px' : '0',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: '-80px',
                    width: '70px',
                    textAlign: 'right',
                    color: '#2C3E50',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    paddingTop: '10px',
                  }}
                >
                  {STAGE_LABELS[stage]}
                </div>
                <div
                  style={{
                    position: 'relative',
                    height: '80px',
                    backgroundColor: '#fafafa',
                    borderRadius: '6px',
                    border: '1px solid #f0f0f0',
                  }}
                >
                  {stageBands.map((band) => {
                    const left = timeToPercent(band.startTime);
                    const width =
                      timeToPercent(band.endTime) - timeToPercent(band.startTime);
                    return (
                      <BandCard
                        key={band.id}
                        band={band}
                        isFavorite={favoriteIds.includes(band.id)}
                        onToggleFavorite={onToggleFavorite}
                        onClick={onBandClick}
                        style={{
                          left: `${left}%`,
                          width: `calc(${width}% - 4px)`,
                          height: 'calc(100% - 8px)',
                          top: '4px',
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
