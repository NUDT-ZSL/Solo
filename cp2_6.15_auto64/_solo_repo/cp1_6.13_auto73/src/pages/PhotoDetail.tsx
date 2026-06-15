import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getPhotoDetail,
  createReview,
  Photo,
  Review,
  getStarColor,
  categoryColors,
  categoryNames
} from '../apiClient';

const PhotoDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const [newMarker, setNewMarker] = useState<{ x: number; y: number } | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  const imageContainerRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const reviewsContainerRef = useRef<HTMLDivElement>(null);

  const loadPhotoDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await getPhotoDetail(id);
      setPhoto(response.photo);
      setReviews(response.reviews);
    } catch (error) {
      console.error('加载作品详情失败:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPhotoDetail();
  }, [loadPhotoDetail]);

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;

    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setNewMarker({ x, y });
    setReviewText('');
    setReviewRating(5);
  };

  const handleImageDoubleClick = () => {
    setIsFullscreen(!isFullscreen);
    setZoomLevel(1);
  };

  const handleSubmitReview = async () => {
    if (!newMarker || !photo || !reviewText.trim()) return;

    setSubmitting(true);
    try {
      const response = await createReview({
        photoId: photo._id,
        content: reviewText.trim(),
        rating: reviewRating,
        markerX: newMarker.x,
        markerY: newMarker.y,
        reviewer: '当前用户',
        reviewerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=current'
      });

      setReviews(prev => [response.review, ...prev]);
      if (response.photo) {
        setPhoto(response.photo);
      }
      setNewMarker(null);
      setReviewText('');
      setReviewRating(5);
    } catch (error) {
      console.error('提交点评失败:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelReview = () => {
    setNewMarker(null);
    setReviewText('');
    setReviewRating(5);
  };

  const StarRatingInput: React.FC<{
    rating: number;
    onChange: (rating: number) => void;
    size?: number;
  }> = ({ rating, onChange, size = 24 }) => {
    const [hoverRating, setHoverRating] = useState(0);

    return (
      <div style={{ display: 'flex', gap: '4px' }}>
        {[1, 2, 3, 4, 5].map(star => (
          <svg
            key={star}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={(hoverRating || rating) >= star ? '#fbbf24' : '#4b5563'}
            style={{ cursor: 'pointer', transition: 'fill 0.2s ease' }}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => onChange(star)}
          >
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
          </svg>
        ))}
      </div>
    );
  };

  const StarDisplay: React.FC<{ rating: number; size?: number }> = ({ rating, size = 16 }) => {
    return (
      <div style={{ display: 'flex', gap: '2px' }}>
        {[0, 1, 2, 3, 4].map(i => (
          <svg
            key={i}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={getStarColor(rating, i)}
          >
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
          </svg>
        ))}
      </div>
    );
  };

  const ReviewCard: React.FC<{ review: Review }> = ({ review }) => {
    const thumbRef = useRef<HTMLDivElement>(null);

    return (
      <div
        className="review-card"
        style={{
          width: '100%',
          borderRadius: 8,
          backgroundColor: '#f3f4f6',
          padding: 16,
          boxSizing: 'border-box',
          display: 'flex',
          gap: 12,
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.boxShadow = 'none';
        }}
      >
        <img
          src={review.reviewerAvatar}
          alt={review.reviewer}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: '1px solid #d1d5db',
            flexShrink: 0
          }}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 14, color: '#1f2937' }}>
              {review.reviewer}
            </span>
            <StarDisplay rating={review.rating} size={14} />
          </div>

          <p
            style={{
              margin: '0 0 12px 0',
              fontSize: 13,
              color: '#374151',
              lineHeight: 1.5,
              wordBreak: 'break-word'
            }}
          >
            {review.content}
          </p>

          <div
            ref={thumbRef}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 120,
              borderRadius: 6,
              overflow: 'hidden',
              border: '1px solid #e5e7eb'
            }}
          >
            {photo && (
              <img
                src={photo.imageBase64}
                alt="缩略图"
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            )}
            <div
              style={{
                position: 'absolute',
                left: `${review.markerX}%`,
                top: `${review.markerY}%`,
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#ef4444',
                transform: 'translate(-50%, -50%)',
                boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.3)'
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div
        style={{
          height: 'calc(100vh - 56px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1f2937',
          color: '#9ca3af'
        }}
      >
        加载中...
      </div>
    );
  }

  if (!photo) {
    return (
      <div
        style={{
          height: 'calc(100vh - 56px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1f2937',
          color: '#9ca3af'
        }}
      >
        作品不存在
      </div>
    );
  }

  const categoryColor = categoryColors[photo.category] || '#ffffff';

  return (
    <div
      style={{
        height: 'calc(100vh - 56px)',
        backgroundColor: '#1f2937',
        color: '#f9fafb',
        display: 'flex',
        padding: 24,
        boxSizing: 'border-box',
        gap: 24
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          maxWidth: 800
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            alignSelf: 'flex-start',
            marginBottom: 12,
            padding: '6px 12px',
            borderRadius: 8,
            border: '1px solid #4b5563',
            backgroundColor: 'transparent',
            color: '#d1d5db',
            fontSize: 13,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.backgroundColor = '#374151';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
          }}
        >
          ← 返回
        </button>

        <div
          ref={imageContainerRef}
          onClick={handleImageClick}
          onDoubleClick={handleImageDoubleClick}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 800,
            maxHeight: 'calc(100vh - 120px)',
            borderRadius: 12,
            overflow: 'hidden',
            cursor: 'crosshair',
            backgroundColor: '#111827',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <img
            src={photo.imageBase64}
            alt={photo.title}
            style={{
              maxWidth: '100%',
              maxHeight: 'calc(100vh - 120px)',
              objectFit: 'contain',
              transform: `scale(${zoomLevel})`,
              transition: 'transform 0.3s ease',
              userSelect: 'none',
              pointerEvents: 'none'
            }}
            draggable={false}
          />

          {reviews.map(review => (
            <div
              key={review._id}
              style={{
                position: 'absolute',
                left: `${review.markerX}%`,
                top: `${review.markerY}%`,
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: '#ef4444',
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                zIndex: 2
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: '#ffffff'
                }}
              />
            </div>
          ))}

          {newMarker && (
            <>
              <div
                style={{
                  position: 'absolute',
                  left: `${newMarker.x}%`,
                  top: `${newMarker.y}%`,
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: '#ef4444',
                  transform: 'translate(-50%, -50%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                  zIndex: 3,
                  animation: 'pulse-marker 1s infinite'
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: '#ffffff'
                  }}
                />
              </div>

              <div
                ref={bubbleRef}
                onClick={e => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  left: `${newMarker.x}%`,
                  top: `${newMarker.y}%`,
                  transform: 'translate(-50%, -110%)',
                  marginTop: -10,
                  width: 280,
                  backgroundColor: '#ffffff',
                  borderRadius: 8,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                  padding: 16,
                  zIndex: 10,
                  animation: 'bubble-in 0.2s ease-out'
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    bottom: -8,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 0,
                    height: 0,
                    borderLeft: '8px solid transparent',
                    borderRight: '8px solid transparent',
                    borderTop: '8px solid #ffffff'
                  }}
                />

                <h4
                  style={{
                    margin: '0 0 12px 0',
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#1f2937'
                  }}
                >
                  添加点评
                </h4>

                <textarea
                  value={reviewText}
                  onChange={e => setReviewText(e.target.value.slice(0, 200))}
                  placeholder="请输入点评内容（最多200字）..."
                  style={{
                    width: '100%',
                    minHeight: 80,
                    padding: 10,
                    borderRadius: 6,
                    border: '1px solid #d1d5db',
                    fontSize: 13,
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = '#8b5cf6';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = '#d1d5db';
                  }}
                />
                <div
                  style={{
                    textAlign: 'right',
                    fontSize: 11,
                    color: reviewText.length >= 200 ? '#ef4444' : '#9ca3af',
                    marginTop: 4,
                    marginBottom: 10
                  }}
                >
                  {reviewText.length}/200
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 12
                  }}
                >
                  <span style={{ fontSize: 13, color: '#6b7280' }}>评分：</span>
                  <StarRatingInput
                    rating={reviewRating}
                    onChange={setReviewRating}
                    size={20}
                  />
                  <span style={{ fontSize: 13, color: '#fbbf24', fontWeight: 600 }}>
                    {reviewRating}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleCancelReview}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid #d1d5db',
                      backgroundColor: '#ffffff',
                      color: '#6b7280',
                      fontSize: 13,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = '#f3f4f6';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = '#ffffff';
                    }}
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSubmitReview}
                    disabled={submitting || !reviewText.trim()}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: 'none',
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      color: '#ffffff',
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: submitting || !reviewText.trim() ? 'not-allowed' : 'pointer',
                      opacity: submitting || !reviewText.trim() ? 0.6 : 1,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {submitting ? '提交中...' : '提交点评'}
                  </button>
                </div>
              </div>
            </>
          )}

          <div
            style={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              display: 'flex',
              gap: 8,
              zIndex: 5
            }}
          >
            <button
              onClick={e => {
                e.stopPropagation();
                setZoomLevel(z => Math.max(0.5, z - 0.25));
              }}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: 'rgba(0,0,0,0.6)',
                border: 'none',
                color: '#ffffff',
                fontSize: 18,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0.8)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0.6)';
              }}
            >
              −
            </button>
            <button
              onClick={e => {
                e.stopPropagation();
                setZoomLevel(z => Math.min(3, z + 0.25));
              }}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: 'rgba(0,0,0,0.6)',
                border: 'none',
                color: '#ffffff',
                fontSize: 18,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0.8)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0.6)';
              }}
            >
              +
            </button>
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16
          }}
        >
          <div>
            <h1
              style={{
                margin: '0 0 8px 0',
                fontSize: 24,
                fontWeight: 700,
                color: '#f9fafb'
              }}
            >
              {photo.title}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <img
                  src={photo.authorAvatar}
                  alt={photo.author}
                  style={{ width: 24, height: 24, borderRadius: '50%' }}
                />
                <span style={{ fontSize: 14, color: '#9ca3af' }}>{photo.author}</span>
              </div>
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: 12,
                  backgroundColor: categoryColor,
                  color: '#1f2937',
                  fontSize: 12,
                  fontWeight: 500
                }}
              >
                {categoryNames[photo.category]}
              </span>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <StarDisplay rating={photo.averageRating} size={18} />
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#fbbf24'
                }}
              >
                {photo.averageRating.toFixed(1)}
              </span>
            </div>
            <span style={{ fontSize: 13, color: '#9ca3af' }}>
              {photo.reviewCount} 条点评
            </span>
          </div>
        </div>

        {photo.description && (
          <p
            style={{
              marginTop: 12,
              fontSize: 14,
              color: '#9ca3af',
              lineHeight: 1.6,
              margin: '12px 0 0 0'
            }}
          >
            {photo.description}
          </p>
        )}
      </div>

      <div
        ref={reviewsContainerRef}
        style={{
          width: 360,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          height: '100%'
        }}
      >
        <h2
          style={{
            margin: '0 0 16px 0',
            fontSize: 18,
            fontWeight: 600,
            color: '#f9fafb'
          }}
        >
          点评 ({reviews.length})
        </h2>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            paddingRight: 4
          }}
        >
          <style>{`
            div::-webkit-scrollbar {
              width: 6px;
            }
            div::-webkit-scrollbar-track {
              background: #374151;
              border-radius: 3px;
            }
            div::-webkit-scrollbar-thumb {
              background: #6b7280;
              border-radius: 3px;
            }
          `}</style>

          {reviews.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '48px 16px',
                color: '#6b7280',
                fontSize: 14
              }}
            >
              暂无点评
              <div style={{ fontSize: 12, marginTop: 8 }}>
                点击图片任意位置添加点评
              </div>
            </div>
          )}

          {reviews.map(review => (
            <ReviewCard key={review._id} review={review} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse-marker {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
          }
        }

        @keyframes bubble-in {
          from {
            opacity: 0;
            transform: translate(-50%, -100%) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -110%) scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default PhotoDetail;
