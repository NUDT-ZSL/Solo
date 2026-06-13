import { useEffect, useState, useCallback } from 'react';
import { Crown, Sparkles, Filter, Grid3x3 } from 'lucide-react';
import AssetCard from './AssetCard';
import SearchBar from './SearchBar';
import { assetApi } from '@/api/client';
import { useStore } from '@/store/useStore';
import type { Asset } from '@shared/types';

export default function MarketplaceView() {
  const { assets, setAssets, loading, setLoading, searchQuery, showToast } = useStore();
  const [featuredAssets, setFeaturedAssets] = useState<Asset[]>([]);

  const fetchAssets = useCallback(async (query?: string) => {
    setLoading(true);
    try {
      const startTime = Date.now();
      const data = await assetApi.getAssets(query);
      const duration = Date.now() - startTime;
      console.log(`Loaded ${data.length} assets in ${duration}ms`);
      setAssets(data);
      
      if (!query) {
        setFeaturedAssets(data.slice(0, 6));
      }
    } catch (error) {
      showToast('加载素材列表失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [setAssets, setLoading, showToast]);

  useEffect(() => {
    fetchAssets(searchQuery);
  }, [searchQuery, fetchAssets]);

  const handleSearch = (query: string) => {
    fetchAssets(query);
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="relative h-[400px] overflow-hidden bg-gradient-to-b from-indigo-950 via-indigo-900 to-slate-900">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent" />
        
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500 rounded-full blur-3xl opacity-30 animate-pulse" />
          <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-purple-500 rounded-full blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-full text-blue-400 text-sm mb-4">
              <Sparkles className="w-4 h-4" />
              发现优质游戏素材
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif }}>
              游戏素材交易平台
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              浏览数千款高质量3D模型、纹理和音效素材，实时预览3D效果，助力你的游戏项目
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <SearchBar onSearch={handleSearch} />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Crown className="w-6 h-6 text-amber-400" />
            <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              全部素材
            </h2>
            <span className="px-2.5 py-0.5 bg-slate-800 rounded-md text-sm text-slate-400">
              {assets.length} 款
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors duration-200">
              <Filter className="w-4 h-4" />
              筛选
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors duration-200">
              <Grid3x3 className="w-4 h-4" />
              视图
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="w-[280px] h-[360px] bg-slate-800 rounded-xl animate-pulse"
            />
          ))}
        </div>
        ) : assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 mb-6 bg-slate-800 rounded-full flex items-center justify-center">
              <Grid3x3 className="w-10 h-10 text-slate-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">暂无匹配素材</h3>
            <p className="text-slate-400">试试其他关键词或清除搜索条件</p>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-6">
            {assets.map((asset) => (
              <AssetCard key={asset._id} asset={asset} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
