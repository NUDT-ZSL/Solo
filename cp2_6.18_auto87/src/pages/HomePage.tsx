import { useEffect, useState, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface Star {
  id: string;
  name: string;
  constellation: string;
  magnitude: number;
  observationMethod: string;
  dates: string[];
}

interface StarRecord {
  id: string;
  date: string;
  location: { name: string; latitude: number; longitude: number };
  weather: string;
  photos: string[];
  stars: { id: string; name: string; constellation: string; magnitude: number; observationMethod: string }[];
}

const CONSTELLATION_COLORS: Record<string, string> = {
  '仙后座': '#e91e63',
  '猎户座': '#2196f3',
  '大熊座': '#4caf50',
  '天鹅座': '#ff9800',
  '大犬座': '#f44336',
  '小熊座': '#9c27b0',
  '天琴座': '#3f51b5',
  '狮子座': '#ff5722',
};

function getConstellationColor(c: string): string {
  return CONSTELLATION_COLORS[c] || '#7c4dff';
}

function getMagnitudeSize(mag: number): number {
  const minMag = -1.46;
  const maxMag = 6.0;
  const minSize = 4;
  const maxSize = 20;
  const clamped = Math.max(minMag, Math.min(maxMag, mag));
  const ratio = (maxMag - clamped) / (maxMag - minMag);
  return minSize + ratio * (maxSize - minSize);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, '0')}月${String(d.getDate()).padStart(2, '0')}日`;
}

export default function HomePage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<StarRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStar, setSelectedStar] = useState<Star | null>(null);
  const [selectedConstellation, setSelectedConstellation] = useState<string | null>(null);
  const [hoveredStarId, setHoveredStarId] = useState<string | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    fetch('/api/stars')
      .then((r) => r.json())
      .then((data: StarRecord[]) => {
        setRecords(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const allStars = useMemo(() => {
    const starMap = new Map<string, Star>();
    records.forEach((rec) => {
      rec.stars.forEach((s) => {
        const key = s.name;
        if (starMap.has(key)) {
          const existing = starMap.get(key)!;
          if (!existing.dates.includes(rec.date)) existing.dates.push(rec.date);
        } else {
          starMap.set(key, { ...s, dates: [rec.date] });
        }
      });
    });
    return Array.from(starMap.values()).sort((a, b) => a.magnitude - b.magnitude);
  }, [records]);

  const filteredStars = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = allStars;
    if (selectedConstellation) {
      result = result.filter((s) => s.constellation === selectedConstellation);
    }
    if (!q) return result;
    return result.filter((s) => s.name.toLowerCase().includes(q) || s.constellation.toLowerCase().includes(q));
  }, [allStars, search, selectedConstellation]);

  const constellationCounts = useMemo(() => {
    const counts = new Map<string, number>();
    allStars.forEach((s) => counts.set(s.constellation, (counts.get(s.constellation) || 0) + 1));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [allStars]);

  const maxCount = useMemo(() => Math.max(1, ...constellationCounts.map(([, c]) => c)), [constellationCounts]);

  const totalActivities = records.length;
  const totalStars = allStars.length;
  const latestDate = records.length > 0 ? records.reduce((a, b) => (a.date > b.date ? a : b)).date : '-';

  useEffect(() => {
    if (!search.trim() && !selectedConstellation) return;
    if (filteredStars.length === 0) return;
    const firstId = filteredStars[0].id;
    const timer = setTimeout(() => {
      const el = cardRefs.current.get(firstId);
      const container = document.getElementById('star-cards-container');
      if (el && container) {
        const rect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        if (rect.top < containerRect.top || rect.bottom > containerRect.bottom) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }
      } else if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [search, selectedConstellation, filteredStars]);

  const starPositions = useMemo(() => {
    const positions: Map<string, { x: number; y: number }> = new Map();
    const seed = 42;
    let state = seed;
    function rand() {
      state = (state * 9301 + 49297) % 233280;
      return state / 233280;
    }
    allStars.forEach((s) => {
      const size = getMagnitudeSize(s.magnitude);
      const x = 40 + rand() * (850 - 80);
      const y = 40 + rand() * (500 - 80);
      positions.set(s.id, { x, y });
    });
    return positions;
  }, [allStars]);

  if (loading) {
    return <div style={{ padding: '40px', color: '#90caf9' }}>加载中...</div>;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <div style={{
        width: '260px', padding: '24px 16px', background: '#1b2838',
        borderRight: '1px solid #2a3f54', display: 'flex', flexDirection: 'column', gap: '20px'
      }}>
        <h2 style={{ color: '#90caf9', fontSize: '18px', fontWeight: 600 }}>观星档案</h2>
        <button onClick={() => navigate('/new')} style={{
          background: '#1565c0', color: 'white', border: 'none', borderRadius: '8px',
          padding: '10px 16px', fontSize: '14px', transition: '0.2s'
        }} onMouseEnter={(e) => (e.currentTarget.style.background = '#1976d2')}
           onMouseLeave={(e) => (e.currentTarget.style.background = '#1565c0')}>
          + 新建观测记录
        </button>

        <div>
          <div style={{ fontSize: '13px', color: '#90caf9', marginBottom: '12px', fontWeight: 600 }}>星座分布</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end', padding: '8px 4px' }}>
            {constellationCounts.map(([name, count]) => {
              const height = Math.max(8, (count / maxCount) * 200);
              const isActive = selectedConstellation === name;
              return (
                <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <div onClick={() => setSelectedConstellation(isActive ? null : name)} style={{
                    width: '20px', height: `${height}px`, borderRadius: '4px 4px 2px 2px',
                    background: `linear-gradient(to top, #7c4dff, #b388ff)`,
                    cursor: 'pointer', opacity: selectedConstellation && !isActive ? 0.4 : 1,
                    transform: isActive ? 'translateY(-4px)' : 'none',
                    transition: 'all 0.3s ease', boxShadow: isActive ? '0 0 12px rgba(124,77,255,0.6)' : 'none'
                  }} title={`${name}: ${count}颗`} />
                  <div style={{ fontSize: '10px', color: '#e0e0e0', textAlign: 'center', lineHeight: 1.2, maxWidth: '40px' }}>
                    {name.slice(0, 2)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{
          background: 'rgba(21, 101, 192, 0.15)', borderRadius: '12px', padding: '16px',
          border: '0.5px solid rgba(144, 202, 249, 0.2)'
        }}>
          <div style={{ fontSize: '13px', color: '#90caf9', marginBottom: '12px', fontWeight: 600 }}>总览</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#9e9e9e' }}>活动次数</span>
              <span style={{ color: '#e0e0e0', fontWeight: 600 }}>{totalActivities}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#9e9e9e' }}>观测星星</span>
              <span style={{ color: '#e0e0e0', fontWeight: 600 }}>{totalStars}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#9e9e9e' }}>最近观测</span>
              <span style={{ color: '#e0e0e0', fontWeight: 600 }}>{latestDate !== '-' ? formatDate(latestDate) : '-'}</span>
            </div>
          </div>
        </div>

        {records.length > 0 && (
          <div>
            <div style={{ fontSize: '13px', color: '#90caf9', marginBottom: '10px', fontWeight: 600 }}>历史活动</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {records.slice(0, 5).map((r) => (
                <Link key={r.id} to={`/detail/${r.id}`} style={{
                  textDecoration: 'none', padding: '10px 12px', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.03)', fontSize: '12px', color: '#e0e0e0',
                  display: 'flex', flexDirection: 'column', gap: '4px'
                }}>
                  <span style={{ fontWeight: 600 }}>{formatDate(r.date)}</span>
                  <span style={{ color: '#9e9e9e', fontSize: '11px' }}>{r.location.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ flex: 1, padding: '24px 32px', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ color: '#90caf9', fontSize: '22px', fontWeight: 700 }}>
            🌌 星图总览
          </h1>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索星星名称或星座..." style={{
              width: '280px', padding: '10px 16px', borderRadius: '8px',
              background: '#1b2838', border: '0.5px solid #2a3f54', color: '#e0e0e0',
              fontSize: '14px', outline: 'none'
            }} onFocus={(e) => (e.currentTarget.style.borderColor = '#1565c0')}
               onBlur={(e) => (e.currentTarget.style.borderColor = '#2a3f54')} />
        </div>

        <div style={{
          position: 'relative', width: '100%', height: '520px', borderRadius: '16px',
          background: `radial-gradient(ellipse at center, #0f2a47 0%, #0d1b2a 100%)`,
          border: '1px solid #1b2838', overflow: 'hidden', marginBottom: '24px'
        }}>
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `radial-gradient(circle at 20% 30%, rgba(255,255,255,0.015) 0%, transparent 50%),
                         radial-gradient(circle at 80% 70%, rgba(124,77,255,0.03) 0%, transparent 50%)`
          }} />
          {allStars.map((s) => {
            const pos = starPositions.get(s.id)!;
            const size = getMagnitudeSize(s.magnitude);
            const glowSize = size + 8;
            const isFiltered = filteredStars.some((f) => f.id === s.id);
            const isHovered = hoveredStarId === s.id;
            return (
              <div key={s.id} onClick={() => setSelectedStar(s)}
                onMouseEnter={() => setHoveredStarId(s.id)}
                onMouseLeave={() => setHoveredStarId(null)}
                ref={(el) => { if (el) cardRefs.current.set(s.id, el); }}
                style={{
                  position: 'absolute', left: `${pos.x}px`, top: `${pos.y}px`,
                  width: `${size}px`, height: `${size}px`, borderRadius: '50%',
                  background: '#ffd54f', cursor: 'pointer',
                  boxShadow: `0 0 ${glowSize}px ${glowSize / 2}px rgba(255,213,79,0.35), 0 0 ${size * 2}px ${size}px rgba(255,213,79,0.15)`,
                  transition: 'all 0.3s ease',
                  opacity: isFiltered ? 1 : 0.25,
                  transform: isHovered ? 'scale(1.3)' : 'scale(1)',
                  zIndex: isHovered ? 10 : 1,
                }}
                title={`${s.name} (${s.constellation}) - ${s.magnitude.toFixed(2)}等`}
              />
            );
          })}
          {allStars.length === 0 && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#90caf9', fontSize: '16px'
            }}>
              暂无观测数据，点击左上角「新建观测记录」开始记录吧！
            </div>
          )}
        </div>

        {selectedConstellation && (
          <div style={{
            background: '#1b2838', borderRadius: '16px', padding: '20px',
            border: `1px solid ${getConstellationColor(selectedConstellation)}44`,
            marginBottom: '24px', transition: 'all 0.3s ease',
            boxShadow: `0 4px 20px ${getConstellationColor(selectedConstellation)}15`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: `linear-gradient(135deg, ${getConstellationColor(selectedConstellation)}40, ${getConstellationColor(selectedConstellation)}10)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '20px'
                }}>
                  ✦
                </div>
                <div>
                  <h2 style={{ color: getConstellationColor(selectedConstellation), fontSize: '18px', fontWeight: 700 }}>
                    {selectedConstellation}
                  </h2>
                  <div style={{ fontSize: '12px', color: '#90caf9' }}>
                    共观测 {allStars.filter(s => s.constellation === selectedConstellation).length} 颗星星
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedConstellation(null)} style={{
                background: 'rgba(124,77,255,0.15)', border: '1px solid rgba(124,77,255,0.3)',
                color: '#b388ff', borderRadius: '8px', padding: '8px 16px',
                fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s ease'
              }} onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239,83,80,0.2)';
                e.currentTarget.style.color = '#ef5350';
                e.currentTarget.style.borderColor = 'rgba(239,83,80,0.3)';
              }} onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(124,77,255,0.15)';
                e.currentTarget.style.color = '#b388ff';
                e.currentTarget.style.borderColor = 'rgba(124,77,255,0.3)';
              }}>
                查看全部 ✕
              </button>
            </div>
            <div style={{
              display: 'flex', gap: '12px', overflowX: 'auto', padding: '8px 4px',
              scrollbarWidth: 'thin'
            }}>
              {allStars.filter(s => s.constellation === selectedConstellation).map((s) => {
                const dates = [...s.dates].sort();
                return (
                  <div key={s.id} onClick={() => setSelectedStar(s)} ref={(el) => { if (el) cardRefs.current.set(s.id, el); }}
                    style={{
                      flexShrink: 0, width: '200px', borderRadius: '12px',
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                      border: `1px solid ${getConstellationColor(s.constellation)}33`,
                      padding: '14px', cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }} onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.boxShadow = `0 8px 24px ${getConstellationColor(s.constellation)}30`;
                      e.currentTarget.style.borderColor = getConstellationColor(s.constellation);
                    }} onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.borderColor = `${getConstellationColor(s.constellation)}33`;
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <div style={{
                        width: `${getMagnitudeSize(s.magnitude)}px`, height: `${getMagnitudeSize(s.magnitude)}px`,
                        borderRadius: '50%', background: '#ffd54f', flexShrink: 0,
                        boxShadow: `0 0 ${getMagnitudeSize(s.magnitude) + 8}px rgba(255,213,79,0.6)`
                      }} />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#e0e0e0' }}>{s.name}</div>
                        <div style={{ fontSize: '11px', color: getConstellationColor(s.constellation) }}>{s.constellation}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#78909c', lineHeight: 1.6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>星等</span>
                        <span style={{ color: '#ffd54f', fontFamily: 'monospace' }}>{s.magnitude.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                        <span>观测次数</span>
                        <span style={{ color: '#90caf9' }}>{s.dates.length}次</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <div style={{ fontSize: '14px', color: '#90caf9', marginBottom: '12px', fontWeight: 600 }}>
            星星列表 {filteredStars.length !== allStars.length && `(匹配 ${filteredStars.length}/${allStars.length})`}
            {selectedConstellation && ` · ${selectedConstellation}`}
          </div>
          <div id="star-cards-container" style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px',
            transition: 'all 0.3s ease', scrollBehavior: 'smooth'
          }}>
            {filteredStars.map((s) => {
              const dates = [...s.dates].sort();
              return (
                <div key={s.id} onClick={() => setSelectedStar(s)} ref={(el) => { if (el) cardRefs.current.set(s.id, el); }}
                  style={{
                    width: '240px', height: '160px', borderRadius: '12px', background: 'white',
                    border: '0.5px solid #e0e0e0', padding: '16px', position: 'relative',
                    cursor: 'pointer', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    scrollMarginTop: '20px'
                  }} onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
                  }} onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                  }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                    <div style={{
                      width: `${Math.min(20, getMagnitudeSize(s.magnitude) + 4)}px`,
                      height: `${Math.min(20, getMagnitudeSize(s.magnitude) + 4)}px`,
                      borderRadius: '50%', background: '#ffd54f', flexShrink: 0,
                      boxShadow: `0 0 ${getMagnitudeSize(s.magnitude) + 8}px rgba(255,213,79,0.5)`
                    }} />
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: '#2a3f54', marginBottom: '4px' }}>
                        {s.name}
                      </div>
                      <div style={{ fontSize: '12px', color: getConstellationColor(s.constellation), fontWeight: 600 }}>
                        {s.constellation}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', color: '#546e7a', marginBottom: '6px' }}>
                    视星等: <span style={{ color: '#2a3f54', fontWeight: 600 }}>{s.magnitude.toFixed(2)}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#78909c', lineHeight: 1.6, marginTop: 'auto' }}>
                    <div>最早: {formatDate(dates[0])}</div>
                    <div>最近: {formatDate(dates[dates.length - 1])}</div>
                  </div>
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px',
                    background: getConstellationColor(s.constellation)
                  }} />
                </div>
              );
            })}
            {filteredStars.length === 0 && search && (
              <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: '#90caf9' }}>
                没有找到匹配「{search}」的星星
              </div>
            )}
          </div>
        </div>

        {selectedStar && (() => {
          const dates = [...selectedStar.dates].sort();
          return (
            <div onClick={() => setSelectedStar(null)} style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
            }}>
              <div onClick={(e) => e.stopPropagation()} style={{
                width: '240px', height: '160px', borderRadius: '12px', background: 'white',
                border: '0.5px solid #bdbdbd', padding: '16px', position: 'relative', overflow: 'hidden'
              }}>
                <button onClick={() => setSelectedStar(null)} style={{
                  position: 'absolute', top: '8px', right: '12px', background: 'transparent',
                  border: 'none', fontSize: '20px', color: '#9e9e9e', cursor: 'pointer', zIndex: 10
                }}>×</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '50%', background: '#ffd54f',
                    boxShadow: '0 0 20px rgba(255,213,79,0.6)'
                  }} />
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#2a3f54' }}>{selectedStar.name}</div>
                    <div style={{ fontSize: '12px', color: getConstellationColor(selectedStar.constellation), fontWeight: 600 }}>
                      {selectedStar.constellation}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '13px', color: '#546e7a', margin: '10px 0', lineHeight: 1.8 }}>
                  <div>最早观测: <span style={{ color: '#2a3f54' }}>{formatDate(dates[0])}</span></div>
                  <div>最近观测: <span style={{ color: '#2a3f54' }}>{formatDate(dates[dates.length - 1])}</span></div>
                </div>
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px',
                  background: getConstellationColor(selectedStar.constellation)
                }} />
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
