import { useMemo, useRef } from 'react';
import { VariableSizeList as List } from 'react-window';
import type { Track } from '../api/backend';
import { instrumentLabels, instrumentColors } from '../api/backend';

interface TrackListProps {
  tracks: Track[];
  selectedTrackIds: string[];
  onToggleTrack: (trackId: string) => void;
}

type ListItem =
  | { type: 'group'; group: string; label: string }
  | { type: 'track'; track: Track; group: string };

const GROUP_HEIGHT = 40;
const TRACK_HEIGHT = 120;

function Stars({ count }: { count: number }) {
  return (
    <span className="stars">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < count ? 'star filled' : 'star'}>★</span>
      ))}
    </span>
  );
}

export default function TrackList({ tracks, selectedTrackIds, onToggleTrack }: TrackListProps) {
  const listRef = useRef<List>(null);

  const flatItems = useMemo((): ListItem[] => {
    const groups: Record<string, Track[]> = {};
    tracks.forEach(t => {
      if (!groups[t.instrument]) groups[t.instrument] = [];
      groups[t.instrument].push(t);
    });

    const items: ListItem[] = [];
    Object.entries(groups).forEach(([g, groupTracks]) => {
      items.push({ type: 'group', group: g, label: instrumentLabels[g as keyof typeof instrumentLabels] });
      groupTracks.forEach(t => items.push({ type: 'track', track: t, group: g }));
    });
    return items;
  }, [tracks]);

  const getItemSize = (index: number): number => {
    const item = flatItems[index];
    if (!item) return TRACK_HEIGHT;
    return item.type === 'group' ? GROUP_HEIGHT : TRACK_HEIGHT;
  };

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = flatItems[index];
    if (!item) return null;

    if (item.type === 'group') {
      return (
        <div style={style} className="track-group-virtual">
          <div
            className="track-group-label"
            style={{ backgroundColor: instrumentColors[item.group as keyof typeof instrumentColors] }}
          >
            {item.label}
          </div>
        </div>
      );
    }

    const isSelected = selectedTrackIds.includes(item.track.id);
    return (
      <div style={style} className="track-card-wrapper">
        <div
          className={`track-card ${isSelected ? 'selected' : ''}`}
          onClick={() => onToggleTrack(item.track.id)}
        >
          <div className="track-main">
            <div className="track-title">{item.track.title}</div>
            <div className="track-sub">
              <span className="track-composer">{item.track.composer}</span>
              <span
                className="instrument-tag"
                style={{ backgroundColor: instrumentColors[item.track.instrument] }}
              >
                {instrumentLabels[item.track.instrument]}
              </span>
            </div>
          </div>
          <div className="track-stats">
            <div className="track-stat"><span className="stat-label">时长</span>{item.track.duration}分钟</div>
            <div className="track-stat"><span className="stat-label">难度</span><Stars count={item.track.difficulty} /></div>
          </div>
          <div className="track-desc">{item.track.description}</div>
        </div>
      </div>
    );
  };

  if (flatItems.length === 0) {
    return <div className="empty-state">未找到匹配的曲目</div>;
  }

  return (
    <div className="tracks-virtual-container">
      <List
        ref={listRef}
        height={580}
        itemCount={flatItems.length}
        itemSize={getItemSize}
        width="100%"
        className="virtual-list tracks-list"
      >
        {Row}
      </List>
    </div>
  );
}
