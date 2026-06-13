import { useState } from 'react';
import { Link } from 'react-router-dom';
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
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={i <= rating ? '#fbbf24' : 'none'}
          stroke={i <= rating ? '#fbbf24' : '#475569'}
          strokeWidth="2"
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
  return (
    <button
      type="button"
      onClick={onClick}
      className="journey-card"
      style={{
        width: '280px',
        height: '140px',
        borderRadius: '10px',
        background: '#1e293b',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        textAlign: 'left',
        transform: isSelected ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: isSelected
          ? `0 12px 32px ${THEME_COLORS[location.theme]}40, 0 4px 12px rgba(0,0,0,0.4)`
          : '0 2px 8px rgba(0,0,0,0.3)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: '4px',
          background: THEME_COLORS[location.theme],
          borderRadius: '0 10px 10px 0',
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
        }}
      >
        <img
          src={location.coverImage}
          alt={location.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to right, transparent 0%, #1e293b 100%)',
          }}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '152px',
          right: '16px',
          bottom: '16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '4px',
            }}
          >
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                color: THEME_COLORS[location.theme],
                background: `${THEME_COLORS[location.theme]}20`,
                padding: '2px 8px',
                borderRadius: '999px',
                letterSpacing: '0.5px',
              }}
            >
              {THEME_LABELS[location.theme]}
            </span>
          </div>
          <h3
            style={{
              margin: 0,
              fontSize: '15px',
              fontWeight: 700,
              color: '#f8fafc',
              lineHeight: 1.3,
            }}
          >
            {location.name}
          </h3>
          <p
            style={{
              margin: '2px 0 0 0',
              fontSize: '11px',
              color: '#94a3b8',
            }}
          >
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
              fontFamily: 'monospace',
            }}
          >
            {location.visitDate}
          </span>
        </div>
      </div>
    </button>
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

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-content">
          {user && (
            <div className="user-section">
              <div className="user-header">
                <div className="avatar-wrapper">
                  <img src={user.avatar} alt={user.nickname} className="avatar" />
                </div>
                <div className="user-info">
                  <h2 className="user-name">{user.nickname}</h2>
                  <div className="user-stats">
                    <span className="stat-item">
                      <span className="stat-value">{user.travelCount}</span>
                      <span className="stat-label">旅程</span>
                    </span>
                    <span className="stat-divider">·</span>
                    <span className="stat-item">
                      <span className="stat-value">{user.countryCount}</span>
                      <span className="stat-label">国家</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="section-divider" />

          <div className="section-header">
            <h3 className="section-title">我的旅程</h3>
            <span className="section-count">
              {loading ? '...' : filteredLocations.length}
            </span>
          </div>

          <div className="filter-tabs">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                className={`filter-tab ${filter === f.key ? 'active' : ''}`}
                onClick={() => setFilter(f.key)}
                style={{
                  background: filter === f.key
                    ? f.color
                      ? `${f.color}20`
                      : '#334155'
                    : 'transparent',
                  color: filter === f.key
                    ? f.color || '#f8fafc'
                    : '#64748b',
                  border: f.color && filter === f.key
                    ? `1px solid ${f.color}40`
                    : filter === f.key
                    ? '1px solid #475569'
                    : '1px solid transparent',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="journey-list">
            {loading ? (
              <div className="loading-state">
                <div className="loading-spinner" />
                <span>加载中...</span>
              </div>
            ) : filteredLocations.length === 0 ? (
              <div className="empty-state">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5">
                  <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>暂无旅程记录</span>
              </div>
            ) : (
              filteredLocations.map((loc) => (
                <Link
                  to={`/location/${loc.id}`}
                  key={loc.id}
                  style={{ textDecoration: 'none' }}
                  onClick={(e) => {
                    e.preventDefault();
                    onLocationSelect(loc.id);
                  }}
                >
                  <JourneyCard
                    location={loc}
                    isSelected={selectedId === loc.id}
                    onClick={() => onLocationSelect(loc.id)}
                  />
                </Link>
              ))
            )}
          </div>
        </div>
      </aside>

      <style>{`
        .sidebar {
          position: fixed;
          top: 20px;
          left: 20px;
          bottom: 20px;
          width: 320px;
          background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 12px;
          border: 1px solid rgba(71, 85, 105, 0.3);
          z-index: 100;
          box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .sidebar-content {
          flex: 1;
          overflow-y: auto;
          padding: 24px 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .sidebar-content::-webkit-scrollbar {
          width: 4px;
        }

        .sidebar-content::-webkit-scrollbar-track {
          background: transparent;
        }

        .sidebar-content::-webkit-scrollbar-thumb {
          background: #475569;
          border-radius: 2px;
        }

        .user-section {
          flex-shrink: 0;
        }

        .user-header {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .avatar-wrapper {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          padding: 3px;
          flex-shrink: 0;
        }

        .avatar {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #1e293b;
        }

        .user-info {
          flex: 1;
          min-width: 0;
        }

        .user-name {
          margin: 0;
          font-size: 17px;
          font-weight: 700;
          color: #f8fafc;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .user-stats {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 6px;
        }

        .stat-item {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }

        .stat-value {
          font-size: 15px;
          font-weight: 700;
          color: #3b82f6;
        }

        .stat-label {
          font-size: 11px;
          color: #64748b;
        }

        .stat-divider {
          color: #334155;
          font-size: 12px;
        }

        .section-divider {
          height: 1px;
          background: linear-gradient(to right, transparent, #334155, transparent);
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: -8px;
        }

        .section-title {
          margin: 0;
          font-size: 13px;
          font-weight: 600;
          color: #94a3b8;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .section-count {
          font-size: 12px;
          font-weight: 600;
          color: #3b82f6;
          background: rgba(59, 130, 246, 0.15);
          padding: 2px 10px;
          border-radius: 999px;
        }

        .filter-tabs {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .filter-tab {
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          outline: none;
        }

        .filter-tab:hover {
          transform: translateY(-1px);
        }

        .journey-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding-bottom: 8px;
        }

        .journey-card:hover {
          transform: translateY(-4px) !important;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5) !important;
        }

        .loading-state,
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 40px 20px;
          color: #64748b;
          font-size: 13px;
        }

        .loading-spinner {
          width: 28px;
          height: 28px;
          border: 3px solid #334155;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 1024px) {
          .sidebar {
            top: auto;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100%;
            height: 45%;
            border-radius: 20px 20px 0 0;
            border-bottom: none;
            border-left: none;
            border-right: none;
          }

          .journey-list {
            flex-direction: row;
            overflow-x: auto;
            padding: 0 4px 8px 4px;
            gap: 12px;
          }

          .journey-list > a {
            flex-shrink: 0;
          }
        }

        @media (max-width: 640px) {
          .sidebar {
            height: 50%;
          }

          .sidebar-content {
            padding: 20px 16px;
          }
        }
      `}</style>
    </>
  );
}
