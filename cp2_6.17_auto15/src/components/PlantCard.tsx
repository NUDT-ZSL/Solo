import React, { useState } from 'react';
import type { PlantDetail } from '../types';
import { Skeleton } from './Skeleton';

interface PlantCardProps {
  plant: PlantDetail;
  onClick?: () => void;
  showBadge?: boolean;
  className?: string;
}

export function PlantCard({ plant, onClick, showBadge = false, className = '' }: PlantCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [showBadgeAnim, setShowBadgeAnim] = useState(true);

  React.useEffect(() => {
    if (showBadge) {
      const timer = setTimeout(() => setShowBadgeAnim(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [showBadge]);

  return (
    <div
      onClick={onClick}
      className={`group w-[220px] h-[320px] bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.10)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.15)] overflow-hidden cursor-pointer relative transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 ${className}`}
      style={showBadge && showBadgeAnim ? { animation: 'slide-in-right 0.4s ease-out' } : undefined}
    >
      {showBadge && (
        <div
          className="absolute top-2 left-2 z-10 px-[6px] py-[2px] rounded-[3px] text-white text-[10px] font-medium"
          style={{
            backgroundColor: '#f97316',
            opacity: showBadgeAnim ? 1 : 0,
            transition: 'opacity 0.5s ease-in',
          }}
        >
          新
        </div>
      )}
      <div className="w-full aspect-[3/2] bg-skeleton relative overflow-hidden">
        {!imgLoaded && <Skeleton className="w-full h-full" rounded="" />}
        <img
          src={plant.leafImage}
          alt={plant.name}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          className={`w-full h-full object-cover origin-center transition-transform duration-300 ease-out transition-opacity duration-300 ${imgLoaded ? 'opacity-100 group-hover:scale-105' : 'opacity-0 absolute inset-0'}`}
        />
      </div>
      <div className="p-4 flex flex-col gap-1.5 relative">
        <h3 className="text-base font-semibold text-text-primary truncate">{plant.name}</h3>
        <p className="text-sm italic text-gray-500 truncate">{plant.scientificName}</p>
        <span
          className="absolute right-4 bottom-4 text-[12px] font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out"
          style={{ color: '#4ade80' }}
          aria-hidden={false}
        >
          查看详情 →
        </span>
      </div>
    </div>
  );
}
