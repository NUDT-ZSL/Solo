import { memo, useRef, useState, useCallback, useEffect } from 'react';
import { Heart, MessageCircle, Bookmark, Play, Pause, X } from 'lucide-react';
import type { SoundMarker } from '../../shared/types';
import { EMOTION_LABELS, EMOTION_COLORS } from '../../shared/types';
import { playWithVisualizer } from '@/utils/audioVisualizer';

interface SoundCardProps {
  marker: SoundMarker;
  onClose: () => void;
  onLike: (id: string) => void;
  onComment: (id: string, content: string) => void;
  onFavorite: (id: string, note?: string) => void;
  isMobile: boolean;
}

const SoundCard = memo(function SoundCard({
  marker,
  onClose,
  onLike,
  onComment,
  onFavorite,
  isMobile,
}: SoundCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const visualizerRef = useRef<{ stop: () => void } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [favNote, setFavNote] = useState('');
  const [showFavInput, setShowFavInput] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  const emotionColor = EMOTION_COLORS[marker.emotionTag];
  const emotionLabel = EMOTION_LABELS[marker.emotionTag];

  const handlePlay = useCallback(() => {
    if (!audioRef.current || !canvasRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      visualizerRef.current?.stop();
      visualizerRef.current = null;
      setIsPlaying(false);
      return;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const audio = audioRef.current;
    audio.src = marker.audioUrl;
    audio.crossOrigin = 'anonymous';
    audio.load();
    audio.play().then(() => {
      setIsPlaying(true);
      if (canvasRef.current) {
        visualizerRef.current = playWithVisualizer(
          ctx,
          canvasRef.current,
          audio,
          emotionColor
        );
      }
    });

    audio.onended = () => {
      setIsPlaying(false);
      visualizerRef.current?.stop();
      visualizerRef.current = null;
    };
  }, [isPlaying, marker.audioUrl, emotionColor]);

  const handleComment = useCallback(() => {
    if (!commentText.trim()) return;
    onComment(marker.id, commentText.trim());
    setCommentText('');
  }, [commentText, marker.id, onComment]);

  const handleFavorite = useCallback(() => {
    if (isFavorited) return;
    onFavorite(marker.id, favNote || undefined);
    setIsFavorited(true);
    setShowFavInput(false);
    setFavNote('');
  }, [isFavorited, marker.id, onFavorite, favNote]);

  useEffect(() => {
    return () => {
      visualizerRef.current?.stop();
      audioContextRef.current?.close();
    };
  }, []);

  const containerClass = isMobile
    ? 'fixed bottom-5 left-[2.5%] w-[95%] z-50 animate-slide-up'
    : 'fixed right-4 top-20 w-80 z-50 animate-slide-in';

  return (
    <div
      className={`${containerClass} bg-earth-cream rounded-map shadow-map overflow-hidden`}
      style={{ transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}
    >
      <div className="relative">
        {marker.imageUrl && (
          <div className="relative w-full h-44 overflow-hidden">
            <img
              src={marker.imageUrl}
              alt={marker.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-earth-cream/60 to-transparent" />
          </div>
        )}

        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1.5 bg-earth-brown/70 rounded-full text-white hover:bg-earth-brown transition-colors duration-300"
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-4 space-y-3">
        <h3 className="font-display text-lg font-semibold text-earth-brown leading-tight">
          {marker.title}
        </h3>

        <div className="flex items-center gap-3">
          <audio ref={audioRef} preload="auto" />
          <button
            onClick={handlePlay}
            className="flex items-center gap-2 px-4 py-2 bg-earth-wheat text-earth-brown rounded-full text-sm font-medium hover:bg-earth-wheatHover transition-colors duration-300"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            {isPlaying ? '暂停' : '播放'}
          </button>
          <span className="text-xs text-earth-brown/60">
            {marker.playCount} 次播放
          </span>
        </div>

        <div className="relative w-full rounded-lg overflow-hidden bg-earth-brown/5">
          <canvas
            ref={canvasRef}
            width={320}
            height={180}
            className="w-full"
            style={{ height: '120px' }}
          />
        </div>

        <p className="text-sm text-earth-brown/80 leading-relaxed">
          {marker.note}
        </p>

        <div className="flex items-center gap-2">
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{ backgroundColor: emotionColor }}
          />
          <span className="text-sm text-earth-brown/70">{emotionLabel}</span>
        </div>

        <div className="border-t border-earth-brown/10 pt-3 space-y-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onLike(marker.id)}
              className="flex items-center gap-1.5 text-earth-brown/70 hover:text-emotion-noisy transition-colors duration-300"
            >
              <Heart size={18} />
              <span className="text-sm">{marker.likes}</span>
              {marker.likesToday > 0 && (
                <span className="text-xs text-emotion-noisy">
                  +{marker.likesToday}
                </span>
              )}
            </button>
            <span className="flex items-center gap-1.5 text-earth-brown/70">
              <MessageCircle size={18} />
              <span className="text-sm">{marker.comments.length}</span>
            </span>
            <button
              onClick={() => setShowFavInput(!showFavInput)}
              className={`flex items-center gap-1.5 transition-colors duration-300 ${
                isFavorited
                  ? 'text-earth-wheat'
                  : 'text-earth-brown/70 hover:text-earth-wheat'
              }`}
            >
              <Bookmark size={18} />
            </button>
          </div>

          {showFavInput && !isFavorited && (
            <div className="flex gap-2">
              <input
                type="text"
                value={favNote}
                onChange={(e) =>
                  setFavNote(e.target.value.slice(0, 50))
                }
                placeholder="添加收藏备注（最多50字）"
                className="flex-1 px-3 py-1.5 text-sm bg-earth-warm/50 rounded-lg border border-earth-brown/10 text-earth-brown placeholder:text-earth-brown/40 focus:outline-none focus:border-earth-wheat"
              />
              <button
                onClick={handleFavorite}
                className="px-3 py-1.5 text-sm bg-earth-wheat text-earth-brown rounded-lg hover:bg-earth-wheatHover transition-colors duration-300"
              >
                收藏
              </button>
            </div>
          )}

          <div className="space-y-2 max-h-32 overflow-y-auto">
            {marker.comments.map((c) => (
              <div key={c.id} className="text-sm">
                <span className="font-medium text-earth-brown">
                  {c.username}
                </span>
                <span className="text-earth-brown/60 ml-2">{c.content}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) =>
                setCommentText(e.target.value.slice(0, 100))
              }
              placeholder="写评论（最多100字）"
              className="flex-1 px-3 py-1.5 text-sm bg-earth-warm/50 rounded-lg border border-earth-brown/10 text-earth-brown placeholder:text-earth-brown/40 focus:outline-none focus:border-earth-wheat"
            />
            <button
              onClick={handleComment}
              className="px-3 py-1.5 text-sm bg-earth-wheat text-earth-brown rounded-lg hover:bg-earth-wheatHover transition-colors duration-300"
            >
              发送
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default SoundCard;
