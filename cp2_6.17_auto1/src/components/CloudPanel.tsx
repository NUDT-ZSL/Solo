import { useEffect, useMemo, useCallback } from 'react';
import { usePhotoStore } from '@/store/usePhotoStore';
import { filterPhotosByTags, findSimilarPhotos } from '@/modules/TagManager';
import { UploadArea } from './UploadArea';
import { MasonryGrid } from './MasonryGrid';
import { TagFilter } from './TagFilter';
import { PhotoModal } from './PhotoModal';
import { BatchActionBar } from './BatchActionBar';
import { Image as ImageIcon, RefreshCw } from 'lucide-react';
import { generateMockPhotos } from '@/utils/mockData';
import * as dataStore from '@/utils/dataStore';

export function CloudPanel() {
  const {
    photos,
    selectedTags,
    referencePhotoId,
    loadPhotos,
    addPhoto,
    clearPhotoSelection,
  } = usePhotoStore();

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const displayPhotos = useMemo(() => {
    if (referencePhotoId) {
      return findSimilarPhotos(photos, referencePhotoId);
    }
    return filterPhotosByTags(photos, selectedTags);
  }, [photos, selectedTags, referencePhotoId]);

  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      clearPhotoSelection();
    }
  }, [clearPhotoSelection]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      clearPhotoSelection();
    }
  }, [clearPhotoSelection]);

  const regenerateMockData = () => {
    const newPhotos = generateMockPhotos(50);
    dataStore.savePhotos(newPhotos);
    newPhotos.forEach(photo => addPhoto(photo));
  };

  return (
    <div
      className="flex flex-col md:flex-row h-full min-h-screen bg-[#f8fafc]"
      onClick={handleBackgroundClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="hidden md:block p-4 md:p-6">
        <TagFilter />
      </div>

      <div className="md:hidden p-4 border-b border-[#e2e8f0]">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-[#1e293b]">标签筛选</h2>
          <button
            onClick={regenerateMockData}
            className="text-xs text-[#4338ca] hover:text-[#3730a3] transition-colors flex items-center gap-1"
          >
            <RefreshCw size={12} />
            重新生成
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {Array.from(new Set(photos.flatMap(p => p.tags))).map(tag => (
            <button
              key={tag}
              onClick={() => usePhotoStore.getState().toggleTag(tag)}
              className={
                'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ' +
                (selectedTags.includes(tag)
                  ? 'bg-[#4338ca] text-white'
                  : 'bg-[#e0e7ff] text-[#4338ca]')
              }
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4 md:p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#4338ca] flex items-center justify-center">
              <ImageIcon size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#1e293b]">云端相册</h1>
              <p className="text-sm text-gray-500">
                匹配 <span className="font-semibold text-[#4338ca]">{displayPhotos.length}</span>
                <span className="text-gray-400">/{photos.length}</span> 张照片
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={regenerateMockData}
              className="px-3 py-1.5 text-sm text-[#4338ca] hover:bg-[#e0e7ff] rounded-lg transition-colors flex items-center gap-1.5"
            >
              <RefreshCw size={14} />
              重新生成数据
            </button>
          </div>
        </div>

        <UploadArea />

        {referencePhotoId && (
          <div className="mb-4 p-3 bg-[#e0e7ff] rounded-lg flex items-center justify-between">
            <p className="text-sm text-[#4338ca]">
              正在显示与参考照片相似的照片（按共同标签数量排序）
            </p>
            <button
              onClick={() => usePhotoStore.getState().setReferencePhoto(null)}
              className="text-xs text-[#4338ca] hover:text-[#3730a3] font-medium"
            >
              取消
            </button>
          </div>
        )}

        <div className="text-xs text-gray-400 mb-3 flex items-center gap-4">
          <span>提示：按住 Ctrl 键点击照片可多选</span>
          <span>按 Esc 键取消选择</span>
        </div>

        {displayPhotos.length > 0 ? (
          <MasonryGrid photos={displayPhotos} />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <ImageIcon size={64} className="mb-4 opacity-30" />
            <p className="text-lg font-medium">没有找到匹配的照片</p>
            <p className="text-sm mt-1">请尝试调整筛选条件或上传新照片</p>
          </div>
        )}
      </div>

      <PhotoModal />
      <BatchActionBar />
    </div>
  );
}
