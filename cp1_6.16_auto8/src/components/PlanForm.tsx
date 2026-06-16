import { useState, useEffect, useRef, useMemo } from 'react';
import type { Track } from '../api/backend';
import { instrumentLabels, instrumentColors } from '../api/backend';
import type { DifficultyPreference } from '../logic/planGenerator';

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

const VISIBLE_ITEMS = 15;

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
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);
  const searchRef = useRef<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = window.setTimeout(() => {
      setDebouncedKeyword(searchKeyword);
    }, 200);
    return () => {
      if (searchRef.current) clearTimeout(searchRef.current);
    };
  }, [searchKeyword]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredTracks = useMemo(() => {
    const kw = debouncedKeyword.trim().toLowerCase();
    const list = tracks.filter(t => {
      const isSelected = selectedTrackIds.includes(t.id);
      if (kw === '') return !isSelected;
      return !isSelected && (
        t.title.toLowerCase().includes(kw) ||
        t.composer.toLowerCase().includes(kw) ||
        t.description.toLowerCase().includes(kw)
      );
    });
    const groups: Record<string, Track[]> = {};
    list.forEach(t => {
      if (!groups[t.instrument]) groups[t.instrument] = [];
      groups[t.instrument].push(t);
    });
    const result: { track: Track; group: string }[] = [];
    Object.entries(groups).forEach(([g, items]) => {
      items.forEach(t => result.push({ track: t, group: g }));
    });
    return result;
  }, [tracks, selectedTrackIds, debouncedKeyword]);

  const visibleTracks = useMemo(() => {
    const start = Math.max(0, scrollOffset);
    return filteredTracks.slice(start, start + VISIBLE_ITEMS);
  }, [filteredTracks, scrollOffset]);

  const selectedTracks = useMemo(
    () => tracks.filter(t => selectedTrackIds.includes(t.id)),
    [tracks, selectedTrackIds]
  );

  const handleTrackSelect = (trackId: string) => {
    setSelectedTrackIds([...selectedTrackIds, trackId]);
    setSearchKeyword('');
    setDebouncedKeyword('');
  };

  const handleTrackRemove = (trackId: string) => {
    setSelectedTrackIds(selectedTrackIds.filter(id => id !== trackId));
  };

  const handleDropdownScroll = (e: React.WheelEvent<HTMLDivElement>) => {
    const maxScroll = Math.max(0, filteredTracks.length - VISIBLE_ITEMS);
    if (e.deltaY > 0) {
      setScrollOffset(prev => Math.min(maxScroll, prev + 3));
    } else {
      setScrollOffset(prev => Math.max(0, prev - 3));
    }
  };

  const totalEstimatedDuration = selectedTracks.length > 0
    ? selectedTracks.reduce((s, t) => s + t.duration, 0) * 2
    : 0;

  return (
    <div className="plan-form-card">
      <h3 className="form-title">✨ 生成练习计划</h3>

      <div className="form-section">
        <label className="form-label">选择练习曲目</label>
        <div className="track-dropdown" ref={dropdownRef}>
          <div
            className="dropdown-trigger"
            onClick={() => setDropdownOpen(v => !v)}
          >
            <span className="dropdown-placeholder">
              🔍 搜索曲目（支持名称/作曲家）
            </span>
            <span className={`dropdown-arrow ${dropdownOpen ? 'up' : ''}`}>▾</span>
          </div>
          {dropdownOpen && (
            <div className="dropdown-panel">
              <input
                type="text"
                className="dropdown-search"
                placeholder="输入关键词搜索..."
                value={searchKeyword}
                onChange={(e) => {
                  setSearchKeyword(e.target.value);
                  setScrollOffset(0);
                }}
                autoFocus
              />
              {debouncedKeyword && (
                <div className="search-hint">
                  搜索 "{debouncedKeyword}"，找到 {filteredTracks.length} 个结果
                </div>
              )}
              <div
                className="dropdown-list virtual-scroll"
                onWheel={handleDropdownScroll}
              >
                {filteredTracks.length === 0 ? (
                  <div className="dropdown-empty">
                    {selectedTracks.length === tracks.length ? '已选择全部曲目' : '没有匹配的曲目'}
                  </div>
                ) : (
                  <>
                    {Array.from({ length: scrollOffset }).map((_, i) => (
                      <div key={`pad-${i}`} className="dropdown-spacer" style={{ height: 56 }} />
                    ))}
                    {visibleTracks.map(({ track, group }) => (
                      <div
                        key={track.id}
                        className="dropdown-item"
                        onClick={() => handleTrackSelect(track.id)}
                      >
                        <div className="dropdown-item-main">
                          <div className="dropdown-item-title">{track.title}</div>
                          <div className="dropdown-item-sub">
                            <span>{track.composer}</span>
                            <span
                              className="instrument-tag-sm"
                              style={{ backgroundColor: instrumentColors[group as keyof typeof instrumentColors] }}
                            >
                              {instrumentLabels[group as keyof typeof instrumentLabels]}
                            </span>
                          </div>
                        </div>
                        <div className="dropdown-item-stats">
                          <span>{track.duration}分</span>
                          <Stars count={track.difficulty} />
                        </div>
                      </div>
                    ))}
                    {Array.from({ length: Math.max(0, filteredTracks.length - scrollOffset - VISIBLE_ITEMS) }).map((_, i) => (
                      <div key={`pad-b-${i}`} className="dropdown-spacer" style={{ height: 56 }} />
                    ))}
                  </>
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
