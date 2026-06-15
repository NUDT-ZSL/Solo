import React from 'react';

export const ToolSkeleton: React.FC = () => {
  const baseClass = 'bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-shimmer bg-[length:200%_100%]';

  return (
    <div className="rounded-xl bg-white overflow-hidden shadow-sm">
      <div className={`w-full h-40 ${baseClass}`} />
      <div className="p-4 space-y-3">
        <div className={`h-5 w-3/4 rounded-lg ${baseClass}`} />
        <div className="space-y-2">
          <div className={`h-4 w-full rounded-lg ${baseClass}`} />
          <div className={`h-4 w-5/6 rounded-lg ${baseClass}`} />
        </div>
        <div className={`h-6 w-16 rounded-lg ${baseClass}`} />
      </div>
    </div>
  );
};

export const ToolSkeletonGrid: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ToolSkeleton key={i} />
      ))}
    </div>
  );
};
