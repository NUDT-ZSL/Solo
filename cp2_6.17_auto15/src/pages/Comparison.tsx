import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GlassHeader } from '../components/GlassHeader';
import { Skeleton } from '../components/Skeleton';
import { usePlantList } from '../hooks';
import { ComparisonLabels, type ComparisonCategory } from '../types';
import { Plus, X } from 'lucide-react';

export function Comparison() {
  const [searchParams] = useSearchParams();
  const initialIds = searchParams.get('ids')?.split(',').filter(Boolean) || [];
  const { plants, loading } = usePlantList();
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<string[]>(initialIds);
  const [showPicker, setShowPicker] = useState(false);
  const [imgLoaded, setImgLoaded] = useState<Record<string, boolean>>({});

  const selectedPlants = useMemo(
    () => selectedIds.map((id) => plants.find((p) => p.id === id)).filter(Boolean),
    [selectedIds, plants]
  );

  const categories: ComparisonCategory[] = ['leafShape', 'leafMargin', 'leafVein', 'fruit'];

  const togglePlant = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen pb-20">
        <GlassHeader title="树种对比" onBack={() => navigate(-1)} />
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="w-full aspect-square rounded-xl" />
                <Skeleton className="w-full aspect-square rounded-xl" />
                <Skeleton className="w-full aspect-square rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <GlassHeader
        title="树种对比"
        onBack={() => navigate(-1)}
        rightContent={
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-white text-sm font-medium hover:bg-secondary transition-colors"
          >
            <Plus size={14} />
            选择树种 ({selectedIds.length}/3)
          </button>
        }
      />

      {showPicker && (
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-text-primary">选择要对比的树种（最多3种）</p>
              <button
                onClick={() => setShowPicker(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              {plants.map((p) => {
                const isSelected = selectedIds.includes(p.id);
                const disabled = !isSelected && selectedIds.length >= 3;
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePlant(p.id)}
                    disabled={disabled}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-primary text-white'
                        : disabled
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-100 text-text-primary hover:bg-primary/10'
                    }`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-6">
        {selectedPlants.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 mb-4">请选择要对比的树种</p>
            <button
              onClick={() => setShowPicker(true)}
              className="px-6 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-secondary transition-colors flex items-center gap-2 mx-auto"
            >
              <Plus size={16} />
              选择树种
            </button>
          </div>
        ) : (
          <div>
            <div
              className="grid gap-4 mb-6"
              style={{ gridTemplateColumns: `repeat(${selectedPlants.length}, minmax(0, 1fr))` }}
            >
              {selectedPlants.map((plant) => (
                <div
                  key={plant!.id}
                  className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.10)] text-center"
                >
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full overflow-hidden bg-skeleton">
                    <img
                      src={plant!.leafImage}
                      alt={plant!.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="text-base font-semibold text-text-primary">{plant!.name}</h3>
                  <p className="text-xs italic text-gray-500 mt-0.5">{plant!.scientificName}</p>
                </div>
              ))}
            </div>

            <div className="space-y-6">
              {categories.map((cat) => {
                const label = ComparisonLabels[cat];
                return (
                  <div key={cat} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-white text-xs font-medium rounded px-2 py-0.5"
                        style={{
                          backgroundColor: label.color,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                        }}
                      >
                        {label.label}
                      </span>
                    </div>
                    <div
                      className="grid gap-4"
                      style={{ gridTemplateColumns: `repeat(${selectedPlants.length}, minmax(0, 1fr))` }}
                    >
                      {selectedPlants.map((plant) => {
                        const key = `${plant!.id}-${cat}`;
                        return (
                          <div
                            key={plant!.id + cat}
                            className="group relative rounded-2xl overflow-hidden bg-white shadow-[0_2px_12px_rgba(0,0,0,0.10)] transition-transform duration-200 hover:scale-[1.05]"
                            style={{ cursor: 'zoom-in' }}
                          >
                            {!imgLoaded[key] && <Skeleton className="w-full aspect-square rounded-none" rounded="" />}
                            <img
                              src={plant!.comparison[cat]}
                              alt={`${plant!.name}-${label.label}`}
                              onLoad={() => setImgLoaded((m) => ({ ...m, [key]: true }))}
                              className={`w-full aspect-square object-cover transition-opacity duration-300 ${
                                imgLoaded[key] ? 'opacity-100' : 'opacity-0 absolute inset-0'
                              }`}
                            />
                            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
                              <p className="text-white text-sm font-medium">{plant!.name}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
