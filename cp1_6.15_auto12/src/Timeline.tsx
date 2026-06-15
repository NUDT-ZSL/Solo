import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import type { Segment } from './AudioProcessor';

interface TimelineProps {
  segments: Segment[];
  activeSegmentId: string | null;
  currentPlaybackTime: number;
  onSegmentClick: (id: string) => void;
  onNotesChange: (id: string, notes: string) => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

interface SegmentBlockProps {
  segment: Segment;
  isActive: boolean;
  isPlaying: boolean;
  playbackProgress: number;
  onClick: (id: string) => void;
  onNotesChange: (id: string, notes: string) => void;
}

const SegmentBlock = React.memo(function SegmentBlock({
  segment,
  isActive,
  isPlaying,
  playbackProgress,
  onClick,
  onNotesChange,
}: SegmentBlockProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [editing, setEditing] = React.useState(false);
  const [localNotes, setLocalNotes] = React.useState(segment.notes);
  const blockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalNotes(segment.notes);
  }, [segment.notes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    const data = segment.waveformData;
    if (!data || data.length === 0) return;

    const barWidth = w / data.length;
    const barGap = 1;
    const actualBarWidth = Math.max(barWidth - barGap, 1);

    const hasNotes = segment.notes.trim().length > 0;
    const baseColor = hasNotes ? 'rgba(46, 139, 87, 0.7)' : 'rgba(70, 130, 180, 0.6)';
    const playedColor = 'rgba(30, 58, 95, 0.9)';

    for (let i = 0; i < data.length; i++) {
      const barHeight = data[i] * h * 0.85;
      const x = i * barWidth;
      const y = (h - barHeight) / 2;

      const progressPos = playbackProgress * data.length;
      if (i < progressPos && isPlaying) {
        ctx.fillStyle = playedColor;
      } else {
        ctx.fillStyle = baseColor;
      }

      ctx.fillRect(x, y, actualBarWidth, barHeight);
    }
  }, [segment.waveformData, segment.notes, isPlaying, playbackProgress]);

  useEffect(() => {
    if (isActive && blockRef.current) {
      blockRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [isActive]);

  const handleClick = useCallback(() => {
    onClick(segment.id);
  }, [onClick, segment.id]);

  const handleToggleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing((prev) => !prev);
  }, []);

  const handleNotesInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value.slice(0, 500);
      setLocalNotes(val);
    },
    [],
  );

  const handleNotesBlur = useCallback(
    (e: React.FocusEvent<HTMLTextAreaElement>) => {
      onNotesChange(segment.id, e.target.value);
    },
    [onNotesChange, segment.id],
  );

  const hasNotes = segment.notes.trim().length > 0;

  const duration = segment.endTime - segment.startTime;
  const displayDuration = duration >= 1 ? duration.toFixed(1) : '0.0';

  return (
    <div
      ref={blockRef}
      className={`segment-block ${isActive ? 'active' : ''} ${hasNotes ? 'has-notes' : ''} ${isPlaying ? 'playing' : ''}`}
      onClick={handleClick}
    >
      <div className="segment-header">
        <span className="segment-time">
          {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
        </span>
        <span className="segment-duration">{displayDuration}s</span>
        {hasNotes && <span className="segment-badge" title="已标记">已标记</span>}
      </div>

      <canvas ref={canvasRef} className="segment-waveform" />

      {isPlaying && (
        <div className="playback-progress-bar">
          <div
            className="playback-progress-fill"
            style={{ width: `${playbackProgress * 100}%` }}
          />
        </div>
      )}

      <div className="segment-edit-area">
        <button
          className="btn-edit-toggle"
          onClick={handleToggleEdit}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {editing ? '收起' : hasNotes ? '编辑纪要' : '添加纪要'}
        </button>
        {editing && (
          <>
            <textarea
              className="segment-notes-input"
              value={localNotes}
              onChange={handleNotesInput}
              onBlur={handleNotesBlur}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              maxLength={500}
              placeholder="输入该分段的纪要文字（最多500字）..."
              rows={4}
              autoFocus
            />
            <span className="char-count">{localNotes.length}/500</span>
          </>
        )}
      </div>

      <div className="segment-hover-tip">点击播放 / 展开编辑</div>
    </div>
  );
});

SegmentBlock.displayName = 'SegmentBlock';

const Timeline: React.FC<TimelineProps> = ({
  segments,
  activeSegmentId,
  currentPlaybackTime,
  onSegmentClick,
  onNotesChange,
}) => {
  const memoizedSegments = useMemo(() => segments, [segments]);

  const getPlaybackProgressForSegment = useCallback(
    (seg: Segment): number => {
      if (currentPlaybackTime <= seg.startTime) return 0;
      if (currentPlaybackTime >= seg.endTime) return 1;
      const duration = seg.endTime - seg.startTime;
      if (duration <= 0) return 0;
      return (currentPlaybackTime - seg.startTime) / duration;
    },
    [currentPlaybackTime],
  );

  const isSegmentPlaying = useCallback(
    (seg: Segment): boolean => {
      return currentPlaybackTime >= seg.startTime && currentPlaybackTime < seg.endTime;
    },
    [currentPlaybackTime],
  );

  if (memoizedSegments.length === 0) {
    return (
      <div className="timeline-empty">
        <div className="timeline-empty-icon">🎙️</div>
        <p>暂无录音分段</p>
        <p className="timeline-empty-sub">点击上方按钮开始录音，停止后自动按静音分段</p>
      </div>
    );
  }

  return (
    <div className="timeline">
      <div className="timeline-header">
        <span className="timeline-label">时间轴</span>
        <span className="timeline-count">共 {memoizedSegments.length} 个分段</span>
      </div>
      <div className="timeline-track">
        {memoizedSegments.map((seg) => (
          <SegmentBlock
            key={seg.id}
            segment={seg}
            isActive={activeSegmentId === seg.id}
            isPlaying={isSegmentPlaying(seg)}
            playbackProgress={getPlaybackProgressForSegment(seg)}
            onClick={onSegmentClick}
            onNotesChange={onNotesChange}
          />
        ))}
      </div>
    </div>
  );
};

export default React.memo(Timeline);
