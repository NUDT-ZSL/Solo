import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  rounded?: string;
  className?: string;
}

export function Skeleton({ width, height, rounded = 'rounded-lg', className = '' }: SkeletonProps) {
  return (
    <div
      className={`skeleton-shimmer ${rounded} ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width ?? '100%',
        height: typeof height === 'number' ? `${height}px` : height ?? '100%',
      }}
    />
  );
}

export function PlantCardSkeleton() {
  return (
    <div className="w-[220px] h-[320px] bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.10)] overflow-hidden">
      <div className="w-full aspect-[3/2] p-3">
        <Skeleton className="w-full h-full rounded-md" />
      </div>
      <div className="p-4 space-y-3">
        <Skeleton width="60%" height={20} rounded="rounded" />
        <Skeleton width="80%" height={16} rounded="rounded" />
      </div>
    </div>
  );
}
