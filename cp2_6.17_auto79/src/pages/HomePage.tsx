import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface StarPhoto {
  name: string;
  constellation: string;
  magnitude: number;
  observationMethod: string;
  photos: string[];
}

interface Activity {
  id: string;
  date: string;
  location: { lat: number; lng: number; name: string };
  weather: string;
  stars: StarPhoto[];
  photos: string[];
}

interface UniqueStar {
  name: string;
  constellation: string;
  magnitude: number;
  earliestDate: string;
  latestDate: string;
  earliestActivityId: string;
}

const CONSTELLATION_COLORS: Record<string, string> = {
  '仙后座': '#e91e63',
  '猎户座': '#2196f3',
  '大熊座': '#4caf50',
  '天鹅座': '#ff9800',
};

function getConstellationColor(constellation: string): string {
  return CONSTELLATION_COLORS[constellation] || '#90caf9';
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function magnitudeToDiameter(magnitude: number): number {
  return Math.round(4 + (6.0 - magnitude) / (6.0 - (-1.46)) * 16);
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  height: '100vh',
  width: '100vw',
  background: '#0d1b2a',
  color: '#e0e0e0',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  overflow: 'hidden',
};

const sidebarStyle: React.CSSProperties = {
  width: '240px',
  minWidth: '240px',
  background: '#1b2838',
  padding: '16px',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const mainAreaStyle: React.CSSProperties = {
  flex: 1,
  position: 'relative',
  overflow: 'hidden',
};

const searchInputStyle: React.CSSProperties = {
  position: 'absolute',
  top: '16px',
  right: '24px',
  zIndex: 10,
  padding: '8px 14px',
  borderRadius: '8px',
  border: '1px solid rgba(255,213,79,0.3)',
  background: 'rgba(13,27,42,0.85)',
  color: '#e0e0e0',
  fontSize: '14px',
  outline: 'none',
  width: '240px',
};

const starMapContainerStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
};

const newRecordLinkStyle: React.CSSProperties = {
  display: 'block',
  textAlign: 'center',
  padding: '10px 0',
  borderRadius: '8px',
  background: 'linear-gradient(135deg, #7c4dff, #b388ff)',
  color: '#fff',
  textDecoration: 'none',
  fontWeight: 600,
  fontSize: '14px',
  cursor: 'pointer',
};

const sidebarTitleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 700,
  color: '#ffd54f',
  margin: 0,
};

const chartContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  gap: '12px',
  flexWrap: 'wrap',
  justifyContent: 'flex-start',
  paddingTop: '8px',
};

const summaryCardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  borderRadius: '8px',
  padding: '12px',
  fontSize: '13px',
  lineHeight: 1.8,
};

const constellationListStyle: React.CSSProperties = {
  maxHeight: '200px',
  overflowY: 'auto',
  fontSize: '13px',
};

export default function HomePage() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [uniqueStars, setUniqueStars] = useState<UniqueStar[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStar, setSelectedStar] = useState<UniqueStar | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedConstellation, setSelectedConstellation] = useState<string | null>(null);
  const starMapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/stars')
      .then((res) => res.json())
      .then((data: Activity[]) => {
        setActivities(data);
      })
      .catch(() => {
        setActivities([]);
      });
  }, []);

  useEffect(() => {
    const starMap = new Map<string, UniqueStar>();

    for (const activity of activities) {
      for (const star of activity.stars) {
        const existing = starMap.get(star.name);
        if (!existing) {
          starMap.set(star.name, {
            name: star.name,
            constellation: star.constellation,
            magnitude: star.magnitude,
            earliestDate: activity.date,
            latestDate: activity.date,
            earliestActivityId: activity.id,
          });
        } else {
          if (activity.date < existing.earliestDate) {
            existing.earliestDate = activity.date;
            existing.earliestActivityId = activity.id;
          }
          if (activity.date > existing.latestDate) {
            existing.latestDate = activity.date;
          }
        }
      }
    }

    setUniqueStars(Array.from(starMap.values()));
  }, [activities]);

  const constellationCounts = useCallback(() => {
    const counts: Record<string, number> = {};
    for (const star of uniqueStars) {
      counts[star.constellation] = (counts[star.constellation] || 0) + 1;
    }
    return counts;
  }, [uniqueStars]);

  const filteredStars = uniqueStars.filter((star) => {
    const matchesSearch = searchQuery === '' ||
      star.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      star.constellation.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesConstellation = selectedConstellation === null || star.constellation === selectedConstellation;
    return matchesSearch && matchesConstellation;
  });

  const handleStarClick = useCallback((star: UniqueStar, event: React.MouseEvent) => {
    event.stopPropagation();
    const rect = starMapRef.current?.getBoundingClientRect();
    if (rect) {
      setPopupPosition({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    }
    setSelectedStar(star);
  }, []);

  const handleMapClick = useCallback(() => {
    setSelectedStar(null);
    setPopupPosition(null);
  }, []);

  const handleCardClick = useCallback((star: UniqueStar) => {
    navigate(`/detail/${star.earliestActivityId}`);
  }, [navigate]);

  const counts = constellationCounts();
  const constellationNames = Object.keys(counts);
  const maxCount = Math.max(...Object.values(counts), 1);

  const totalActivities = activities.length;
  const totalUniqueStars = uniqueStars.length;
  const latestObservation = uniqueStars.length > 0
    ? uniqueStars.reduce((latest, s) => (s.latestDate > latest ? s.latestDate : latest), uniqueStars[0].latestDate)
    : '-';

  const mapWidth = starMapRef.current?.clientWidth || 800;
  const mapHeight = starMapRef.current?.clientHeight || 600;

  const visibleStars = filteredStars;

  return (
    <div style={containerStyle}>
      <div style={sidebarStyle}>
        <h2 style={sidebarTitleStyle}>星座分布</h2>

        <div style={chartContainerStyle}>
          {constellationNames.map((name) => {
            const count = counts[name];
            const barHeight = Math.round((count / maxCount) * 200);
            const isSelected = selectedConstellation === name;
            return (
              <div
                key={name}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: 'pointer',
                  opacity: isSelected ? 1 : 0.75,
                  transition: 'opacity 0.2s',
                }}
                onClick={() => {
                  setSelectedConstellation(selectedConstellation === name ? null : name);
                  setSelectedStar(null);
                }}
              >
                <div
                  style={{
                    width: '20px',
                    height: `${barHeight}px`,
                    background: 'linear-gradient(to top, #7c4dff, #b388ff)',
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.3s ease',
                  }}
                />
                <span
                  style={{
                    fontSize: '10px',
                    marginTop: '4px',
                    color: isSelected ? '#ffd54f' : '#b0bec5',
                    writingMode: 'vertical-rl',
                    textOrientation: 'mixed',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {name}
                </span>
              </div>
            );
          })}
        </div>

        {selectedConstellation && (
          <div style={constellationListStyle}>
            <div style={{ marginBottom: '6px', color: '#ffd54f', fontWeight: 600 }}>
              {selectedConstellation} 的星星:
            </div>
            {uniqueStars
              .filter((s) => s.constellation === selectedConstellation)
              .map((s) => (
                <div
                  key={s.name}
                  style={{ padding: '4px 0', color: '#e0e0e0', cursor: 'pointer' }}
                  onClick={() => navigate(`/detail/${s.earliestActivityId}`)}
                >
                  {s.name} (星等 {s.magnitude})
                </div>
              ))}
          </div>
        )}

        <div style={summaryCardStyle}>
          <div>观测活动: <strong>{totalActivities}</strong> 次</div>
          <div>独立星星: <strong>{totalUniqueStars}</strong> 颗</div>
          <div>最近观测: <strong>{latestObservation}</strong></div>
        </div>

        <a href="/new" style={newRecordLinkStyle} onClick={(e) => { e.preventDefault(); navigate('/new'); }}>
          新建记录
        </a>
      </div>

      <div style={mainAreaStyle}>
        <input
          type="text"
          placeholder="搜索星星名称或星座..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={searchInputStyle}
        />

        <div
          ref={starMapRef}
          style={starMapContainerStyle}
          onClick={handleMapClick}
        >
          {visibleStars.map((star) => {
            const hash = hashCode(star.name);
            const col = hash % 20;
            const row = Math.floor(hash / 20) % 15;
            const offsetX = seededRandom(hash + 1) * 30 - 15;
            const offsetY = seededRandom(hash + 2) * 30 - 15;

            const cellW = mapWidth / 20;
            const cellH = mapHeight / 15;
            const x = col * cellW + cellW / 2 + offsetX;
            const y = row * cellH + cellH / 2 + offsetY;

            const diameter = magnitudeToDiameter(star.magnitude);
            const color = '#ffd54f';

            const isSearched =
              searchQuery !== '' &&
              (star.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                star.constellation.toLowerCase().includes(searchQuery.toLowerCase()));

            return (
              <div
                key={star.name}
                onClick={(e) => handleStarClick(star, e)}
                style={{
                  position: 'absolute',
                  left: `${x}px`,
                  top: `${y}px`,
                  transform: 'translate(-50%, -50%)',
                  cursor: 'pointer',
                  transition: 'transform 0.3s ease, opacity 0.3s ease',
                  opacity: isSearched ? 1 : searchQuery !== '' ? 0.3 : 1,
                  zIndex: isSearched ? 5 : 1,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: `${diameter + 16}px`,
                    height: `${diameter + 16}px`,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(255,213,79,0.2) 0%, transparent 70%)',
                  }}
                />
                <div
                  style={{
                    width: `${diameter}px`,
                    height: `${diameter}px`,
                    borderRadius: '50%',
                    background: color,
                    boxShadow: `0 0 ${diameter}px ${diameter / 2}px rgba(255,213,79,0.6), 0 0 ${diameter * 2}px ${diameter}px rgba(255,213,79,0.3)`,
                  }}
                />
              </div>
            );
          })}

          {selectedStar && popupPosition && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                handleCardClick(selectedStar);
              }}
              style={{
                position: 'absolute',
                left: `${Math.min(popupPosition.x + 12, mapWidth - 260)}px`,
                top: `${Math.min(popupPosition.y - 80, mapHeight - 180)}px`,
                width: '240px',
                height: '160px',
                borderRadius: '12px',
                background: '#ffffff',
                border: '0.5px solid #bdbdbd',
                color: '#212121',
                padding: '16px',
                boxSizing: 'border-box',
                zIndex: 20,
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                transition: 'opacity 0.2s ease',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '8px' }}>
                {selectedStar.name}
              </div>
              <div style={{ fontSize: '13px', color: '#616161', marginBottom: '4px' }}>
                星座: {selectedStar.constellation}
              </div>
              <div style={{ fontSize: '13px', color: '#616161', marginBottom: '4px' }}>
                最早观测: {selectedStar.earliestDate}
              </div>
              <div style={{ fontSize: '13px', color: '#616161', marginBottom: '8px' }}>
                最近观测: {selectedStar.latestDate}
              </div>
              <div
                style={{
                  marginTop: 'auto',
                  height: '6px',
                  borderRadius: '3px',
                  background: getConstellationColor(selectedStar.constellation),
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
