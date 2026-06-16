import type { ControlPoint, FlavorTag } from '../types';

interface ShareCardProps {
  beanOrigin?: string;
  processMethod?: string;
  roastLevel?: 'light' | 'medium' | 'dark';
  flavorTags?: FlavorTag[];
  notes?: string;
  controlPoints?: ControlPoint[];
  curveImage?: string;
  userName?: string;
  userAvatar?: string;
}

const roastLevelMap = {
  light: '浅烘',
  medium: '中烘',
  dark: '深烘',
};

const roastLevelColor: Record<string, React.CSSProperties> = {
  light: { backgroundColor: '#fffbeb', color: '#92400e' },
  medium: { backgroundColor: '#fff7ed', color: '#c2410c' },
  dark: { backgroundColor: '#fef2f2', color: '#b91c1c' },
};

const shareCardStyle: React.CSSProperties = {
  width: '600px',
  height: '800px',
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
};

export default function ShareCard({
  beanOrigin = '未填写产地',
  processMethod = '未填写处理法',
  roastLevel = 'medium',
  flavorTags = [],
  notes = '',
  controlPoints = [],
  curveImage,
  userName = '烘焙师',
  userAvatar,
}: ShareCardProps) {
  const selectedTags = flavorTags.filter((t) => t.selected);

  const renderCurveBackground = () => {
    if (curveImage) {
      return (
        <img
          src={curveImage}
          alt="烘焙曲线"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        />
      );
    }

    return (
      <div style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        position: 'absolute',
        top: 0,
        left: 0,
        overflow: 'hidden',
      }}>
        {controlPoints.length >= 2 && (
          <svg width="100%" height="100%" viewBox="0 0 200 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="curveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ff8f00" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#ff8f00" stopOpacity="0" />
              </linearGradient>
            </defs>
            {(() => {
              const sorted = [...controlPoints].sort((a, b) => a.time - b.time);
              const toX = (t: number) => 10 + (t / 15) * 180;
              const toY = (temp: number) => 90 - ((temp - 150) / 100) * 70;
              let pathD = `M ${toX(sorted[0].time)} 90 L ${toX(sorted[0].time)} ${toY(sorted[0].temperature)}`;
              for (let i = 1; i < sorted.length; i++) {
                pathD += ` L ${toX(sorted[i].time)} ${toY(sorted[i].temperature)}`;
              }
              pathD += ` L ${toX(sorted[sorted.length - 1].time)} 90 Z`;
              let lineD = `M ${toX(sorted[0].time)} ${toY(sorted[0].temperature)}`;
              for (let i = 1; i < sorted.length; i++) {
                lineD += ` L ${toX(sorted[i].time)} ${toY(sorted[i].temperature)}`;
              }
              return (
                <>
                  <path d={pathD} fill="url(#curveGrad)" />
                  <path d={lineD} stroke="#ff8f00" strokeWidth="2" fill="none" />
                </>
              );
            })()}
          </svg>
        )}
      </div>
    );
  };

  return (
    <div style={shareCardStyle}>
      <div style={{
        height: '400px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {renderCurveBackground()}

        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 40%, rgba(0,0,0,0.6) 100%)',
        }} />

        <div style={{
          position: 'absolute',
          top: '24px',
          left: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            fontWeight: 700,
            color: '#ffffff',
            boxShadow: '0 0 0 2px rgba(255, 255, 255, 0.3)',
            overflow: 'hidden',
          }}>
            {userAvatar ? (
              <img src={userAvatar} alt={userName} style={{ width: '100%', height: '100%', borderRadius: '9999px', objectFit: 'cover' }} />
            ) : (
              userName.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>{userName}</div>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)' }}>咖啡烘焙记录</div>
          </div>
        </div>

        <div style={{
          position: 'absolute',
          bottom: '24px',
          left: '24px',
          right: '24px',
        }}>
          <div style={{
            fontSize: '36px',
            fontWeight: 700,
            lineHeight: 1.2,
            color: '#ffffff',
            textShadow: '0 2px 8px rgba(0,0,0,0.6)',
            marginBottom: '12px',
          }}>{beanOrigin}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(8px)',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#ffffff',
            }}>{processMethod}</span>
            <span style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(8px)',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#ffffff',
            }}>
              {roastLevelMap[roastLevel]}
            </span>
          </div>
        </div>
      </div>

      <div style={{ padding: '28px 32px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {selectedTags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {selectedTags.map((tag) => (
              <span
                key={tag.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  fontSize: '13px',
                  fontWeight: 500,
                  backgroundColor: tag.selected ? '#ff8f00' : '#ffe0b2',
                  color: tag.selected ? '#ffffff' : '#e65100',
                }}
              >
                #{tag.name}
              </span>
            ))}
          </div>
        )}

        {notes && (
          <div style={{
            backgroundColor: 'rgba(255, 224, 178, 0.3)',
            borderRadius: '12px',
            padding: '16px',
            fontSize: '14px',
            color: '#3e2723',
            lineHeight: 1.7,
            border: '1px solid #ffe0b2',
            flex: 1,
          }}>
            <div style={{ fontSize: '12px', color: '#e65100', fontWeight: 600, marginBottom: '8px' }}>笔记</div>
            {notes.length > 200 ? `${notes.slice(0, 200)}...` : notes}
          </div>
        )}

        {!notes && <div style={{ flex: 1 }} />}

        <div style={{
          paddingTop: '16px',
          borderTop: '1px solid #ffe0b2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: '#8d6e63',
        }}>
          <span style={{ fontWeight: 600, color: '#795548' }}>Coffee Roast Tracker</span>
          <span>{new Date().toLocaleDateString('zh-CN')}</span>
        </div>
      </div>
    </div>
  );
}
