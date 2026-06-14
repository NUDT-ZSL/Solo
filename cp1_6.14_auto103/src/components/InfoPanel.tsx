import { useState, useRef, useEffect, useCallback } from 'react';
import type { Route, Waypoint, Photo } from '../http';
import { api } from '../http';

interface InfoPanelProps {
  route: Route | null;
  selectedWaypointId: string | null;
  playbackIndex: number;
  isPlaying: boolean;
  onSelectWaypoint: (id: string) => void;
  onUpdateWaypoint: (waypointId: string, updates: Partial<Waypoint>) => void;
  onPlaybackIndexChange: (index: number) => void;
  onIsPlayingChange: (playing: boolean) => void;
  onToggleFavorite: () => void;
}

function InfoPanel({
  route,
  selectedWaypointId,
  playbackIndex,
  isPlaying,
  onSelectWaypoint,
  onUpdateWaypoint,
  onPlaybackIndexChange,
  onIsPlayingChange,
  onToggleFavorite,
}: InfoPanelProps) {
  const [dragActive, setDragActive] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const waypointRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const panelRef = useRef<HTMLDivElement>(null);
  const [reviewName, setReviewName] = useState('');
  const [reviewContent, setReviewContent] = useState('');
  const [reviewRating, setReviewRating] = useState(5);

  const sortedWaypoints = [...(route?.waypoints || [])].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  useEffect(() => {
    if (playbackIndex >= 0 && playbackIndex < sortedWaypoints.length) {
      const wp = sortedWaypoints[playbackIndex];
      const el = waypointRefs.current.get(wp.id);
      if (el && panelRef.current) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [playbackIndex, sortedWaypoints]);

  const handleTogglePlay = () => {
    if (!isPlaying && playbackIndex >= sortedWaypoints.length - 1) {
      onPlaybackIndexChange(-1);
    }
    onIsPlayingChange(!isPlaying);
  };

  const handleReset = () => {
    onIsPlayingChange(false);
    onPlaybackIndexChange(-1);
  };

  const generateThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = 100;
          canvas.height = 100;
          if (ctx) {
            ctx.beginPath();
            ctx.roundRect(0, 0, 100, 100, 8);
            ctx.clip();
            const scale = Math.max(100 / img.width, 100 / img.height);
            const x = (100 - img.width * scale) / 2;
            const y = (100 - img.height * scale) / 2;
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
          }
          const elapsed = performance.now() - startTime;
          console.log(`Thumbnail generated in ${elapsed.toFixed(0)}ms`);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFiles = useCallback(
    async (files: FileList | File[], waypointId: string) => {
      const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
      if (fileArray.length === 0) return;

      setUploadingPhoto(waypointId);

      for (const file of fileArray) {
        try {
          const thumbnail = await generateThumbnail(file);
          const reader = new FileReader();
          reader.onload = async () => {
            const base64 = reader.result as string;
            if (route) {
              try {
                const newPhoto = await api.uploadPhoto(
                  route.id,
                  waypointId,
                  base64,
                  file.name,
                  thumbnail
                );
                const wp = route.waypoints.find((w) => w.id === waypointId);
                if (wp) {
                  onUpdateWaypoint(waypointId, {
                    photos: [...wp.photos, newPhoto],
                  });
                }
              } catch (err) {
                console.error('Photo upload failed:', err);
              }
            }
          };
          reader.readAsDataURL(file);
        } catch (err) {
          console.error('Thumbnail generation failed:', err);
        }
      }

      setUploadingPhoto(null);
    },
    [route, onUpdateWaypoint]
  );

  const handleDragEnter = (e: React.DragEvent, waypointId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(waypointId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(null);
  };

  const handleDrop = (e: React.DragEvent, waypointId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(null);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files, waypointId);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>, waypointId: string) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files, waypointId);
    }
    e.target.value = '';
  };

  const handleSubmitReview = async () => {
    if (!route || !reviewContent.trim()) return;
    try {
      await api.addReview(route.id, {
        userName: reviewName || '匿名用户',
        content: reviewContent,
        rating: reviewRating,
      });
      setReviewContent('');
      setReviewName('');
    } catch (err) {
      console.error('Review submission failed:', err);
    }
  };

  if (!route) {
    return (
      <div className="info-panel" ref={panelRef}>
        <div className="empty-panel">
          <p>请选择或创建一条路线</p>
        </div>
      </div>
    );
  }

  return (
    <div className="info-panel" ref={panelRef}>
      <div className="panel-header">
        <div className="route-title-section">
          <h2 className="route-title">{route.name}</h2>
          <button
            className={`favorite-btn ${route.isFavorite ? 'active' : ''}`}
            onClick={onToggleFavorite}
          >
            {route.isFavorite ? '★' : '☆'}
          </button>
        </div>
        <p className="route-desc">{route.description}</p>

        <div className="playback-controls">
          <button
            className="play-btn"
            onClick={handleTogglePlay}
            title={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button className="reset-btn" onClick={handleReset} title="重置">
            ⟲
          </button>
          <div className="progress-info">
            {playbackIndex >= 0
              ? `${playbackIndex + 1} / ${sortedWaypoints.length}`
              : `共 ${sortedWaypoints.length} 个路点`}
          </div>
        </div>
      </div>

      <div className="waypoints-list">
        {sortedWaypoints.map((wp, index) => (
          <div
            key={wp.id}
            ref={(el) => {
              if (el) waypointRefs.current.set(wp.id, el);
            }}
            className={`waypoint-card ${
              wp.id === selectedWaypointId ? 'selected' : ''
            } ${index === playbackIndex ? 'playback-active' : ''}`}
            onClick={() => onSelectWaypoint(wp.id)}
          >
            <div className="waypoint-header">
              <span className="waypoint-index">{index + 1}</span>
              <div className="waypoint-meta">
                <div className="waypoint-time">
                  {new Date(wp.timestamp).toLocaleString('zh-CN', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <div className="waypoint-elevation">
                  📍 {wp.elevation ?? '-'} m
                </div>
              </div>
            </div>

            <div
              className={`photo-dropzone ${
                dragActive === wp.id ? 'active' : ''
              }`}
              onDragEnter={(e) => handleDragEnter(e, wp.id)}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, wp.id)}
              onClick={(e) => e.stopPropagation()}
            >
              {wp.photos.length > 0 ? (
                <div className="photo-grid">
                  {wp.photos.map((photo: Photo) => (
                    <div key={photo.id} className="photo-thumb">
                      <img src={photo.thumbnail} alt={photo.name} />
                    </div>
                  ))}
                  <label className="photo-thumb add-photo">
                    <span>+</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                      onChange={(e) => handleFileInput(e, wp.id)}
                    />
                  </label>
                </div>
              ) : (
                <label className="dropzone-content">
                  {uploadingPhoto === wp.id ? (
                    <span>上传中...</span>
                  ) : (
                    <>
                      <span className="dropzone-icon">📷</span>
                      <span className="dropzone-text">
                        拖拽图片到此处或点击上传
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileInput(e, wp.id)}
                  />
                </label>
              )}
            </div>

            <textarea
              className="notes-input"
              placeholder="添加笔记..."
              value={wp.notes}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) =>
                onUpdateWaypoint(wp.id, { notes: e.target.value })
              }
            />
          </div>
        ))}
      </div>

      {route.reviews.length > 0 && (
        <div className="reviews-section">
          <h3 className="section-title">用户评价 ({route.reviews.length})</h3>
          <div className="reviews-list">
            {route.reviews.map((review) => (
              <div key={review.id} className="review-card">
                <img
                  src={review.avatar}
                  alt={review.userName}
                  className="review-avatar"
                />
                <div className="review-content">
                  <div className="review-header">
                    <span className="review-name">{review.userName}</span>
                    <span className="review-rating">
                      {'★'.repeat(review.rating)}
                    </span>
                  </div>
                  <p className="review-text">{review.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="add-review-section">
        <h3 className="section-title">发表评价</h3>
        <input
          type="text"
          className="review-input"
          placeholder="你的昵称"
          value={reviewName}
          onChange={(e) => setReviewName(e.target.value)}
        />
        <select
          className="review-input"
          value={reviewRating}
          onChange={(e) => setReviewRating(Number(e.target.value))}
        >
          <option value={5}>★★★★★ 非常棒</option>
          <option value={4}>★★★★☆ 不错</option>
          <option value={3}>★★★☆☆ 一般</option>
          <option value={2}>★★☆☆☆ 较差</option>
          <option value={1}>★☆☆☆☆ 很差</option>
        </select>
        <textarea
          className="review-input review-textarea"
          placeholder="分享你的体验..."
          value={reviewContent}
          onChange={(e) => setReviewContent(e.target.value)}
        />
        <button className="submit-review-btn" onClick={handleSubmitReview}>
          提交评价
        </button>
      </div>
    </div>
  );
}

export default InfoPanel;
