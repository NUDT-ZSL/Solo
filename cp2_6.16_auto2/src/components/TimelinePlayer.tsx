import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Loader2, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { Photo, MOOD_COLORS, MOOD_LABELS, getAllPhotos } from '../services/dataService';

const FRAME_DURATION = 1500;
const TRANSITION_DURATION = 500;
const TOTAL_CYCLE = FRAME_DURATION + TRANSITION_DURATION;

const TimelinePlayer = () => {
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const cycleOffsetRef = useRef<number>(0);

  useEffect(() => {
    const loadPhotos = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAllPhotos();
        if (data.length === 0) {
          setError('暂无照片数据，无法播放缩时动画');
        } else {
          setPhotos(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    };
    loadPhotos();
  }, []);

  const totalPhotos = photos.length;
  const totalDuration = useMemo(() => totalPhotos * TOTAL_CYCLE, [totalPhotos]);

  const preloadImages = useMemo(() => {
    return photos.map((p) => {
      const img = new Image();
      img.src = p.imageUrl;
      return img;
    });
  }, [photos]);

  useEffect(() => {
    if (totalPhotos === 0 || !isPlaying) return;

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp - cycleOffsetRef.current;
      }

      const elapsed = timestamp - startTimeRef.current;
      const overallProgress = Math.min(elapsed / totalDuration, 1);
      setProgress(overallProgress * 100);

      if (overallProgress >= 1) {
        setIsPlaying(false);
        setCurrentIndex(totalPhotos - 1);
        return;
      }

      const currentCycle = Math.floor(elapsed / TOTAL_CYCLE);
      const nextIndex = Math.min(currentCycle, totalPhotos - 1);
      if (nextIndex !== currentIndex) {
        setCurrentIndex(nextIndex);
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [totalPhotos, totalDuration, isPlaying, currentIndex]);

  const handlePlayPause = () => {
    if (isPlaying) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const elapsed = (progress / 100) * totalDuration;
      cycleOffsetRef.current = elapsed;
      startTimeRef.current = null;
    } else {
      if (progress >= 100) {
        setCurrentIndex(0);
        setProgress(0);
        cycleOffsetRef.current = 0;
      }
      startTimeRef.current = null;
    }
    setIsPlaying(!isPlaying);
  };

  const handlePrev = () => {
    const newIndex = Math.max(0, currentIndex - 1);
    setCurrentIndex(newIndex);
    setProgress((newIndex / Math.max(totalPhotos - 1, 1)) * 100);
    cycleOffsetRef.current = newIndex * TOTAL_CYCLE;
    startTimeRef.current = null;
    if (isPlaying) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const handleNext = () => {
    const newIndex = Math.min(totalPhotos - 1, currentIndex + 1);
    setCurrentIndex(newIndex);
    setProgress((newIndex / Math.max(totalPhotos - 1, 1)) * 100);
    cycleOffsetRef.current = newIndex * TOTAL_CYCLE;
    startTimeRef.current = null;
    if (isPlaying) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const getTransitionProgress = () => {
    const elapsed = (progress / 100) * totalDuration;
    const cycleTime = elapsed % TOTAL_CYCLE;
    if (cycleTime < FRAME_DURATION) return 0;
    return (cycleTime - FRAME_DURATION) / TRANSITION_DURATION;
  };

  const transitionProgress = isPlaying ? getTransitionProgress() : 0;

  const currentPhoto = photos[currentIndex];
  const nextPhoto = photos[Math.min(currentIndex + 1, totalPhotos - 1)];

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        backgroundColor: '#1f2937',
        backgroundImage:
          'radial-gradient(ellipse at center, #374151 0%, #1f2937 70%, #111827 100%)',
      }}
    >
      <style>{`
        @keyframes photoFloat {
          0%, 100% {
            transform: scale(1) rotate(0deg);
          }
          50% {
            transform: scale(1.02) rotate(0.5deg);
          }
        }
        .photo-float {
          animation: photoFloat 4s ease-in-out infinite;
        }
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .slide-in-up {
          animation: slideInUp 0.6s ease-out forwards;
        }
      `}</style>

      <div className="absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div
            className="px-4 py-2 rounded-xl text-white flex items-center gap-2"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}
          >
            <span className="text-2xl">🌱</span>
            <span className="font-semibold">生长缩时动画</span>
          </div>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="p-3 rounded-full text-white transition-all duration-200 hover:scale-110 hover:shadow-lg"
          style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
          aria-label="关闭"
        >
          <X size={22} />
        </button>
      </div>

      {loading && (
        <div className="flex-1 flex justify-center items-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="animate-spin" size={40} style={{ color: '#fbbf24' }} />
            <p className="text-white text-lg">正在加载照片...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex-1 flex justify-center items-center p-6">
          <div
            className="text-center px-8 py-6 rounded-2xl max-w-md"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
          >
            <p className="text-white text-lg mb-4">{error}</p>
            <button
              onClick={() => navigate(-1)}
              className="px-5 py-2 rounded-xl text-white font-medium transition-all hover:scale-105"
              style={{ backgroundColor: '#ef4444' }}
            >
              返回
            </button>
          </div>
        </div>
      )}

      {!loading && !error && currentPhoto && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 pt-24 pb-32">
          <div
            className="relative slide-in-up flex items-center justify-center"
            style={{ width: '100%', maxWidth: '900px', aspectRatio: '4/3' }}
            key={currentIndex}
          >
            <div
              className="photo-float w-full h-full relative rounded-2xl overflow-hidden"
              style={{
                boxShadow:
                  '0 25px 50px -12px rgba(0,0,0,0.5), 0 0 60px rgba(251,191,36,0.15)',
                border: '4px solid rgba(255,255,255,0.08)',
              }}
            >
              <img
                src={currentPhoto.imageUrl}
                alt={`${currentPhoto.date}`}
                className="w-full h-full object-cover"
                style={{
                  opacity: 1 - transitionProgress,
                  transition: 'opacity 0.05s linear',
                }}
                loading="eager"
              />

              {isPlaying && transitionProgress > 0 && nextPhoto && (
                <img
                  src={nextPhoto.imageUrl}
                  alt={`${nextPhoto.date}`}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{
                    opacity: transitionProgress,
                    transform: `scale(${1 + transitionProgress * 0.03}) rotate(${transitionProgress * 0.3}deg)`,
                  }}
                  loading="eager"
                />
              )}
            </div>
          </div>

          <div
            className="mt-8 slide-in-up text-center"
            style={{ animationDelay: '0.2s', opacity: 0 }}
          >
            <h3 className="text-white text-xl font-bold mb-2">
              {formatDate(currentPhoto.date)}
            </h3>
            <div className="flex items-center justify-center gap-3 mb-3">
              <span
                className="inline-flex items-center text-white text-sm font-medium"
                style={{
                  backgroundColor: MOOD_COLORS[currentPhoto.mood],
                  borderRadius: '6px',
                  padding: '4px 12px',
                }}
              >
                心情：{MOOD_LABELS[currentPhoto.mood]}
              </span>
              <span className="text-gray-300 text-sm">
                {currentIndex + 1} / {totalPhotos}
              </span>
            </div>
            <p className="text-gray-300 text-sm max-w-lg mx-auto leading-relaxed">
              {currentPhoto.text}
            </p>
          </div>
        </div>
      )}

      {!loading && !error && (
        <div className="absolute bottom-0 left-0 right-0 p-5 z-20">
          <div
            className="max-w-3xl mx-auto rounded-2xl px-5 py-4"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}
          >
            <div className="mb-3">
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
                    boxShadow: '0 0 10px rgba(251,191,36,0.5)',
                    transitionDuration: '100ms',
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="p-3 rounded-full text-white transition-all duration-200 hover:scale-110 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
                aria-label="上一张"
              >
                <SkipBack size={20} />
              </button>

              <button
                onClick={handlePlayPause}
                className="p-4 rounded-full text-white transition-all duration-200 hover:scale-110 shadow-lg"
                style={{
                  backgroundColor: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                  boxShadow: '0 4px 15px rgba(251,191,36,0.4)',
                }}
                aria-label={isPlaying ? '暂停' : '播放'}
              >
                {isPlaying ? <Pause size={24} fill="white" /> : <Play size={24} fill="white" />}
              </button>

              <button
                onClick={handleNext}
                disabled={currentIndex === totalPhotos - 1}
                className="p-3 rounded-full text-white transition-all duration-200 hover:scale-110 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
                aria-label="下一张"
              >
                <SkipForward size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimelinePlayer;
