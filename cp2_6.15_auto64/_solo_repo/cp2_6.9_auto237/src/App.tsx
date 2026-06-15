import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import MapView from './MapView';
import AudioRecorder from './AudioRecorder';
import type { Point, Comment, SoundType } from './types';
import { SOUND_COLORS, SOUND_ICONS, SOUND_NAMES } from './types';
import {
  getPoints,
  createPoint,
  uploadAudio,
  likePoint,
  incrementPlay,
  getComments,
  createComment,
  likeComment
} from './api';

type TabType = 'map' | 'community';
type SortType = 'latest' | 'popular' | 'nearby';

const generateInitialPoints = (): Point[] => {
  const colors: SoundType[] = ['city', 'nature', 'culture', 'tech', 'mystery'];
  const names = [
    '街角风铃', '地铁回音', '公园鸟鸣', '海浪拍岸', '林间小溪',
    '城市车流', '咖啡馆雨声', '寺庙钟声', '夜市喧嚣', '山涧瀑布',
    '图书馆翻书', '儿童乐园', '雨中漫步', '古镇石板路', '工厂钟声',
    '海边灯塔', '雪山风声', '稻田蛙鸣', '老街巷弄', '火车汽笛'
  ];
  const uploaders = ['旅行者小明', '声音猎人', '城市漫步者', '自然记录者', '夜猫子'];

  const points: Point[] = [];
  for (let i = 0; i < 20; i++) {
    const type = colors[Math.floor(Math.random() * colors.length)];
    const angle = Math.random() * Math.PI * 2;
    const radius = 50 + Math.random() * 200;
    points.push({
      id: `mock-${i}`,
      name: names[i % names.length],
      type,
      color: SOUND_COLORS[type],
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      uploader: uploaders[i % uploaders.length],
      audioUrl: '',
      duration: 3 + Math.random() * 10,
      likes: Math.floor(Math.random() * 100),
      plays: Math.floor(Math.random() * 500),
      createdAt: Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000),
      waveform: Array.from({ length: 50 }, () => Math.random())
    });
  }
  return points;
};

const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return new Date(timestamp).toLocaleDateString('zh-CN');
};

const MiniWaveform = ({ data, color = '#00E5FF', width = 100, height = 20 }: {
  data: number[]; color?: string; width?: number; height?: number;
}) => {
  if (!data || data.length === 0) return null;
  const step = Math.max(1, Math.floor(data.length / width));
  const bars: number[] = [];
  for (let i = 0; i < data.length; i += step) {
    bars.push(data[i] || 0);
  }
  const barWidth = width / bars.length;
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {bars.map((v, i) => (
        <rect
          key={i}
          x={i * barWidth}
          y={(height - v * height) / 2}
          width={Math.max(1, barWidth - 1)}
          height={Math.max(2, v * height)}
          fill={color}
          rx={1}
        />
      ))}
    </svg>
  );
};

const WaveformPlayer = ({ audioUrl, waveform, onPlay, color = '#00E5FF' }: {
  audioUrl: string; waveform: number[]; onPlay: () => void; color?: string;
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
      onPlay();
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: '#1A1A2E', borderRadius: 10, padding: '10px 12px'
    }}>
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          if (a.duration) setProgress(a.currentTime / a.duration);
        }}
        onEnded={() => { setIsPlaying(false); setProgress(0); }}
      />
      <button
        onClick={togglePlay}
        style={{
          width: 36, height: 36, borderRadius: '50%',
          background: color, border: 'none',
          color: '#0F0F1A', fontSize: 14,
          cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.3s ease',
          flexShrink: 0
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>
      <div style={{ flex: 1, position: 'relative', height: 30 }}>
        <div style={{
          position: 'absolute', left: 0, top: 0,
          width: `${progress * 100}%`, height: '100%',
          background: 'rgba(0, 229, 255, 0.15)',
          borderRadius: 4, overflow: 'hidden',
          transition: 'width 0.1s linear'
        }} />
        <MiniWaveform data={waveform} color={color} width={200} height={30} />
      </div>
    </div>
  );
};

const PointInfoCard = ({ point, comments, onClose, onLike, onAddComment, onLikeComment, onPlay }: {
  point: Point;
  comments: Comment[];
  onClose: () => void;
  onLike: () => void;
  onAddComment: (content: string) => void;
  onLikeComment: (commentId: string) => void;
  onPlay: () => void;
}) => {
  const [newComment, setNewComment] = useState('');
  const commentListRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 });
  const COMMENT_HEIGHT = 72;

  const handleScroll = useCallback(() => {
    if (!commentListRef.current) return;
    const { scrollTop, clientHeight } = commentListRef.current;
    const start = Math.max(0, Math.floor(scrollTop / COMMENT_HEIGHT) - 2);
    const end = Math.min(comments.length, Math.ceil((scrollTop + clientHeight) / COMMENT_HEIGHT) + 2);
    setVisibleRange({ start, end });
  }, [comments.length]);

  const submitComment = () => {
    if (newComment.trim()) {
      onAddComment(newComment.trim());
      setNewComment('');
    }
  };

  const visibleComments = comments.slice(visibleRange.start, visibleRange.end);

  return (
    <div style={{
      position: 'fixed', top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 280, height: 420,
      background: 'rgba(30, 30, 30, 0.85)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderRadius: 16,
      border: '1px solid #4A4A4A',
      boxShadow: '0 4px 30px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(74, 74, 74, 0.3)',
      padding: 0,
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '16px 16px 12px',
        borderBottom: '1px solid rgba(74, 74, 74, 0.5)',
        position: 'relative'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 12, right: 12,
            background: 'transparent', border: 'none',
            color: '#888', fontSize: 18, cursor: 'pointer',
            transition: 'all 0.3s ease',
            width: 28, height: 28, borderRadius: '50%'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#FF6B6B'; e.currentTarget.style.background = 'rgba(255,107,107,0.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#888'; e.currentTarget.style.background = 'transparent'; }}
        >✕</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: point.color, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14
          }}>{SOUND_ICONS[point.type]}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#fff', fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {point.name}
            </div>
            <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>
              @{point.uploader}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 16px' }}>
        <WaveformPlayer audioUrl={point.audioUrl} waveform={point.waveform || []} onPlay={onPlay} color={point.color} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12 }}>
          <button
            onClick={onLike}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'transparent', border: 'none',
              color: '#B0B0B0', cursor: 'pointer', fontSize: 13,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#FFD93D')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#B0B0B0')}
          >
            <span style={{ fontSize: 16 }}>❤</span>
            <span>{point.likes}</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#888', fontSize: 13 }}>
            <span>▶</span>
            <span>{point.plays} 次播放</span>
          </div>
        </div>
      </div>

      <div
        ref={commentListRef}
        onScroll={handleScroll}
        style={{
          flex: 1, overflowY: 'auto',
          padding: '8px 16px',
          borderTop: '1px solid rgba(74, 74, 74, 0.5)',
          borderBottom: '1px solid rgba(74, 74, 74, 0.5)'
        }}
      >
        {comments.length === 0 ? (
          <div style={{ color: '#666', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
            还没有评论，来说点什么吧
          </div>
        ) : (
          <div style={{ position: 'relative', height: comments.length * COMMENT_HEIGHT }}>
            {visibleComments.map((comment, idx) => {
              const actualIdx = visibleRange.start + idx;
              const isLiked = comment.likedBy?.includes('currentUser');
              return (
                <div key={comment.id} style={{
                  position: 'absolute', top: actualIdx * COMMENT_HEIGHT,
                  left: 0, right: 0, padding: '8px 0',
                  height: COMMENT_HEIGHT
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#00E5FF', fontSize: 12, fontWeight: 500 }}>@{comment.username}</span>
                    <span style={{ color: '#666', fontSize: 11 }}>{formatRelativeTime(comment.createdAt)}</span>
                  </div>
                  <div style={{ color: '#D0D0D0', fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>{comment.content}</div>
                  <button
                    onClick={() => onLikeComment(comment.id)}
                    style={{
                      background: 'transparent', border: 'none',
                      color: isLiked ? '#FFD93D' : '#4A4A4A',
                      cursor: 'pointer', fontSize: 12,
                      display: 'flex', alignItems: 'center', gap: 4,
                      marginTop: 4, transition: 'all 0.2s ease',
                      padding: 0
                    }}
                  >
                    <span>❤</span>
                    <span>{comment.likes}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ padding: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value.slice(0, 200))}
            placeholder="写下你的评论..."
            onKeyDown={(e) => e.key === 'Enter' && submitComment()}
            style={{
              flex: 1, background: '#2A2A3A',
              border: '1px solid #3A3A3A', borderRadius: 8,
              padding: '8px 12px', color: '#fff',
              fontSize: 13, outline: 'none',
              transition: 'border-color 0.3s ease'
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#00E5FF')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#3A3A3A')}
          />
          <button
            onClick={submitComment}
            disabled={!newComment.trim()}
            style={{
              background: '#00E5FF', border: 'none',
              color: '#0F0F1A', padding: '8px 14px',
              borderRadius: 8, cursor: newComment.trim() ? 'pointer' : 'not-allowed',
              fontSize: 13, fontWeight: 600,
              transition: 'all 0.3s ease',
              opacity: newComment.trim() ? 1 : 0.5
            }}
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
};

const PlacementDialog = ({ onConfirm, onCancel, position }: {
  onConfirm: (name: string, type: SoundType) => void;
  onCancel: () => void;
  position: { x: number; y: number } | null;
}) => {
  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState<SoundType>('other');
  const types: SoundType[] = ['city', 'nature', 'culture', 'tech', 'mystery', 'other'];

  if (!position) return null;

  return (
    <div style={{
      position: 'fixed', top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(30, 30, 30, 0.95)',
      backdropFilter: 'blur(12px)',
      borderRadius: 16,
      border: '1px solid #4A4A4A',
      padding: 20, width: 300, zIndex: 200,
      boxShadow: '0 4px 30px rgba(0, 0, 0, 0.5)'
    }}>
      <div style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
        添加声音点位
      </div>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value.slice(0, 20))}
        placeholder="点位名称（最多20字）"
        autoFocus
        style={{
          width: '100%', background: '#2A2A3A',
          border: '1px solid #3A3A3A', borderRadius: 8,
          padding: '10px 12px', color: '#fff',
          fontSize: 14, outline: 'none', marginBottom: 16,
          transition: 'border-color 0.3s ease'
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = '#00E5FF')}
        onBlur={(e) => (e.currentTarget.style.borderColor = '#3A3A3A')}
      />
      <div style={{ color: '#B0B0B0', fontSize: 13, marginBottom: 8 }}>选择声音类型：</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
        {types.map(t => (
          <button
            key={t}
            onClick={() => setSelectedType(t)}
            style={{
              background: selectedType === t ? 'rgba(0, 229, 255, 0.15)' : '#2A2A3A',
              border: `1px solid ${selectedType === t ? '#00E5FF' : '#3A3A3A'}`,
              borderRadius: 10, padding: '12px 8px',
              cursor: 'pointer', transition: 'all 0.3s ease',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 4
            }}
          >
            <span style={{ fontSize: 22 }}>{SOUND_ICONS[t]}</span>
            <span style={{
              color: selectedType === t ? '#00E5FF' : '#B0B0B0',
              fontSize: 12
            }}>{SOUND_NAMES[t]}</span>
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1, background: 'transparent',
            border: '1px solid #4A4A4A', color: '#B0B0B0',
            padding: '10px', borderRadius: 8, cursor: 'pointer',
            fontSize: 14, transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#666'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#B0B0B0'; e.currentTarget.style.borderColor = '#4A4A4A'; }}
        >取消</button>
        <button
          onClick={() => name.trim() && onConfirm(name.trim(), selectedType)}
          disabled={!name.trim()}
          style={{
            flex: 1, background: '#00E5FF',
            border: 'none', color: '#0F0F1A',
            padding: '10px', borderRadius: 8,
            cursor: name.trim() ? 'pointer' : 'not-allowed',
            fontSize: 14, fontWeight: 600,
            transition: 'all 0.3s ease',
            opacity: name.trim() ? 1 : 0.5
          }}
        >确认</button>
      </div>
    </div>
  );
};

const CommunityPage = ({ points, onPointClick, sortType, onSortChange, viewCenter }: {
  points: Point[];
  onPointClick: (point: Point) => void;
  sortType: SortType;
  onSortChange: (s: SortType) => void;
  viewCenter: { x: number; y: number };
}) => {
  const sortedPoints = useMemo(() => {
    const copy = [...points];
    if (sortType === 'latest') {
      copy.sort((a, b) => b.createdAt - a.createdAt);
    } else if (sortType === 'popular') {
      copy.sort((a, b) => b.likes - a.likes);
    } else {
      copy.sort((a, b) => {
        const da = Math.hypot(a.x - viewCenter.x, a.y - viewCenter.y);
        const db = Math.hypot(b.x - viewCenter.x, b.y - viewCenter.y);
        return da - db;
      });
    }
    return copy;
  }, [points, sortType, viewCenter]);

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      background: '#0F0F1A'
    }}>
      <div style={{
        display: 'flex', gap: 32, padding: '0 24px',
        borderBottom: '1px solid #2A2A3A',
        background: 'rgba(20, 20, 40, 0.9)',
        backdropFilter: 'blur(10px)',
        position: 'sticky', top: 0, zIndex: 10
      }}>
        {([
          { key: 'latest', label: '最新' },
          { key: 'popular', label: '热门' },
          { key: 'nearby', label: '附近' }
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onSortChange(key)}
            style={{
              background: 'transparent', border: 'none',
              padding: '16px 0', color: sortType === key ? '#fff' : '#B0B0B0',
              fontSize: 14, cursor: 'pointer',
              position: 'relative',
              transition: 'color 0.3s ease',
              fontWeight: sortType === key ? 600 : 400
            }}
          >
            {label}
            {sortType === key && (
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: 2, background: '#00E5FF',
                borderRadius: 1
              }} />
            )}
          </button>
        ))}
      </div>

      <div style={{
        flex: 1, overflowY: 'auto', padding: 20,
        display: 'grid', gap: 16,
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        alignContent: 'start'
      }}>
        {sortedPoints.map(point => (
          <div
            key={point.id}
            onClick={() => onPointClick(point)}
            style={{
              background: '#1E1E2E', borderRadius: 12,
              padding: 16, cursor: 'pointer',
              transition: 'all 0.2s ease',
              border: '1px solid transparent'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,229,255,0.2)';
              e.currentTarget.style.borderColor = 'rgba(0,229,255,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = 'transparent';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: point.color, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18
              }}>{SOUND_ICONS[point.type]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#fff', fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                  {point.name}
                </div>
                <div style={{ color: '#888', fontSize: 12 }}>
                  @{point.uploader} · {formatRelativeTime(point.createdAt)}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <MiniWaveform data={point.waveform || []} color={point.color} width={250} height={24} />
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 12, color: '#888', fontSize: 12 }}>
              <span>❤ {point.likes}</span>
              <span>▶ {point.plays}</span>
              <span>{point.duration.toFixed(1)}s</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const App = () => {
  const [activeTab, setActiveTab] = useState<TabType>('map');
  const [points, setPoints] = useState<Point[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<Point | null>(null);
  const [previewPosition, setPreviewPosition] = useState<{ x: number; y: number } | null>(null);
  const [showPlacementDialog, setShowPlacementDialog] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);
  const [pendingPoint, setPendingPoint] = useState<{ name: string; type: SoundType; x: number; y: number } | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [viewCenter, setViewCenter] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [sortType, setSortType] = useState<SortType>('latest');
  const [maskClicks, setMaskClicks] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const serverPoints = await getPoints();
        if (serverPoints && serverPoints.length > 0) {
          setPoints(serverPoints);
        } else {
          setPoints(generateInitialPoints());
        }
      } catch {
        setPoints(generateInitialPoints());
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (selectedPoint) {
      getComments(selectedPoint.id)
        .then(c => setComments(c))
        .catch(() => setComments([]));
    } else {
      setComments([]);
    }
  }, [selectedPoint]);

  const handlePointClick = async (point: Point) => {
    setSelectedPoint(point);
    setPreviewPosition(null);
    setShowPlacementDialog(false);
  };

  const handleMapClick = (x: number, y: number) => {
    if (maskClicks) return;
    setPreviewPosition({ x, y });
    setShowPlacementDialog(true);
    setSelectedPoint(null);
  };

  const handlePlacementConfirm = (name: string, type: SoundType) => {
    if (!previewPosition) return;
    setPendingPoint({ name, type, x: previewPosition.x, y: previewPosition.y });
    setShowPlacementDialog(false);
    setShowRecorder(true);
  };

  const handlePlacementCancel = () => {
    setPreviewPosition(null);
    setShowPlacementDialog(false);
  };

  const handleRecordingComplete = async (blob: Blob, duration: number, waveform: number[]) => {
    if (!pendingPoint) return;

    try {
      const file = new File([blob], 'recording.webm', { type: 'audio/webm' });
      const { url } = await uploadAudio(file);

      const newPoint: Omit<Point, 'id' | 'createdAt' | 'likes' | 'plays'> = {
        name: pendingPoint.name,
        type: pendingPoint.type,
        color: SOUND_COLORS[pendingPoint.type],
        x: pendingPoint.x,
        y: pendingPoint.y,
        uploader: '我',
        audioUrl: url,
        duration,
        waveform
      };

      const created = await createPoint(newPoint);
      setPoints(prev => [...prev, created]);
      setShowRecorder(false);
      setPendingPoint(null);
      setPreviewPosition(null);
    } catch (err) {
      console.error('上传失败:', err);
      alert('上传失败，请重试');
    }
  };

  const handleLikePoint = async () => {
    if (!selectedPoint) return;
    try {
      const { likes } = await likePoint(selectedPoint.id);
      setPoints(prev => prev.map(p => p.id === selectedPoint.id ? { ...p, likes } : p));
      setSelectedPoint(prev => prev ? { ...prev, likes } : null);
    } catch {
      setPoints(prev => prev.map(p => p.id === selectedPoint.id ? { ...p, likes: p.likes + 1 } : p));
      setSelectedPoint(prev => prev ? { ...prev, likes: prev.likes + 1 } : null);
    }
  };

  const handlePlayPoint = async () => {
    if (!selectedPoint) return;
    try {
      await incrementPlay(selectedPoint.id);
    } catch {}
    setPoints(prev => prev.map(p => p.id === selectedPoint.id ? { ...p, plays: p.plays + 1 } : p));
    setSelectedPoint(prev => prev ? { ...prev, plays: prev.plays + 1 } : null);
  };

  const handleAddComment = async (content: string) => {
    if (!selectedPoint) return;
    try {
      const created = await createComment({
        pointId: selectedPoint.id,
        username: '我',
        content
      });
      setComments(prev => [...prev, created]);
    } catch (err) {
      const newComment: Comment = {
        id: `local-${Date.now()}`,
        pointId: selectedPoint.id,
        username: '我',
        content,
        createdAt: Date.now(),
        likes: 0,
        likedBy: []
      };
      setComments(prev => [...prev, newComment]);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    try {
      const { likes, liked } = await likeComment(commentId, 'currentUser');
      setComments(prev => prev.map(c =>
        c.id === commentId
          ? { ...c, likes, likedBy: liked ? [...(c.likedBy || []), 'currentUser'] : c.likedBy }
          : c
      ));
    } catch {
      setComments(prev => prev.map(c => {
        if (c.id !== commentId) return c;
        const isLiked = c.likedBy?.includes('currentUser');
        return {
          ...c,
          likes: isLiked ? c.likes - 1 : c.likes + 1,
          likedBy: isLiked
            ? (c.likedBy || []).filter(u => u !== 'currentUser')
            : [...(c.likedBy || []), 'currentUser']
        };
      }));
    }
  };

  const handleViewChange = (center: { x: number; y: number }, newZoom: number) => {
    setViewCenter(center);
    setZoom(newZoom);
  };

  useEffect(() => {
    setMaskClicks(!!selectedPoint || showPlacementDialog || showRecorder);
  }, [selectedPoint, showPlacementDialog, showRecorder]);

  return (
    <>
      <style>{`
        .app-container {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          background: #0F0F1A;
        }
        .top-bar {
          display: flex;
          align-items: center;
          padding: 12px 20px;
          background: rgba(20, 20, 40, 0.9);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid #2A2A3A;
          gap: 32px;
          position: relative;
          z-index: 50;
        }
        .logo {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #fff;
          font-weight: 700;
          font-size: 18px;
        }
        .logo-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, #00E5FF, #9B59B6);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }
        .tabs {
          display: flex;
          gap: 24px;
          flex: 1;
        }
        .tab-btn {
          background: transparent;
          border: none;
          color: #B0B0B0;
          font-size: 14px;
          cursor: pointer;
          padding: 8px 0;
          position: relative;
          transition: color 0.3s ease;
          font-weight: 500;
        }
        .tab-btn.active {
          color: #fff;
        }
        .tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: #00E5FF;
          border-radius: 1px;
        }
        .main-content {
          flex: 1;
          overflow: hidden;
          position: relative;
        }
        .overlay-mask {
          position: absolute;
          inset: 0;
          z-index: 50;
        }
        @media (max-width: 480px) {
          .top-bar { padding: 10px 14px; gap: 16px; }
          .logo { font-size: 15px; }
          .tabs { gap: 16px; }
        }
      `}</style>
      <div className="app-container">
        <div className="top-bar">
          <div className="logo">
            <div className="logo-icon">🎧</div>
            <span>回声地图</span>
          </div>
          <div className="tabs">
            <button
              className={`tab-btn ${activeTab === 'map' ? 'active' : ''}`}
              onClick={() => setActiveTab('map')}
            >
              🗺️ 地图
            </button>
            <button
              className={`tab-btn ${activeTab === 'community' ? 'active' : ''}`}
              onClick={() => setActiveTab('community')}
            >
              🏘️ 社区
            </button>
          </div>
        </div>

        <div className="main-content">
          {activeTab === 'map' ? (
            <>
              <MapView
                points={points}
                selectedPoint={selectedPoint}
                onPointClick={handlePointClick}
                onMapClick={handleMapClick}
                previewPosition={previewPosition}
                viewCenter={viewCenter}
                zoom={zoom}
                onViewChange={handleViewChange}
              />
              {maskClicks && <div className="overlay-mask" onClick={() => {}} />}
            </>
          ) : (
            <CommunityPage
              points={points}
              onPointClick={(p) => { setSelectedPoint(p); setActiveTab('map'); }}
              sortType={sortType}
              onSortChange={setSortType}
              viewCenter={viewCenter}
            />
          )}
        </div>

        {selectedPoint && !showPlacementDialog && !showRecorder && (
          <PointInfoCard
            point={selectedPoint}
            comments={comments}
            onClose={() => setSelectedPoint(null)}
            onLike={handleLikePoint}
            onAddComment={handleAddComment}
            onLikeComment={handleLikeComment}
            onPlay={handlePlayPoint}
          />
        )}

        {showPlacementDialog && (
          <PlacementDialog
            position={previewPosition}
            onConfirm={handlePlacementConfirm}
            onCancel={handlePlacementCancel}
          />
        )}

        <AudioRecorder
          visible={showRecorder}
          onClose={() => { setShowRecorder(false); setPendingPoint(null); setPreviewPosition(null); }}
          onRecordingComplete={handleRecordingComplete}
        />
      </div>
    </>
  );
};

export default App;
