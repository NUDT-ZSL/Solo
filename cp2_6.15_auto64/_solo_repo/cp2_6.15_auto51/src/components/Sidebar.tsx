import { Settings, ChevronDown, ChevronRight, Music } from 'lucide-react';
import type { Platform, SongRecord } from '../types';

interface SidebarProps {
  platforms: Platform[];
  records: Record<string, SongRecord[]>;
  expandedPlatforms: Set<string>;
  onTogglePlatform: (id: string) => void;
  onSettingsClick: () => void;
  isMobile: boolean;
  activeMobileTab: string | null;
}

export default function Sidebar({
  platforms,
  records,
  expandedPlatforms,
  onTogglePlatform,
  onSettingsClick,
  isMobile,
  activeMobileTab,
}: SidebarProps) {
  if (isMobile) {
    return (
      <div className="sidebar-mobile">
        {platforms.map((p) => {
          const isActive = activeMobileTab === p.id;
          const platformRecords = records[p.id] || [];
          return (
            <div key={p.id} className="sidebar-mobile-tab-wrapper">
              <button
                className={`sidebar-mobile-tab ${isActive ? 'active' : ''}`}
                style={{ color: isActive ? p.color : '#666' }}
                onClick={() => onTogglePlatform(p.id)}
              >
                <div
                  className="sidebar-mobile-icon"
                  style={{ background: p.color }}
                >
                  {p.name[0]}
                </div>
                <span>{p.name}</span>
              </button>
              {isActive && platformRecords.length > 0 && (
                <div className="sidebar-mobile-song-list">
                  {platformRecords.map((song) => (
                    <div key={song.id} className="sidebar-song-item">
                      <Music size={14} color="#999" />
                      <span className="sidebar-song-title">{song.title}</span>
                      <span className="sidebar-song-artist">{song.artist}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">我的歌单</span>
        <button
          className="settings-gear-btn"
          onClick={onSettingsClick}
          aria-label="设置"
        >
          <Settings size={20} color="#666" />
        </button>
      </div>

      <div className="sidebar-body">
        {platforms.map((platform) => {
          const isExpanded = expandedPlatforms.has(platform.id);
          const platformRecords = records[platform.id] || [];

          return (
            <div key={platform.id}>
              <div
                className="sidebar-platform-row"
                onClick={() => onTogglePlatform(platform.id)}
              >
                <div
                  className="sidebar-platform-icon"
                  style={{ background: platform.color }}
                >
                  {platform.name[0]}
                </div>
                <span className="sidebar-platform-name">{platform.name}</span>
                <span className="sidebar-song-count">
                  {platformRecords.length}首
                </span>
                {isExpanded ? (
                  <ChevronDown size={16} color="#999" />
                ) : (
                  <ChevronRight size={16} color="#999" />
                )}
              </div>

              <div
                className={`sidebar-song-list ${
                  isExpanded ? 'expanded' : ''
                }`}
                style={{
                  maxHeight: isExpanded
                    ? platformRecords.length * 48
                    : 0,
                }}
              >
                {platformRecords.map((song) => (
                  <div key={song.id} className="sidebar-song-item">
                    <Music size={14} color="#999" />
                    <span className="sidebar-song-title">{song.title}</span>
                    <span className="sidebar-song-artist">{song.artist}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
