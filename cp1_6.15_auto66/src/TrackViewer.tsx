import React, { useState, useMemo, useCallback } from 'react';
import { Album, Track, formatDuration } from './data';

interface TrackViewerProps {
  album: Album | null;
  animationKey: number;
}

const CHART_RADIUS = 180;
const SVG_SIZE = 400;
const SVG_CENTER = SVG_SIZE / 2;

const PlayIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size}>
    <path d="M8 5v14l11-7z" />
  </svg>
);

const VinylIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" className="empty-state-icon" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="12" cy="12" r="0.5" fill="currentColor" />
  </svg>
);

const polarToCartesian = (
  cx: number,
  cy: number,
  r: number,
  angleDeg: number
): { x: number; y: number } => {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad)
  };
};

const describeSlice = (
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string => {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    'M', cx, cy,
    'L', start.x, start.y,
    'A', r, r, 0, largeArcFlag, 0, end.x, end.y,
    'Z'
  ].join(' ');
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 0, g: 0, b: 0 };
};

const rgbToHex = (r: number, g: number, b: number): string =>
  '#' +
  [r, g, b]
    .map((x) => Math.min(255, Math.max(0, Math.round(x))).toString(16).padStart(2, '0'))
    .join('');

const adjustColor = (hex: string, index: number, total: number): string => {
  const rgb = hexToRgb(hex);
  const progress = index / Math.max(total - 1, 1);
  const shift = Math.floor(progress * 60);

  if (index % 3 === 0) {
    return rgbToHex(rgb.r + shift, rgb.g, rgb.b);
  } else if (index % 3 === 1) {
    return rgbToHex(rgb.r, rgb.g + shift, rgb.b);
  } else {
    return rgbToHex(rgb.r, rgb.g, rgb.b + shift);
  }
};

interface SliceData {
  track: Track;
  index: number;
  startAngle: number;
  endAngle: number;
  midAngle: number;
  path: string;
  hoverPath: string;
  color: string;
  trackNumber: number;
}

const TrackViewer: React.FC<TrackViewerProps> = ({ album, animationKey }) => {
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [hoveredTrackId, setHoveredTrackId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const totalDuration = useMemo(() => {
    if (!album) return 0;
    return album.tracks.reduce((sum, t) => sum + t.duration, 0);
  }, [album]);

  const slices = useMemo<SliceData[]>(() => {
    if (!album) return [];
    const result: SliceData[] = [];
    let currentAngle = 0;

    album.tracks.forEach((track, index) => {
      const angleFraction = (track.duration / totalDuration) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angleFraction;
      const midAngle = (startAngle + endAngle) / 2;

      result.push({
        track,
        index,
        startAngle,
        endAngle,
        midAngle,
        path: describeSlice(SVG_CENTER, SVG_CENTER, CHART_RADIUS, startAngle, endAngle),
        hoverPath: describeSlice(SVG_CENTER, SVG_CENTER, CHART_RADIUS + 8, startAngle, endAngle),
        color: adjustColor(album.primaryColor, index, album.tracks.length),
        trackNumber: index + 1
      });

      currentAngle = endAngle;
    });

    return result;
  }, [album, totalDuration]);

  const hoveredSlice = useMemo(
    () => slices.find((s) => s.track.id === hoveredTrackId),
    [slices, hoveredTrackId]
  );

  const selectedSlice = useMemo(
    () => slices.find((s) => s.track.id === selectedTrackId),
    [slices, selectedTrackId]
  );

  const playingSlice = useMemo(
    () => slices.find((s) => s.track.id === playingTrackId),
    [slices, playingTrackId]
  );

  const handleSliceClick = useCallback((slice: SliceData) => {
    setSelectedTrackId(slice.track.id);
    setPlayingTrackId(slice.track.id);
  }, []);

  const handleSliceMouseEnter = useCallback(
    (slice: SliceData, e: React.MouseEvent<SVGPathElement>) => {
      setHoveredTrackId(slice.track.id);
      const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
      const wrapper = e.currentTarget.ownerSVGElement?.closest('.track-chart-wrapper')?.getBoundingClientRect();
      if (rect && wrapper) {
        const mid = polarToCartesian(
          SVG_CENTER * (rect.width / SVG_SIZE),
          SVG_CENTER * (rect.height / SVG_SIZE),
          (CHART_RADIUS + 40) * (rect.width / SVG_SIZE),
          slice.midAngle
        );
        setTooltipPos({
          x: mid.x - wrapper.left,
          y: mid.y - wrapper.top
        });
      }
    },
    []
  );

  const handleSliceMouseMove = useCallback(
    (slice: SliceData, e: React.MouseEvent<SVGPathElement>) => {
      const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
      const wrapper = e.currentTarget.ownerSVGElement?.closest('.track-chart-wrapper')?.getBoundingClientRect();
      if (rect && wrapper) {
        const mid = polarToCartesian(
          SVG_CENTER * (rect.width / SVG_SIZE),
          SVG_CENTER * (rect.height / SVG_SIZE),
          (CHART_RADIUS + 40) * (rect.width / SVG_SIZE),
          slice.midAngle
        );
        setTooltipPos({
          x: mid.x - wrapper.left,
          y: mid.y - wrapper.top
        });
      }
    },
    []
  );

  const handleSliceMouseLeave = useCallback(() => {
    setHoveredTrackId(null);
    setTooltipPos(null);
  }, []);

  if (!album) {
    return (
      <div className="track-viewer-container">
        <div className="empty-state">
          <VinylIcon />
          <div className="empty-state-text">选择一张专辑</div>
          <div className="empty-state-subtext">从左侧列表中点击专辑卡片开始浏览</div>
        </div>
      </div>
    );
  }

  return (
    <div className="track-viewer-container">
      <div className="track-viewer-content">
        <div className="track-chart-wrapper">
          <div key={`chart-${album.id}-${animationKey}`} className="track-chart-enter">
            <svg
              viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
              className="track-chart-svg"
              style={{ width: SVG_SIZE, height: SVG_SIZE }}
            >
              <defs>
                <filter id="innerGlow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <circle
                cx={SVG_CENTER}
                cy={SVG_CENTER}
                r={CHART_RADIUS - 2}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="1"
              />
              <circle
                cx={SVG_CENTER}
                cy={SVG_CENTER}
                r={CHART_RADIUS / 2}
                fill="none"
                stroke="rgba(255,255,255,0.04)"
                strokeWidth="1"
              />

              {slices.map((slice) => {
                const isHovered = hoveredTrackId === slice.track.id;
                const isSelected = selectedTrackId === slice.track.id;
                const isPlaying = playingTrackId === slice.track.id;

                const rotationDeg = isHovered ? slice.midAngle : 0;
                const translateX = isHovered ? 8 : 0;

                return (
                  <g key={slice.track.id}>
                    <path
                      d={isHovered ? slice.hoverPath : slice.path}
                      fill={slice.color}
                      stroke="rgba(255,255,255,0.08)"
                      strokeWidth="0.5"
                      className={`track-slice${isSelected ? ' highlighted' : ''}`}
                      style={{
                        transform: isHovered
                          ? `rotate(${slice.midAngle}deg) translate(${translateX}px) rotate(${-slice.midAngle}deg)`
                          : 'none',
                        transformOrigin: `${SVG_CENTER}px ${SVG_CENTER}px`
                      }}
                      onClick={() => handleSliceClick(slice)}
                      onMouseEnter={(e) => handleSliceMouseEnter(slice, e)}
                      onMouseMove={(e) => handleSliceMouseMove(slice, e)}
                      onMouseLeave={handleSliceMouseLeave}
                      filter={isPlaying ? 'url(#innerGlow)' : undefined}
                    />
                  </g>
                );
              })}

              <circle
                cx={SVG_CENTER}
                cy={SVG_CENTER}
                r={CHART_RADIUS * 0.3}
                fill="rgba(15, 15, 26, 0.9)"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="1"
              />
            </svg>

            {playingSlice && (
              <div
                className="playing-orbit"
                style={{
                  transformOrigin: 'center'
                }}
              >
                <div className="playing-dot" />
              </div>
            )}

            {selectedSlice && (
              <div className="play-button-center">
                <PlayIcon size={32} />
              </div>
            )}

            {hoveredSlice && tooltipPos && (
              <div
                className="track-tooltip"
                style={{
                  left: tooltipPos.x,
                  top: tooltipPos.y,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                {hoveredSlice.track.name} · {formatDuration(hoveredSlice.track.duration)}
              </div>
            )}
          </div>
        </div>

        <div className="track-detail-panel" key={`detail-${album.id}-${animationKey}`}>
          <div className="track-detail-header">
            <div className="track-detail-album-name">{album.name}</div>
            <div className="track-detail-title">
              {selectedSlice ? selectedSlice.track.name : '未选择曲目'}
            </div>
            <div className="track-detail-artist">{album.artist}</div>
          </div>

          <div className="track-detail-info">
            <div className="track-detail-row">
              <span className="track-detail-label">曲目序号</span>
              <span className="track-detail-value">
                {selectedSlice ? (
                  <span className="track-detail-track-number">
                    {selectedSlice.trackNumber.toString().padStart(2, '0')}
                  </span>
                ) : (
                  '--'
                )}
              </span>
            </div>
            <div className="track-detail-row">
              <span className="track-detail-label">时长</span>
              <span className="track-detail-value">
                {selectedSlice ? formatDuration(selectedSlice.track.duration) : '--:--'}
              </span>
            </div>
            <div className="track-detail-row">
              <span className="track-detail-label">总曲目</span>
              <span className="track-detail-value">{album.tracks.length} 首</span>
            </div>
            <div className="track-detail-row">
              <span className="track-detail-label">总时长</span>
              <span className="track-detail-value">{formatDuration(totalDuration)}</span>
            </div>
            <div className="track-detail-row">
              <span className="track-detail-label">状态</span>
              <span className="track-detail-value">
                {playingSlice ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#4ADE80',
                        boxShadow: '0 0 8px rgba(74, 222, 128, 0.6)'
                      }}
                    />
                    正在播放
                  </span>
                ) : selectedSlice ? (
                  '已选择'
                ) : (
                  '待选择'
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackViewer;
