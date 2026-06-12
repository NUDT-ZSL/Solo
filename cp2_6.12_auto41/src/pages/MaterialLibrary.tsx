import { useContext, useEffect } from 'react';
import { FilterContext } from '@/App';
import { useStore } from '@/store';
import useDebounce from '@/hooks/useDebounce';
import MaterialCard from '@/components/MaterialCard';

export default function MaterialLibrary() {
  const { keyword, selectedTag } = useContext(FilterContext);
  const debouncedKeyword = useDebounce(keyword, 300);
  const {
    materials,
    loading,
    page,
    hasMore,
    setKeyword,
    setSelectedTag,
    setPage,
    loadMoreMaterials,
  } = useStore();

  useEffect(() => {
    setKeyword(debouncedKeyword);
  }, [debouncedKeyword, setKeyword]);

  useEffect(() => {
    setSelectedTag(selectedTag);
  }, [selectedTag, setSelectedTag]);

  useEffect(() => {
    setPage(1);
    loadMoreMaterials(true);
  }, [debouncedKeyword, selectedTag]);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 100
      ) {
        if (!loading && hasMore) {
          loadMoreMaterials();
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, hasMore, loadMoreMaterials]);

  return (
    <div className="pt-20 px-4 pb-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 font-display">
          素材库
        </h1>

        {materials.length === 0 && !loading ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg">暂无素材，点击右上角上传按钮添加素材</p>
          </div>
        ) : (
          <div className="material-grid">
            {materials.map((material, index) => (
              <div key={material.id} className="material-card">
                <MaterialCard material={material} index={index} />
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <div className="inline-block w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-2 text-gray-500">加载中...</p>
          </div>
        )}

        {!hasMore && materials.length > 0 && (
          <div className="text-center py-8 text-gray-400">
            已经到底啦 ~
          </div>
        )}
      </div>
    </div>
  );
}
