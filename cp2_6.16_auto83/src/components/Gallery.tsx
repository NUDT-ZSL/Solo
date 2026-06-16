import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGalleryContext } from '../context/GalleryContext';
import type { Painting } from '../types';

const Gallery: React.FC = () => {
  const { paintings, loading, error } = useGalleryContext();
  const [selectedSeries, setSelectedSeries] = useState<string>('all');
  const [selectedPainting, setSelectedPainting] = useState<Painting | null>(null);
  const [modalIndex, setModalIndex] = useState<number>(0);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  const seriesList = ['all', ...Array.from(new Set(paintings.map(p => p.series)))];

  const filteredPaintings = selectedSeries === 'all'
    ? paintings
    : paintings.filter(p => p.series === selectedSeries);

  const seriesPaintings = selectedPainting
    ? paintings.filter(p => p.series === selectedPainting.series)
    : [];

  const preloadImage = useCallback((src: string) => {
    const img = new Image();
    img.src = src;
  }, []);

  useEffect(() => {
    if (selectedPainting && seriesPaintings.length > 0) {
      const currentIdx = seriesPaintings.findIndex(p => p.id === selectedPainting.id);
      setModalIndex(currentIdx);

      const nextIdx = (currentIdx + 1) % seriesPaintings.length;
      const prevIdx = (currentIdx - 1 + seriesPaintings.length) % seriesPaintings.length;

      preloadImage(seriesPaintings[nextIdx].imageData);
      preloadImage(seriesPaintings[prevIdx].imageData);
    }
  }, [selectedPainting, seriesPaintings, preloadImage]);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-img-id');
            if (id) {
              setLoadedImages(prev => new Set([...prev, id]));
            }
          }
        });
      },
      { rootMargin: '100px' }
    );

    return () => observerRef.current?.disconnect();
  }, [filteredPaintings]);

  useEffect(() => {
    const cards = document.querySelectorAll('.painting-card');
    cards.forEach(card => observerRef.current?.observe(card));
  }, [filteredPaintings, loading]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!selectedPainting || seriesPaintings.length === 0) return;

    if (e.key === 'Escape') {
      setSelectedPainting(null);
    } else if (e.key === 'ArrowLeft') {
      const newIdx = (modalIndex - 1 + seriesPaintings.length) % seriesPaintings.length;
      setSelectedPainting(seriesPaintings[newIdx]);
    } else if (e.key === 'ArrowRight') {
      const newIdx = (modalIndex + 1) % seriesPaintings.length;
      setSelectedPainting(seriesPaintings[newIdx]);
    }
  }, [selectedPainting, modalIndex, seriesPaintings]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handlePrev = () => {
    if (seriesPaintings.length === 0) return;
    const newIdx = (modalIndex - 1 + seriesPaintings.length) % seriesPaintings.length;
    setSelectedPainting(seriesPaintings[newIdx]);
  };

  const handleNext = () => {
    if (seriesPaintings.length === 0) return;
    const newIdx = (modalIndex + 1) % seriesPaintings.length;
    setSelectedPainting(seriesPaintings[newIdx]);
  };

  const handleModalClose = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedPainting(null);
    }
  };

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="gallery-container">
      <div className="series-tags">
        {seriesList.map(series => (
          <button
            key={series}
            className={`series-tag ${selectedSeries === series ? 'active' : ''}`}
            onClick={() => setSelectedSeries(series)}
          >
            {series === 'all' ? '全部' : series}
          </button>
        ))}
      </div>

      <div className="paintings-grid">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-card"></div>
          ))
        ) : (
          filteredPaintings.map(painting => (
            <div
              key={painting.id}
              className="painting-card"
              data-img-id={painting.id}
              onClick={() => setSelectedPainting(painting)}
            >
              {loadedImages.has(painting.id) ? (
                <img
                  src={painting.imageData}
                  alt={painting.title}
                  className="painting-thumbnail"
                />
              ) : (
                <div className="image-placeholder"></div>
              )}
              <div className="painting-info">
                <div className="painting-title">{painting.title}</div>
                <div className="painting-series">{painting.series}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedPainting && (
        <div className="modal-overlay" onClick={handleModalClose}>
          <button
            className="modal-nav nav-prev"
            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
          >
            ‹
          </button>
          <div className="modal-content">
            <img
              src={selectedPainting.imageData}
              alt={selectedPainting.title}
              className="modal-image"
            />
            <div className="modal-details">
              <h2 className="modal-title">{selectedPainting.title}</h2>
              <div className="modal-series">{selectedPainting.series}</div>
              <p className="modal-description">{selectedPainting.description}</p>
            </div>
          </div>
          <button
            className="modal-nav nav-next"
            onClick={(e) => { e.stopPropagation(); handleNext(); }}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
};

export default Gallery;
