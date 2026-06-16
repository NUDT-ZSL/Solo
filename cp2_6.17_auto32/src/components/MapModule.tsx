import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import useApi, { TourStop, StopReview, ReviewSummary, ReviewItem } from '../hooks/useApi';
import './MapModule.css';

const createCustomIcon = (status: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div class="marker-dot ${status === '已演出' ? 'done' : 'planned'}"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

const MapController: React.FC<{ stops: TourStop[] }> = ({ stops }) => {
  const map = useMap();
  
  useEffect(() => {
    if (stops.length > 0) {
      const bounds = L.latLngBounds(stops.map(s => [s.lat, s.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [stops, map]);
  
  return null;
};

const StarRating: React.FC<{ rating: number; size?: number }> = ({ rating, size = 14 }) => {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  
  return (
    <span className="star-rating" style={{ fontSize: `${size}px` }}>
      {[1, 2, 3, 4, 5].map(i => {
        let className = 'star';
        if (i <= fullStars) className += ' star-full';
        else if (i === fullStars + 1 && hasHalf) className += ' star-half';
        else className += ' star-empty';
        return (
          <span key={i} className={className}>★</span>
        );
      })}
    </span>
  );
};

const EMPTY_SUMMARY: ReviewSummary = {
  averageRating: 0,
  totalReviews: 0,
  recentReviews: []
};

const MapModule: React.FC = () => {
  const { getStops, getReviews } = useApi();
  const [stops, setStops] = useState<TourStop[]>([]);
  const [reviewsMap, setReviewsMap] = useState<Record<string, StopReview>>({});
  const [loading, setLoading] = useState(true);
  const [selectedStop, setSelectedStop] = useState<TourStop | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [stopsData, reviewsData] = await Promise.all([
          getStops(),
          getReviews()
        ]);
        setStops(stopsData);
        if (reviewsData && typeof reviewsData === 'object' && !('averageRating' in reviewsData)) {
          setReviewsMap(reviewsData as Record<string, StopReview>);
        }
      } catch (err) {
        console.error('加载数据失败', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedStop) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedStop(null);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setSelectedStop(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
      document.body.style.overflow = '';
    };
  }, [selectedStop]);

  const getReviewSummary = useCallback((stopId: string): ReviewSummary => {
    const stopReview = reviewsMap[stopId];

    if (!stopReview || !stopReview.reviews || stopReview.reviews.length === 0) {
      return EMPTY_SUMMARY;
    }

    const recentReviews = [...stopReview.reviews]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);

    return {
      averageRating: stopReview.averageRating || 0,
      totalReviews: stopReview.reviews.length,
      recentReviews
    };
  }, [reviewsMap]);

  const routePositions = stops
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(stop => [stop.lat, stop.lng] as [number, number]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="map-module">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="map-module">
      <div className="module-header">
        <h2>巡演地图</h2>
        <div className="legend">
          <span className="legend-item">
            <span className="legend-dot done"></span> 已演出
          </span>
          <span className="legend-item">
            <span className="legend-dot planned"></span> 计划中
          </span>
        </div>
      </div>

      <div className="map-container">
        <MapContainer
          center={[35.8617, 104.1954]}
          zoom={4}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapController stops={stops} />
          
          {routePositions.length > 1 && (
            <Polyline
              positions={routePositions}
              pathOptions={{
                color: '#e94560',
                weight: 2,
                opacity: 0.6,
                dashArray: '10, 10'
              }}
            />
          )}

          {stops.map(stop => {
            const reviewSummary = getReviewSummary(stop.id);
            return (
              <Marker
                key={stop.id}
                position={[stop.lat, stop.lng]}
                icon={createCustomIcon(stop.status)}
                eventHandlers={{
                  click: () => setSelectedStop(stop)
                }}
              >
                <Popup>
                  <div className="popup-content">
                    <h4>{stop.city}</h4>
                    <p><strong>剧目：</strong>{stop.playName}</p>
                    <p><strong>时间：</strong>{formatDate(stop.date)}</p>
                    <p><strong>场馆：</strong>{stop.venue}</p>
                    <p><strong>状态：</strong>
                      <span className={`status-tag ${stop.status === '已演出' ? 'done' : 'planned'}`}>
                        {stop.status}
                      </span>
                    </p>
                    {stop.status === '已演出' && (
                      <p><strong>票房：</strong>¥{stop.boxOffice.toLocaleString()}</p>
                    )}
                    {stop.status === '已演出' && reviewSummary.totalReviews > 0 && (
                      <div className="popup-rating">
                        <strong>评分：</strong>
                        <StarRating rating={reviewSummary.averageRating} />
                        <span className="popup-rating-score">{reviewSummary.averageRating.toFixed(1)}</span>
                      </div>
                    )}
                    {stop.status === '已演出' && reviewSummary.totalReviews === 0 && (
                      <div className="popup-rating">
                        <strong>评分：</strong>
                        <span className="popup-no-rating">暂无评价</span>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {selectedStop && (
        <div className="stop-detail-modal">
          <div className="stop-detail-card" ref={cardRef}>
            <button 
              className="close-btn" 
              onClick={() => setSelectedStop(null)}
              title="关闭"
            >
              ×
            </button>
            <h3>{selectedStop.city}站</h3>
            <div className="detail-row">
              <span className="label">演出剧目</span>
              <span className="value">{selectedStop.playName}</span>
            </div>
            <div className="detail-row">
              <span className="label">演出时间</span>
              <span className="value">{formatDate(selectedStop.date)}</span>
            </div>
            <div className="detail-row">
              <span className="label">演出场馆</span>
              <span className="value">{selectedStop.venue}</span>
            </div>
            <div className="detail-row">
              <span className="label">演出状态</span>
              <span className={`status-tag ${selectedStop.status === '已演出' ? 'done' : 'planned'}`}>
                {selectedStop.status}
              </span>
            </div>
            {selectedStop.status === '已演出' && (
              <div className="detail-row highlight">
                <span className="label">票房收入</span>
                <span className="value">¥{selectedStop.boxOffice.toLocaleString()}</span>
              </div>
            )}

            <div className="review-section">
              <div className="review-header">
                <h4>观众评价</h4>
                {(() => {
                  const summary = getReviewSummary(selectedStop.id);
                  if (summary.totalReviews === 0) {
                    return <span className="no-review">暂无评价</span>;
                  }
                  return (
                    <div className="rating-summary">
                      <StarRating rating={summary.averageRating} size={16} />
                      <span className="rating-score">{summary.averageRating.toFixed(1)}</span>
                      <span className="rating-count">({summary.totalReviews}条评价)</span>
                    </div>
                  );
                })()}
              </div>
              {(() => {
                const summary = getReviewSummary(selectedStop.id);
                if (summary.totalReviews === 0) {
                  return (
                    <div className="review-empty">
                      <span className="review-empty-icon">💬</span>
                      <p>该站点暂无观众评价</p>
                    </div>
                  );
                }
                return (
                  <div className="review-list">
                    {summary.recentReviews.map((review, index) => (
                      <div key={index} className="review-item">
                        <div className="review-top">
                          <span className="reviewer-name">{review.customerName}</span>
                          <StarRating rating={review.rating} size={12} />
                        </div>
                        <p className="review-comment">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapModule;
