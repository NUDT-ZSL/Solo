import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Room, City, Attraction } from '../types';
import { reorderAttractions } from '../utils/roomManager';
import '../styles/FinalItinerary.css';

interface FinalItineraryProps {
  room: Room;
  userId: string;
}

const FinalItinerary: React.FC<FinalItineraryProps> = ({ room }) => {
  const [expandedAttractions, setExpandedAttractions] = useState<Record<string, boolean>>({});
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragCityId, setDragCityId] = useState<string | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);

  const finalCities = room.finalCities || [];

  const toggleAttraction = useCallback((attractionId: string) => {
    setExpandedAttractions((prev) => ({
      ...prev,
      [attractionId]: !prev[attractionId],
    }));
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, index: number, cityId: string) => {
    setDraggedIndex(index);
    setDragCityId(cityId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  }, [dragOverIndex]);

  const handleDragEnd = useCallback(() => {
    if (draggedIndex !== null && dragOverIndex !== null && dragCityId && draggedIndex !== dragOverIndex) {
      const city = finalCities.find((c) => c.id === dragCityId);
      if (city) {
        const newOrder = [...city.attractions];
        const [removed] = newOrder.splice(draggedIndex, 1);
        newOrder.splice(dragOverIndex, 0, removed);
        const attractionIds = newOrder.map((a) => a.id);
        reorderAttractions(city.id, attractionIds);
      }
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDragCityId(null);
  }, [draggedIndex, dragOverIndex, dragCityId, finalCities]);

  const scrollToCard = useCallback((index: number) => {
    if (galleryRef.current) {
      const cards = galleryRef.current.querySelectorAll('.gallery-card');
      if (cards[index]) {
        (cards[index] as HTMLElement).scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center',
        });
      }
    }
    setActiveIndex(index);
  }, []);

  useEffect(() => {
    const gallery = galleryRef.current;
    if (!gallery) return;

    const handleScroll = () => {
      const cards = gallery.querySelectorAll('.gallery-card');
      const centerX = gallery.scrollLeft + gallery.clientWidth / 2;
      let closestIndex = 0;
      let closestDistance = Infinity;

      cards.forEach((card, index) => {
        const cardCenter = (card as HTMLElement).offsetLeft + card.clientWidth / 2;
        const distance = Math.abs(cardCenter - centerX);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      setActiveIndex(closestIndex);
    };

    gallery.addEventListener('scroll', handleScroll, { passive: true });
    return () => gallery.removeEventListener('scroll', handleScroll);
  }, [finalCities.length]);

  if (finalCities.length === 0) {
    return (
      <div className="final-empty">
        <h2>没有城市通过投票</h2>
        <p>下次再和朋友们一起规划吧！</p>
      </div>
    );
  }

  return (
    <div className="final-itinerary">
      <div className="final-header">
        <h2>最终行程清单</h2>
        <p>共 {finalCities.length} 个城市通过投票</p>
      </div>

      <div className="gallery-dots">
        {finalCities.map((city, index) => (
          <button
            key={city.id}
            className={`gallery-dot ${index === activeIndex ? 'active' : ''}`}
            onClick={() => scrollToCard(index)}
            title={city.name}
          />
        ))}
      </div>

      <div className="gallery-container" ref={galleryRef}>
        {finalCities.map((city) => (
          <div key={city.id} className="gallery-card">
            <div
              className="card-background"
              style={{ backgroundImage: `url(${city.image})` }}
            >
              <div className="card-overlay"></div>
            </div>

            <div className="card-content">
              <div className="card-city-name">
                <h3>{city.name}</h3>
                <span className="card-city-name-en">{city.nameEn}</span>
              </div>

              <div className="attractions-list">
                <h4 className="attractions-title">
                  <span className="pin-icon">📍</span>
                  景点清单
                </h4>

                <div className="attractions-items">
                  {city.attractions.map((attraction: Attraction, idx: number) => (
                    <div
                      key={attraction.id}
                      className={`attraction-item ${expandedAttractions[attraction.id] ? 'expanded' : ''} ${draggedIndex === idx && dragCityId === city.id ? 'dragging' : ''} ${dragOverIndex === idx && dragCityId === city.id ? 'drag-over' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx, city.id)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragEnd={handleDragEnd}
                      onClick={() => toggleAttraction(attraction.id)}
                    >
                      <div className="attraction-header" style={{ height: '44px' }}>
                        <span className="attraction-pin">📌</span>
                        <span className="attraction-name">{attraction.name}</span>
                        <span className="attraction-drag-handle">⋮⋮</span>
                      </div>

                      <div className="attraction-detail">
                        {attraction.description && (
                          <p className="attraction-description">{attraction.description}</p>
                        )}
                        {attraction.source && (
                          <a
                            href={attraction.source}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="attraction-source"
                            onClick={(e) => e.stopPropagation()}
                          >
                            查看详情 →
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="gallery-nav">
        <button
          className="nav-btn prev"
          onClick={() => scrollToCard(Math.max(0, activeIndex - 1))}
          disabled={activeIndex === 0}
        >
          ←
        </button>
        <button
          className="nav-btn next"
          onClick={() => scrollToCard(Math.min(finalCities.length - 1, activeIndex + 1))}
          disabled={activeIndex === finalCities.length - 1}
        >
          →
        </button>
      </div>

      <div className="map-section">
        <h3 className="map-title">行程地图</h3>
        <div className="map-container">
          <div className="map-placeholder">
            <div className="map-pins">
              {finalCities.map((city, index) => (
                <div
                  key={city.id}
                  className="map-pin"
                  style={{
                    left: `${15 + (index * 70) / Math.max(finalCities.length - 1, 1)}%`,
                    top: `${30 + (index % 2) * 30}%`,
                  }}
                >
                  <span className="pin-number">{index + 1}</span>
                  <span className="pin-label">{city.name}</span>
                </div>
              ))}
            </div>
            <div className="map-grid"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinalItinerary;
