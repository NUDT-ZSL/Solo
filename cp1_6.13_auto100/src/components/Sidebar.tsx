import { useState, useCallback } from 'react';
import type { TravelLocation, TravelTheme, UserProfile } from '../types';

const THEME_COLORS: Record<TravelTheme, string> = {
  city: '#3b82f6',
  nature: '#22c55e',
  adventure: '#f59e0b',
};

const THEME_LABELS: Record<TravelTheme, string> = {
  city: '城市',
  nature: '自然',
  adventure: '探险',
};

interface SidebarProps {
  user: UserProfile | null;
  locations: TravelLocation[];
  selectedId: string | null;
  onLocationSelect: (id: string) => void;
  loading: boolean;
}

function StarRating({ rating, size = 12 }: { rating: number; size?: number }) {
  return (
    <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={i <= rating ? '#fbbf24' : 'none'}
          stroke={i <= rating ? '#fbbf24' : '#475569'}
          strokeWidth="2"
          strokeLinejoin="round"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

function JourneyCard({
  location,
  isSelected,
  onClick,
}: {
  location: TravelLocation;
  isSelected: boolean;
  onClick: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const themeColor = THEME_COLORS[location.theme];
  const elevated = isHovered || isSelected;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        width: '280px',
        height: '140px',
        borderRadius: '10px',
        background: '#1e293b',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        transform: elevated ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: elevated
          ? `0 16px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px ${themeColor}60 inset`
          : '0 4px 12px rgba(0, 0, 0, 0.3)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        outline: 'none',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: '4px',
          background: themeColor,
          borderRadius: '0 10px 10px 0',
          zIndex: 3,
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '140px',
          height: '100%',
          overflow: 'hidden',
          borderRadius: '10px 0 0 10px',
          zIndex: 1,
        }}
      >
        <img
          src={location.coverImage}
          alt={location.name}
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.4s ease',
            transform: isHovered ? 'scale(1.08)' : 'scale(1)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to right, rgba(30,41,59,0) 0%, rgba(30,41,59,0.3) 60%, #1e293b 100%)',
            zIndex: 1,
          }}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          padding: '16px 20px 16px 152px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          zIndex: 2,
        }}
      >
        <div>
          <div style={{ marginBottom: '6px' }}>
            <span
              style={{
                display: 'inline-block',
                fontSize: '10px',
                fontWeight: 600,
                color: themeColor,
                background: `${themeColor}22`,
                padding: '3px 9px',
                borderRadius: '999px',
                letterSpacing: '0.4px',
                border: `1px solid ${themeColor}40`,
                lineHeight: 1,
              }}
            >
              {THEME_LABELS[location.theme]}
            </span>
          </div>
          <h3
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 700,
              color: '#f8fafc',
              lineHeight: 1.25,
            }}
          >
            {location.name}
          </h3>
          <p
            style={{
              margin: '3px 0 0 0',
              fontSize: '12px',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {location.country}
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <StarRating rating={location.rating} />
          <span
            style={{
              fontSize: '10px',
              color: '#64748b',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              background: 'rgba(100, 116, 139, 0.1)',
              padding: '2px 6px',
              borderRadius: '4px',
            }}
          >
            {location.visitDate}
          </span>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ user, locations, selectedId, onLocationSelect, loading }: SidebarProps) {
  const [filter, setFilter] = useState<'all' | TravelTheme>('all');

  const filteredLocations = locations.filter(
    (loc) => filter === 'all' || loc.theme === filter
  );

  const filters: Array<{ key: 'all' | TravelTheme; label: string; color?: string }> = [
    { key: 'all', label: '全部' },
    { key: 'city', label: '城市', color: THEME_COLORS.city },
    { key: 'nature', label: '自然', color: THEME_COLORS.nature },
    { key: 'adventure', label: '探险', color: THEME_COLORS.adventure },
  ];

  const handleFilterClick = useCallback((key: 'all' | TravelTheme) => {
    setFilter(key);
  }, []);

  return (
    <>
      <aside className="wc-sidebar">
        <div className="wc-sidebar-inner">
          {user && (
            <div className="wc-user">
              <div className="wc-user-avatar-ring">
                <img src={user.avatar} alt={user.nickname} className="wc-user-avatar" />
              </div>
              <div className="wc-user-meta">
                <div className="wc-user-top">
                  <h2 className="wc-user-name">{user.nickname}</h2>
                  <span className="wc-user-badge">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="#22c55e">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                </div>
                <div className="wc-user-stats">
                  <div className="wc-stat">
                    <span className="wc-stat-num">{user.travelCount}</span>
                    <span className="wc-stat-label">段旅程</span>
                  </div>
                  <span className="wc-stat-sep" />
                  <div className="wc-stat">
                    <span className="wc-stat-num">{user.countryCount}</span>
                    <span className="wc-stat-label">个国家</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="wc-divider" />

          <div className="wc-section-head">
            <div className="wc-section-title-wrap">
              <span className="wc-section-dot" />
              <h3 className="wc-section-title">我的旅程</h3>
            </div>
            <span className="wc-section-count">
              {loading ? '···' : filteredLocations.length}
            </span>
          </div>

          <div className="wc-filter">
            {filters.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => handleFilterClick(f.key)}
                  className="wc-filter-btn"
                  style={{
                    background: active ? (f.color ? `${f.color}22` : '#334155') : 'transparent',
                    color: active ? (f.color || '#f8fafc') : '#64748b',
                    borderColor: active
                      ? f.color
                        ? `${f.color}55`
                        : '#475569'
                      : 'transparent',
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  {f.color && (
                    <span
                      className="wc-filter-dot"
                      style={{ background: f.color }}
                    />
                  )}
                  {f.label}
                </button>
              );
            })}
          </div>

          <div className="wc-cards">
            {loading ? (
              <div className="wc-empty">
                <div className="wc-spinner" />
                <span>正在加载旅程...</span>
              </div>
            ) : filteredLocations.length === 0 ? (
              <div className="wc-empty">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>暂无旅程记录</span>
                <p>点击地图上的标记来探索你的足迹</p>
              </div>
            ) : (
              filteredLocations.map((loc) => (
                <JourneyCard
                  key={loc.id}
                  location={loc}
                  isSelected={selectedId === loc.id}
                  onClick={() => onLocationSelect(loc.id)}
                />
              ))
            )}
          </div>
        </div>
      </aside>

      <style>{`
        .wc-sidebar {
          position: fixed;
          top: 20px;
          left: 20px;
          bottom: 20px;
          width: 320px;
          background: rgba(15, 23, 42, 0.78);
          backdrop-filter: blur(24px) saturate(160%);
          -webkit-backdrop-filter: blur(24px) saturate(160%);
          border-radius: 12px;
          border: 1px solid rgba(71, 85, 105, 0.35);
          z-index: 100;
          box-shadow:
            0 24px 64px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(255, 255, 255, 0.02) inset;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        @supports not ((backdrop-filter: blur(24px)) or (-webkit-backdrop-filter: blur(24px))) {
          .wc-sidebar {
            background: rgba(15, 23, 42, 0.95);
          }
        }

        .wc-sidebar-inner {
          flex: 1;
          overflow-y: auto;
          padding: 24px 20px 20px 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          scroll-behavior: smooth;
        }

        .wc-sidebar-inner::-webkit-scrollbar {
          width: 4px;
        }
        .wc-sidebar-inner::-webkit-scrollbar-track {
          background: transparent;
        }
        .wc-sidebar-inner::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 2px;
        }
        .wc-sidebar-inner::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }

        .wc-user {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-shrink: 0;
        }
        .wc-user-avatar-ring {
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%);
          padding: 3px;
          flex-shrink: 0;
          box-shadow: 0 8px 24px rgba(59, 130, 246, 0.35);
        }
        .wc-user-avatar {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #0f172a;
          display: block;
        }
        .wc-user-meta {
          flex: 1;
          min-width: 0;
        }
        .wc-user-top {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .wc-user-name {
          margin: 0;
          font-size: 17px;
          font-weight: 700;
          color: #f8fafc;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          letter-spacing: -0.2px;
        }
        .wc-user-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: rgba(34, 197, 94, 0.15);
          flex-shrink: 0;
        }
        .wc-user-stats {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 6px;
        }
        .wc-stat {
          display: flex;
          align-items: baseline;
          gap: 3px;
        }
        .wc-stat-num {
          font-size: 15px;
          font-weight: 700;
          color: #3b82f6;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }
        .wc-stat-label {
          font-size: 11px;
          color: '#64748b';
          color: #64748b;
        }
        .wc-stat-sep {
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: #334155;
          flex-shrink: 0;
        }

        .wc-divider {
          height: 1px;
          background: linear-gradient(to right, transparent, #334155 50%, transparent);
          flex-shrink: 0;
        }

        .wc-section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }
        .wc-section-title-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .wc-section-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #3b82f6;
          box-shadow: 0 0 8px rgba(59, 130, 246, 0.6);
        }
        .wc-section-title {
          margin: 0;
          font-size: 12px;
          font-weight: 700;
          color: #94a3b8;
          letter-spacing: 0.8px;
          text-transform: uppercase;
        }
        .wc-section-count {
          font-size: 11px;
          font-weight: 700;
          color: #3b82f6;
          background: rgba(59, 130, 246, 0.15);
          padding: 3px 10px;
          border-radius: 999px;
          border: 1px solid rgba(59, 130, 246, 0.3);
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }

        .wc-filter {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          flex-shrink: 0;
        }
        .wc-filter-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s ease;
          outline: none;
          border: 1px solid transparent;
          font-family: inherit;
          line-height: 1;
        }
        .wc-filter-btn:hover {
          transform: translateY(-1px);
          background: rgba(71, 85, 105, 0.3) !important;
        }
        .wc-filter-btn:active {
          transform: translateY(0);
        }
        .wc-filter-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .wc-cards {
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding-bottom: 4px;
        }

        .wc-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 48px 20px;
          color: #64748b;
          text-align: center;
        }
        .wc-empty span {
          font-size: 13px;
          font-weight: 500;
          color: '#94a3b8';
          color: #94a3b8;
        }
        .wc-empty p {
          margin: 0;
          font-size: 11px;
          color: #475569;
        }

        .wc-spinner {
          width: 30px;
          height: 30px;
          border: 3px solid #1e293b;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: wc-spin 0.7s linear infinite;
        }
        @keyframes wc-spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 1024px) {
          .wc-sidebar {
            top: auto;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100%;
            height: 48%;
            min-height: 340px;
            max-height: 55%;
            border-radius: 22px 22px 0 0;
            border-bottom: none;
            border-left: none;
            border-right: none;
            box-shadow: 0 -24px 64px rgba(0, 0, 0, 0.5);
          }
          .wc-sidebar::before {
            content: '';
            position: absolute;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            width: 40px;
            height: 4px;
            background: #475569;
            border-radius: 2px;
            z-index: 10;
          }
          .wc-sidebar-inner {
            padding-top: 22px;
          }
          .wc-cards {
            flex-direction: row;
            overflow-x: auto;
            overflow-y: hidden;
            padding: 0 4px 8px 4px;
            gap: 12px;
            scroll-snap-type: x mandatory;
          }
          .wc-cards > * {
            flex-shrink: 0;
            scroll-snap-align: start;
          }
          .wc-cards::-webkit-scrollbar {
            height: 4px;
            width: auto;
          }
        }

        @media (max-width: 640px) {
          .wc-sidebar {
            height: 55%;
            min-height: 360px;
          }
          .wc-sidebar-inner {
            padding: 20px 16px 16px 16px;
            gap: 16px;
          }
          .wc-user-avatar-ring {
            width: 50px;
            height: 50px;
          }
        }
      `}</style>
    </>
  );
}
