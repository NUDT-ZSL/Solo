import React from 'react';
import './Skeleton.css';

interface SkeletonProps {
  variant?: 'card' | 'text' | 'circle' | 'rect';
  width?: string | number;
  height?: string | number;
  className?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rect',
  width,
  height,
  className = '',
}) => {
  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`skeleton skeleton-${variant} ${className}`}
      style={style}
    />
  );
};

export const BoxCardSkeleton: React.FC = () => (
  <div className="skeleton-card-wrapper">
    <Skeleton variant="rect" width={80} height={24} className="skeleton-badge" />
    <Skeleton variant="text" width={120} height={28} className="skeleton-title" />
    <Skeleton variant="text" width={80} height={36} className="skeleton-price" />
    <div className="skeleton-veggie-grid">
      {[...Array(9)].map((_, i) => (
        <div key={i} className="skeleton-veggie-item">
          <Skeleton variant="circle" width={40} height={40} />
          <Skeleton variant="text" width={40} height={12} />
        </div>
      ))}
    </div>
    <Skeleton variant="text" width="100%" height={16} />
    <div className="skeleton-tags">
      <Skeleton variant="rect" width={70} height={22} />
      <Skeleton variant="rect" width={80} height={22} />
    </div>
    <Skeleton variant="rect" width="100%" height={40} className="skeleton-btn" />
  </div>
);

export const OrderCardSkeleton: React.FC = () => (
  <div className="skeleton-order-card">
    <div className="skeleton-order-header">
      <Skeleton variant="text" width={120} height={20} />
      <Skeleton variant="text" width={60} height={20} />
    </div>
    <Skeleton variant="text" width="60%" height={16} />
    <Skeleton variant="text" width="40%" height={16} />
  </div>
);

export default Skeleton;
