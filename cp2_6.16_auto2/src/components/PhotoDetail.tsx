import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Play } from 'lucide-react';
import {
  Photo,
  MOOD_COLORS,
  MOOD_LABELS,
  getPhotoByDate,
  getAllPhotos,
} from '../services/dataService';

const PhotoDetail = () => {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [allPhotos, setAllPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!date) return;
      try {
        setLoading(true);
        setError(null);
        const [currentPhoto, photos] = await Promise.all([
          getPhotoByDate(date),
          getAllPhotos(),
        ]);
        setPhoto(currentPhoto);
        setAllPhotos(photos);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [date]);

  const timelineRange = useMemo(() => {
    if (allPhotos.length === 0) {
      const today = new Date();
      const days: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        days.push(
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        );
      }
      return days;
    }

    const dates = allPhotos.map((p) => new Date(p.date));
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

    const paddingDays = 2;
    const rangeStart = new Date(minDate);
    rangeStart.setDate(rangeStart.getDate() - paddingDays);

    const rangeEnd = new Date(maxDate);
    rangeEnd.setDate(rangeEnd.getDate() + paddingDays);

    const days: string[] = [];
    const current = new Date(rangeStart);
    while (current <= rangeEnd) {
      days.push(
        `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`,
      );
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [allPhotos]);

  const photoDateMap = useMemo(() => {
    const map = new Map<string, Photo>();
    allPhotos.forEach((p) => map.set(p.date, p));
    return map;
  }, [allPhotos]);

  const formatDisplayDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };

  const formatShortDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <div className="min-h-screen w-full py-6 px-4" style={{ backgroundColor: '#fdfaf6' }}>
      <style>{`
        @keyframes fadeInUpDetail {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .detail-animate {
          animation: fadeInUpDetail 0.3s ease-out forwards;
        }
        .timeline-node {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .timeline-node:hover {
          transform: scale(1.3);
          box-shadow: 0 0 0 4px rgba(0,0,0,0.08);
        }
        .photo-container {
          max-width: 800px;
          width: 100%;
          max-height: 600px;
          border-radius: 16px;
          border: 3px solid #e4d5c0;
          box-shadow: 0 0 30px rgba(228, 213, 192, 0.4), 0 10px 40px rgba(0,0,0,0.08);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #f5ece0;
        }
        .photo-container img {
          width: 100%;
          max-height: 600px;
          object-fit: contain;
          display: block;
        }
        @media (max-width: 1024px) {
          .photo-container {
            max-width: 90%;
          }
        }
        @media (max-width: 640px) {
          .photo-container {
            max-width: 100%;
            max-height: 400px;
          }
          .photo-container img {
            max-height: 400px;
          }
        }
      `}</style>

      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/"
            className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-md"
            style={{
              backgroundColor: '#faf5ef',
              border: '1px solid #e4d5c0',
              color: '#4a3a2a',
            }}
          >
            <ArrowLeft size={18} />
            <span className="font-medium">返回日历</span>
          </Link>

          <button
            onClick={() => navigate('/timeline')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white transition-all duration-200 hover:scale-105 hover:shadow-lg"
            style={{
              backgroundColor: '#4a3a2a',
            }}
          >
            <Play size={18} fill="white" />
            <span className="font-medium">生长缩时</span>
          </button>
        </div>

        {loading && (
          <div className="flex justify-center items-center py-32">
            <Loader2 className="animate-spin mr-2" size={28} style={{ color: '#8b7355' }} />
            <span style={{ color: '#8b7355' }}>加载中...</span>
          </div>
        )}

        {error && (
          <div className="text-center py-16">
            <div
              className="inline-block px-8 py-6 rounded-xl"
              style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}
            >
              <p className="text-lg font-medium mb-3">{error}</p>
              <Link
                to="/"
                className="inline-block px-4 py-2 rounded-lg"
                style={{ backgroundColor: '#ef4444', color: 'white' }}
              >
                返回日历
              </Link>
            </div>
          </div>
        )}

        {!loading && !error && photo && (
          <div className="detail-animate">
            <div className="text-center mb-6">
              <p className="text-sm mb-1" style={{ color: '#8b7355' }}>
                记录日期
              </p>
              <h2 className="text-2xl font-bold" style={{ color: '#4a3a2a' }}>
                {formatDisplayDate(photo.date)}
              </h2>
            </div>

            <div className="flex justify-center mb-6">
              <div className="photo-container">
                <img
                  src={photo.imageUrl}
                  alt={`植物照片 ${photo.date}`}
                  loading="lazy"
                />
              </div>
            </div>

            <div className="flex justify-center mb-6">
              <span
                className="inline-flex items-center font-medium text-white"
                style={{
                  backgroundColor: MOOD_COLORS[photo.mood],
                  borderRadius: '6px',
                  padding: '4px 12px',
                  fontSize: '14px',
                  boxShadow: `0 2px 8px ${MOOD_COLORS[photo.mood]}40`,
                }}
              >
                心情：{MOOD_LABELS[photo.mood]}
              </span>
            </div>

            <div
              className="mx-auto mb-10 px-6 py-5 rounded-2xl"
              style={{
                maxWidth: '800px',
                backgroundColor: '#faf5ef',
                border: '1px solid #e4d5c0',
              }}
            >
              <p className="text-sm mb-2 font-medium" style={{ color: '#8b7355' }}>
                📝 成长记录
              </p>
              <p
                className="leading-relaxed whitespace-pre-wrap"
                style={{
                  color: '#4a3a2a',
                  fontSize: '16px',
                  minHeight: '48px',
                }}
              >
                {photo.text || '（暂无文字记录）'}
              </p>
            </div>

            <div
              className="px-6 py-5 rounded-2xl"
              style={{
                backgroundColor: '#faf5ef',
                border: '1px solid #e4d5c0',
              }}
            >
              <p className="text-sm mb-4 font-medium text-center" style={{ color: '#8b7355' }}>
                📍 成长时间轴（点击快速跳转）
              </p>

              <div
                className="relative overflow-x-auto pb-2"
                style={{ scrollbarWidth: 'thin' }}
              >
                <div
                  className="relative flex items-center mx-auto"
                  style={{ minWidth: `${Math.max(timelineRange.length * 60, 100)}px` }}
                >
                  <div
                    className="absolute top-1/2 left-0 right-0 h-0.5 -translate-y-1/2 pointer-events-none"
                    style={{ backgroundColor: '#d4c9b7' }}
                  />

                  <div className="relative z-10 flex items-center justify-between w-full">
                    {timelineRange.map((dateStr) => {
                      const p = photoDateMap.get(dateStr);
                      const isActive = dateStr === photo.date;
                      const nodeColor = p ? MOOD_COLORS[p.mood] : '#ccc';

                      return (
                        <Link
                          key={dateStr}
                          to={p ? `/photo/${dateStr}` : '#'}
                          onClick={(e) => {
                            if (!p) e.preventDefault();
                          }}
                          className="flex flex-col items-center gap-2"
                          style={{
                            opacity: p ? 1 : 0.6,
                            cursor: p ? 'pointer' : 'default',
                          }}
                        >
                          <div
                            className={`timeline-node ${isActive ? 'ring-4 ring-opacity-20' : ''}`}
                            style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              backgroundColor: nodeColor,
                              boxShadow: isActive
                                ? `0 0 0 4px ${nodeColor}33, 0 0 0 1px ${nodeColor}`
                                : 'none',
                              transform: isActive ? 'scale(1.2)' : 'scale(1)',
                            }}
                          />
                          <span
                            className="text-xs font-medium whitespace-nowrap"
                            style={{
                              color: isActive ? '#4a3a2a' : '#8b7355',
                              fontWeight: isActive ? 600 : 400,
                            }}
                          >
                            {formatShortDate(dateStr)}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhotoDetail;
