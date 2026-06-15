import { memo, useRef, useState, useCallback, useEffect } from 'react';
import { Heart, MessageCircle, Bookmark, Play, Pause, X } from 'lucide-react';
import { TAG_COLORS } from '@/types';
import type { MarkerData, EmotionTag } from '@/types';
import { playWithVisualizer } from '@/utils/audioVisualizer';

interface SoundCardProps {
  marker: MarkerData;
  onClose: () => void;
  onLike: (id: string) => void;
  onComment: (id: string, content: string) => void;
  onFavorite: (id: string, note: string) => void;
  userId: string;
}

const SoundCard = memo(function SoundCard({
  marker,
  onClose,
  onLike,
  onComment,
  onFavorite,
  userId,
}: SoundCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [favNote, setFavNote] = useState('');
  const [showFavInput, setShowFavInput] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const tagColor = TAG_COLORS[marker.tag as EmotionTag] || '#D4A373';

  const handlePlay = useCallback(() => {
    if (!audioRef.current || !canvasRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      if (stopRef.current) {
        stopRef.current();
        stopRef.current = null;
      }
      setIsPlaying(false);
      return;
    }

    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }

    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    audioRef.current.currentTime = 0;
    audioRef.current.play().then(() => {
      const visualizer = playWithVisualizer(ctx, canvasRef.current!, audioRef.current!, tagColor);
      stopRef.current = visualizer.stop;
      setIsPlaying(true);
    }).catch(() => {});
  }, [isPlaying, tagColor]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleEnd = () => {
      setIsPlaying(false);
      if (stopRef.current) {
        stopRef.current();
        stopRef.current = null;
      }
    };
    audio.addEventListener('ended', handleEnd);
    return () => audio.removeEventListener('ended', handleEnd);
  }, []);

  useEffect(() => {
    return () => {
      if (stopRef.current) stopRef.current();
    };
  }, []);

  const handleComment = useCallback(() => {
    if (!commentText.trim()) return;
    onComment(marker.id, commentText.trim());
    setCommentText('');
  }, [commentText, marker.id, onComment]);

  const handleFavorite = useCallback(() => {
    onFavorite(marker.id, favNote);
    setShowFavInput(false);
    setFavNote('');
  }, [favNote, marker.id, onFavorite]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="card sound-card-enter sound-card-responsive"
      style={{ width: 320, maxHeight: '80vh', overflow: 'auto', position: 'relative' }}
    >
      <div style={{ position: 'relative' }}>
        {marker.imageUrl ? (
          <img
            src={marker.imageUrl}
            alt={marker.title}
            style={{
              width: '100%',
              height: 180,
              objectFit: 'cover',
              borderRadius: '16px 16px 0 0',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: 180,
              background: `linear-gradient(135deg, ${tagColor}40, ${tagColor}10)`,
              borderRadius: '16px 16px 0 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: tagColor,
              fontSize: 48,
            }}
          >
            ♪
          </div>
        )}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 60,
            background: 'linear-gradient(transparent, rgba(255,248,231,0.9))',
          }}
        />
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'rgba(62,39,35,0.6)',
            border: 'none',
            borderRadius: '50%',
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          <X size={14} />
        </button>
      </div>

      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <button
            onClick={handlePlay}
            className="btn-primary"
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              flexShrink: 0,
            }}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3 }}>{marker.title}</div>
            <div style={{ fontSize: 11, opacity: 0.6 }}>{formatDate(marker.createdAt)}</div>
          </div>
        </div>

        <canvas
          ref={canvasRef}
          width={320}
          height={180}
          style={{
            width: '100%',
            height: 120,
            borderRadius: 8,
            background: '#1A1A2E',
            marginBottom: 8,
          }}
        />

        <audio ref={audioRef} src={marker.audioUrl} preload="auto" />

        {marker.note && (
          <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 8, color: '#5D4037' }}>
            {marker.note}
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <span className="tag-dot" style={{ background: tagColor }} />
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: tagColor,
              background: `${tagColor}18`,
              padding: '2px 8px',
              borderRadius: 10,
            }}
          >
            {marker.tag}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: '#5D4037' }}>
          <button
            onClick={() => onLike(marker.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#FF6B6B',
              fontSize: 13,
              fontFamily: 'inherit',
            }}
          >
            <Heart size={16} />
            <span>{marker.likes}</span>
            {marker.likesToday > 0 && (
              <span style={{ fontSize: 10, color: '#FF6B6B' }}>+{marker.likesToday}</span>
            )}
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#5D4037',
              fontSize: 13,
              fontFamily: 'inherit',
            }}
          >
            <MessageCircle size={16} />
            <span>{marker.comments.length}</span>
          </button>

          <button
            onClick={() => setShowFavInput(!showFavInput)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#D4A373',
              fontSize: 13,
              fontFamily: 'inherit',
            }}
          >
            <Bookmark size={16} />
          </button>

          <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.5 }}>
            ♪ {marker.playCount} plays
          </span>
        </div>

        {showFavInput && (
          <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
            <input
              type="text"
              value={favNote}
              onChange={(e) => setFavNote(e.target.value.slice(0, 50))}
              placeholder="Add a note (max 50)..."
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid #D4A373',
                background: '#FFF8E7',
              }}
            />
            <button className="btn-primary" onClick={handleFavorite} style={{ fontSize: 12 }}>
              Save
            </button>
          </div>
        )}

        {showComments && (
          <div style={{ marginTop: 8 }}>
            <div style={{ maxHeight: 120, overflowY: 'auto' }} className="scrollbar-thin">
              {marker.comments.map((c) => (
                <div
                  key={c.id}
                  style={{
                    fontSize: 12,
                    padding: '4px 0',
                    borderBottom: '1px solid rgba(62,39,35,0.08)',
                  }}
                >
                  <strong>{c.username}</strong>{' '}
                  <span style={{ color: '#5D4037' }}>{c.content}</span>
                  <span style={{ fontSize: 10, opacity: 0.4, marginLeft: 4 }}>
                    {formatDate(c.createdAt)}
                  </span>
                </div>
              ))}
            </div>
            {userId && (
              <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value.slice(0, 100))}
                  placeholder="Write a comment..."
                  onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid #D4A373',
                    background: '#FFF8E7',
                  }}
                />
                <button className="btn-primary" onClick={handleComment} style={{ fontSize: 12 }}>
                  Send
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default SoundCard;
