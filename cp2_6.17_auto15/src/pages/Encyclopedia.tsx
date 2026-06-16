import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassHeader } from '../components/GlassHeader';
import { PlantCard } from '../components/PlantCard';
import { PlantCardSkeleton } from '../components/Skeleton';
import { usePlantList } from '../hooks';
import { Search } from 'lucide-react';

export function Encyclopedia() {
  const { plants, loading, searchPlants } = usePlantList();
  const [keyword, setKeyword] = useState('');
  const navigate = useNavigate();

  const displayPlants = searchPlants(keyword);

  return (
    <div className="min-h-screen pb-20">
      <GlassHeader
        title="树种百科"
        rightContent={
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索树种..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-48 pl-9 pr-3 py-1.5 text-sm rounded-full bg-white/80 border border-gray-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
            />
          </div>
        }
      />
      <div className="max-w-5xl mx-auto px-4 py-6">
        {loading ? (
          <div className="grid gap-5 justify-items-center" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <PlantCardSkeleton key={i} />
            ))}
          </div>
        ) : displayPlants.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500">未找到匹配的树种</p>
          </div>
        ) : (
          <div className="grid gap-5 justify-items-center" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {displayPlants.map((plant) => (
              <PlantCard
                key={plant.id}
                plant={plant}
                onClick={() => navigate(`/encyclopedia/${plant.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
