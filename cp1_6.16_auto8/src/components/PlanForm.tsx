import { useState, useEffect, useRef, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import type { Track } from '../api/backend';
import { instrumentLabels, instrumentColors } from '../api/backend';
import type { DifficultyPreference } from '../logic/planGenerator';
import { useDebounce } from '../hooks/useDebounce';

interface PlanFormProps {
  tracks: Track[];
  selectedTrackIds: string[];
  setSelectedTrackIds: (ids: string[]) => void;
  dailyMinutes: number;
  setDailyMinutes: (m: number) => void;
  preference: DifficultyPreference;
  setPreference: (p: DifficultyPreference) => void;
  dailyOptions: number[];
  preferenceOptions: { value: DifficultyPreference; label: string }[];
  onGenerate: () => void;
}

function Stars({ count }: { count: number }) {
  return (
    <span className="stars">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < count ? 'star filled' : 'star'}>★</span>
      ))}
    </span>
  );
}

const durationIcons: Record<number, string> = {
  15: '⚡',
  30: '🕐',
  45: '🕑',
  60: '🔥',
};

const preferenceIcons: Record<DifficultyPreference, string> = {
  easy: '🌱',
  moderate: '🎯',
  challenge: '🚀',
};

const VISIBLE_ITEMS = 7;
const ITEM_HEIGHT = 56;
const LIST_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

type ListItem =
  | { type: 'group'; group: string; label: string }
  | { type: 'track'; track: Track; group: string };

export default function PlanForm({
  tracks,
  selectedTrackIds,
  setSelectedTrackIds,
  dailyMinutes,
  setDailyMinutes,
  preference,
  setPreference,
  dailyOptions,
  preferenceOptions,
  onGenerate,
}: PlanFormProps) {
  const [searchKeyword, setSearchKeyword] = useState('');
  const debouncedKeyword = useDebounce(searchKeyword, 200);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const listRef = useRef<List>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTo(0);
    }
  }, [debouncedKeyword]);

  const flatListItems = useMemo((): ListItem[] => {
    const kw = debouncedKeyword.trim().toLowerCase();
    const filtered = tracks.filter(t => {
      const isSelected = selectedTrackIds.includes(t.id);
      if (isSelected) return false;
      if (kw === '') return true;
      return (
        t.title.toLowerCase().includes(kw) ||
        t.composer.toLowerCase().includes(kw) ||
        t.description.toLowerCase().includes(kw)
      );
    });

    const groups: Record<string, Track[]> = {};
    filtered.forEach(t => {
      if (!groups[t.instrument]) groups[t.instrument] = [];
      groups[t.instrument].push(t);
    });

    const items: ListItem[] = [];
    Object.entries(groups).forEach(([g, groupTracks]) => {
      items.push({ type: 'group', group: g, label: instrumentLabels[g as keyof typeof instrumentLabels] });
      groupTracks.forEach(t => items.push({ type: 'track', track: t, group: g }));
    });
    return items;
  }, [tracks, selectedTrackIds, debouncedKeyword]);

  const trackCount = useMemo(
    () => flatListItems.filter(i => i.type === 'track').length,
    [flatListItems]
  );

  const selectedTracks = useMemo(
    () => tracks.filter(t => selectedTrackIds.includes(t.id)),
    [tracks, selectedTrackIds]
  );

  const handleTrackSelect = (trackId: string) => {
    setSelectedTrackIds([...selectedTrackIds, trackId]);
  };

  const handleTrackRemove = (trackId: string) => {
    setSelectedTrackIds(selectedTrackIds.filter(id => id !== trackId));
  };

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = flatListItems[index];
    if (!item) return null;

    if (item.type === 'group') {
      return (
        <div style={style} className="dropdown-group-header">
          <span
            className="dropdown-group-tag"
            style={{ backgroundColor: instrumentColors[item.group as keyof typeof instrumentColors] }}
          >
            {item.label}
          </span>
        </div>
      );
    }

    return (
      <div
        style={style}
        className="dropdown-item"
        onClick={() => handleTrackSelect(item.track.id)}
      >
        <div className="dropdown-item-main">
          <div className="dropdown-item-title">{item.track.title}</div>
          <div className="dropdown-item-sub">
            <span>{item.track.composer}</span>
            <span
              className="instrument-tag-sm"
              style={{ backgroundColor: instrumentColors[item.group as keyof typeof instrumentColors] }}
            >
              {instrumentLabels[item.group as keyof typeof instrumentLabels]}
            </span>
          </div>
        </div>
        <div className="dropdown-item-stats">
          <span>{item.track.duration}分</span>
          <Stars count={item.track.difficulty} />
        </div>
      </div>
    );
  };

  const totalEstimatedDuration = selectedTracks.length > 0
    ? selectedTracks.reduce((s, t) => s + t.duration, 0) * 2
    : 0;

  return (
    <div className="plan-form-card">
      <h3 className="form-title">✨ 生成练习计划</h3>

      <div className="form-section">
        <label className="form-label">选择练习曲目</label>
        <div className="plan-search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="plan-search-input"
            placeholder="搜索曲目名、作曲家..."
            value={searchKeyword}
            onChange={(e) => {
              setSearchKeyword(e.target.value);
              if (!dropdownOpen) setDropdownOpen(true);
            }}
            onFocus={() => setDropdownOpen(true)}
          />
          {debouncedKeyword && (
            <span className="search-count-badge">{trackCount}首</span>
          )}
        </div>
        <div className="track-dropdown" ref={dropdownRef}>
          <div
            className="dropdown-trigger"
            onClick={() => setDropdownOpen(v => !v)}
          >
            <span className="dropdown-placeholder">
              {selectedTracks.length > 0
                ? `已选择 ${selectedTracks.length} 首曲目`
                : '点击展开曲目列表'}
            </span>
            <span className={`dropdown-arrow ${dropdownOpen ? 'up' : ''}`}>▾</span>
          </div>
          {dropdownOpen && (
            <div className="dropdown-panel">
              {debouncedKeyword && (
                <div className="search-hint">
                  搜索 "{debouncedKeyword}"，找到 {trackCount} 个结果
                </div>
              )}
              <div
                className="dropdown-list"
              >
                {flatListItems.length === 0 ? (
                  <div className="dropdown-empty">
                    {selectedTracks.length === tracks.length ? '已选择全部曲目' : '没有匹配的曲目'}
                  </div>
                ) : (
                  <List
                    ref={listRef}
                    height={LIST_HEIGHT}
                    itemCount={flatListItems.length}
                    itemSize={ITEM_HEIGHT}
                    width="100%"
                    className="virtual-list"
                  >
                    {Row}
                  </List>
                )}
              </div>
            </div>
          )}
        </div>

        {selectedTracks.length > 0 && (
          <div className="selected-tracks">
            <div className="selected-tracks-header">
              <span>已选曲目 ({selectedTracks.length})</span>
              <span className="selected-estimate">预估总时长 ~{totalEstimatedDuration}分钟/周</span>
            </div>
            <div className="selected-track-list">
              {selectedTracks.map(track => (
                <div key={track.id} className="selected-track-chip">
                  <span
                    className="chip-tag"
                    style={{ backgroundColor: instrumentColors[track.instrument] }}
                  >
                    {instrumentLabels[track.instrument]}
                  </span>
                  <div className="chip-info">
                    <div className="chip-title">{track.title}</div>
                    <div className="chip-meta">
                      {track.duration}分 · <Stars count={track.difficulty} />
                    </div>
                  </div>
                  <button
                    className="chip-remove"
                    onClick={() => handleTrackRemove(track.id)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="form-section">
        <label className="form-label">每日练习时长</label>
        <div className="radio-group duration-group">
          {dailyOptions.map(opt => (
            <label
              key={opt}
              className={`radio-card ${dailyMinutes === opt ? 'active' : ''}`}
            >
              <input
                type="radio"
                name="duration"
                value={opt}
                checked={dailyMinutes === opt}
                onChange={() => setDailyMinutes(opt)}
              />
              <span className="radio-icon">{durationIcons[opt]}</span>
              <span className="radio-value">{opt}分钟</span>
            </label>
          ))}
        </div>
      </div>

      <div className="form-section">
        <label className="form-label">难度偏好</label>
        <div className="radio-group preference-group">
          {preferenceOptions.map(opt => (
            <label
              key={opt.value}
              className={`radio-card ${preference === opt.value ? 'active' : ''}`}
            >
              <input
                type="radio"
                name="preference"
                value={opt.value}
                checked={preference === opt.value}
                onChange={() => setPreference(opt.value)}
              />
              <span className="radio-icon">{preferenceIcons[opt.value]}</span>
              <span className="radio-value">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        className="generate-btn"
        onClick={onGenerate}
        disabled={selectedTracks.length === 0}
      >
        <span>🎯 生成本周计划</span>
      </button>
    </div>
  );
}
