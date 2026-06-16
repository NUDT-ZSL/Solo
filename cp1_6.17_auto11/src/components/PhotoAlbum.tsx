import React, { useState, useRef, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { CheckInRecord } from '../types';
import { generateWaterfallLayout, generateMarkdownLog, formatDate } from '../business/tripEngine';

interface PhotoAlbumProps {
  checkIns: CheckInRecord[];
  tripTitle: string;
}

interface PhotoWithMeta {
  id: string;
  photoUrl: string;
  attractionName: string;
  date: string;
  timestamp: number;
}

type FilterType = 'all' | 'date' | 'attraction';

const PhotoAlbum: React.FC<PhotoAlbumProps> = ({ checkIns, tripTitle }) => {
  const albumRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [columns, setColumns] = useState(3);
  const [isExporting, setIsExporting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterValue, setFilterValue] = useState<string>('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const allPhotos: PhotoWithMeta[] = useMemo(() => {
    return checkIns.flatMap((checkIn) =>
      checkIn.photos.map((photo) => ({
        id: `${checkIn.id}-${photo}`,
        photoUrl: photo,
        attractionName: checkIn.attractionName,
        date: formatDate(checkIn.timestamp),
        timestamp: new Date(checkIn.timestamp).getTime(),
      }))
    );
  }, [checkIns]);

  const availableDates = useMemo(() => {
    const dates = new Set(allPhotos.map((p) => p.date));
    return Array.from(dates).sort();
  }, [allPhotos]);

  const availableAttractions = useMemo(() => {
    const attractions = new Set(allPhotos.map((p) => p.attractionName));
    return Array.from(attractions);
  }, [allPhotos]);

  const filteredPhotos = useMemo(() => {
    if (filterType === 'all' || !filterValue) {
      return allPhotos;
    }
    if (filterType === 'date') {
      return allPhotos.filter((p) => p.date === filterValue);
    }
    if (filterType === 'attraction') {
      return allPhotos.filter((p) => p.attractionName === filterValue);
    }
    return allPhotos;
  }, [allPhotos, filterType, filterValue]);

  const layout = useMemo(
    () => generateWaterfallLayout(filteredPhotos, containerWidth, columns, 12),
    [filteredPhotos, containerWidth, columns]
  );

  useEffect(() => {
    const updateLayout = () => {
      if (albumRef.current) {
        const width = albumRef.current.offsetWidth;
        setContainerWidth(width);

        if (width >= 960) {
          setColumns(3);
        } else if (width >= 600) {
          setColumns(2);
        } else {
          setColumns(1);
        }
      }
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilterDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxOpen) {
        if (e.key === 'Escape') {
          setLightboxOpen(false);
        } else if (e.key === 'ArrowLeft') {
          setCurrentPhotoIndex((prev) =>
            prev > 0 ? prev - 1 : filteredPhotos.length - 1
          );
        } else if (e.key === 'ArrowRight') {
          setCurrentPhotoIndex((prev) =>
            prev < filteredPhotos.length - 1 ? prev + 1 : 0
          );
        }
      }
    };
    if (lightboxOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [lightboxOpen, filteredPhotos.length]);

  const handleDownloadPDF = async () => {
    if (!albumRef.current || filteredPhotos.length === 0) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(albumRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight - 20;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight - 20;
      }

      pdf.save(`${tripTitle}-旅行相册.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportMarkdown = () => {
    const markdown = generateMarkdownLog(tripTitle, checkIns);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tripTitle}-旅行日志.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/share/${tripTitle}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handlePhotoClick = (index: number) => {
    setCurrentPhotoIndex(index);
    setLightboxOpen(true);
  };

  const handlePrevPhoto = () => {
    setCurrentPhotoIndex((prev) =>
      prev > 0 ? prev - 1 : filteredPhotos.length - 1
    );
  };

  const handleNextPhoto = () => {
    setCurrentPhotoIndex((prev) =>
      prev < filteredPhotos.length - 1 ? prev + 1 : 0
    );
  };

  const handleFilterSelect = (type: FilterType, value: string) => {
    setFilterType(type);
    setFilterValue(value);
    setShowFilterDropdown(false);
  };

  const handleResetFilter = () => {
    setFilterType('all');
    setFilterValue('');
    setShowFilterDropdown(false);
  };

  const getCurrentFilterLabel = () => {
    if (filterType === 'all' || !filterValue) {
      return '🔍 筛选';
    }
    if (filterType === 'date') {
      return `📅 ${filterValue}`;
    }
    return `📍 ${filterValue}`;
  };

  if (allPhotos.length === 0) {
    return (
      <div className="photo-album">
        <div className="album-header">
          <h3>🖼️ 旅行相册</h3>
        </div>
        <div className="empty-album">
          <div className="empty-icon">📸</div>
          <p>还没有照片</p>
          <span>打卡后照片会自动生成相册</span>
        </div>
      </div>
    );
  }

  const currentPhoto = filteredPhotos[currentPhotoIndex];

  return (
    <div className="photo-album">
      <div className="album-header">
        <div className="album-title-section">
          <h3>
            🖼️ 旅行相册 ({filteredPhotos.length}
            {filteredPhotos.length !== allPhotos.length && ` / ${allPhotos.length}`}张)
          </h3>

          <div className="album-filter" ref={filterRef}>
            <button
              className={`filter-btn ${filterType !== 'all' ? 'active' : ''}`}
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            >
              {getCurrentFilterLabel()}
              <span className="filter-arrow">{showFilterDropdown ? '▲' : '▼'}</span>
            </button>

            {showFilterDropdown && (
              <div className="filter-dropdown">
                <div
                  className={`filter-option reset`}
                  onClick={handleResetFilter}
                >
                  全部照片
                </div>

                {availableDates.length > 0 && (
                  <>
                    <div className="filter-group-title">按日期</div>
                    {availableDates.map((date) => (
                      <div
                        key={date}
                        className={`filter-option ${filterType === 'date' && filterValue === date ? 'selected' : ''}`}
                        onClick={() => handleFilterSelect('date', date)}
                      >
                        📅 {date}
                      </div>
                    ))}
                  </>
                )}

                {availableAttractions.length > 0 && (
                  <>
                    <div className="filter-group-title">按景点</div>
                    {availableAttractions.map((attr) => (
                      <div
                        key={attr}
                        className={`filter-option ${
                          filterType === 'attraction' && filterValue === attr ? 'selected' : ''
                        }`}
                        onClick={() => handleFilterSelect('attraction', attr)}
                      >
                        📍 {attr}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="album-actions">
          <button
            className={`action-btn share-btn ${copySuccess ? 'success' : ''}`}
            onClick={handleShare}
          >
            {copySuccess ? '✓ 已复制' : '🔗 分享'}
          </button>
          <button className="action-btn" onClick={handleExportMarkdown}>
            📝 导出MD
          </button>
          <button
            className="action-btn primary"
            onClick={handleDownloadPDF}
            disabled={isExporting || filteredPhotos.length === 0}
          >
            {isExporting ? '⏳ 生成中...' : '📄 下载PDF'}
          </button>
        </div>
      </div>

      <div className="album-container" ref={albumRef}>
        {filteredPhotos.length === 0 ? (
          <div className="empty-filter">
            <div className="empty-icon">🔍</div>
            <p>没有符合条件的照片</p>
            <button className="action-btn primary" onClick={handleResetFilter}>
              清除筛选
            </button>
          </div>
        ) : (
          <div
            className="waterfall-layout"
            style={{
              position: 'relative',
              width: '100%',
              height: layout.totalHeight,
            }}
          >
            {layout.items.map((item, index) => (
              <div
                key={item.id}
                className="photo-item"
                onClick={() => handlePhotoClick(index)}
                style={{
                  position: 'absolute',
                  width: item.width,
                  height: item.height,
                  top: item.top,
                  left: item.left,
                  animation: `fadeIn 0.5s ease-out ${index * 0.05}s both`,
                }}
              >
                <img
                  src={item.photoUrl}
                  alt={`${(item as any).attractionName} - ${index + 1}`}
                  className="album-photo"
                  loading="lazy"
                />
                <div className="photo-overlay">
                  <span className="photo-caption">
                    {(item as any).attractionName || ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {lightboxOpen && currentPhoto && (
        <div
          className="lightbox-overlay"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="lightbox-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="lightbox-close"
              onClick={() => setLightboxOpen(false)}
            >
              ×
            </button>

            {filteredPhotos.length > 1 && (
              <>
                <button
                  className="lightbox-nav lightbox-prev"
                  onClick={handlePrevPhoto}
                >
                  ‹
                </button>
                <button
                  className="lightbox-nav lightbox-next"
                  onClick={handleNextPhoto}
                >
                  ›
                </button>
              </>
            )}

            <div className="lightbox-image-wrapper">
              <img
                src={currentPhoto.photoUrl}
                alt={currentPhoto.attractionName}
                className="lightbox-image"
              />
            </div>

            <div className="lightbox-info">
              <div className="lightbox-attraction">
              📍 {currentPhoto.attractionName}
              </div>
              <div className="lightbox-date">📅 {currentPhoto.date}</div>
              <div className="lightbox-counter">
                {currentPhotoIndex + 1} / {filteredPhotos.length}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoAlbum;
