import './SkeletonCard.css';

export default function SkeletonCard() {
  return (
    <div className="skeleton-card masonry-item">
      <div className="skeleton-image skeleton-pulse"></div>
      <div className="skeleton-content">
        <div className="skeleton-title skeleton-pulse"></div>
        <div className="skeleton-meta skeleton-pulse"></div>
      </div>
    </div>
  );
}
