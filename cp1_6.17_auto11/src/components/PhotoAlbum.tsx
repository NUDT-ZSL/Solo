import React, { useState, useRef, useEffect } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { CheckInRecord } from '../types';
import { generateWaterfallLayout, generateMarkdownLog } from '../business/tripEngine';

interface PhotoAlbumProps {
  checkIns: CheckInRecord[];
  tripTitle: string;
}

const PhotoAlbum: React.FC<PhotoAlbumProps> = ({ checkIns, tripTitle }) => {
  const albumRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [columns, setColumns] = useState(3);
  const [isExporting, setIsExporting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const allPhotos = checkIns.flatMap((checkIn) =>
    checkIn.photos.map((photo) => ({
      id: `${checkIn.id}-${photo}`,
      photoUrl: photo,
      attractionName: checkIn.attractionName,
    }))
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

  const layout = generateWaterfallLayout(allPhotos, containerWidth, columns, 12);

  const handleDownloadPDF = async () => {
    if (!albumRef.current || allPhotos.length === 0) return;

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

  return (
    <div className="photo-album">
      <div className="album-header">
        <h3>🖼️ 旅行相册 ({allPhotos.length}张)</h3>
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
            disabled={isExporting}
          >
            {isExporting ? '⏳ 生成中...' : '📄 下载PDF'}
          </button>
        </div>
      </div>

      <div className="album-container" ref={albumRef}>
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
                alt={`Photo ${index + 1}`}
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
      </div>
    </div>
  );
};

export default PhotoAlbum;
