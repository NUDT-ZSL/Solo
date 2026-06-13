import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Heart, Tag, User, Clock, Download, ShoppingCart, ArrowLeft,
  Share2, ChevronRight
} from 'lucide-react';
import ModelViewer from './ModelViewer';
import { assetApi } from '@/api/client';
import { useStore } from '@/store/useStore';
import type { Asset } from '@shared/types';
import { CATEGORIES } from '@shared/types';

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toggleFavorite, isFavorited, showToast } = useStore();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);

  const favorited = isFavorited(id || '');

  useEffect(() => {
    const fetchAsset = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await assetApi.getAsset(id);
        setAsset(data);
      } catch (error) {
        showToast('加载素材详情失败', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchAsset();
  }, [id, showToast]);

  const handleFavorite = async () => {
    if (!id) return;
    try {
      const result = await assetApi.toggleFavorite(id);
      toggleFavorite(id, result.favorites, result.isFavorited);
      setAsset((prev) =>
        prev ? { ...prev, favorites: result.favorites, isFavorited: result.isFavorited } : prev
      );
      showToast(
        result.isFavorited ? '已添加收藏' : '已取消收藏',
        result.isFavorited ? 'success' : 'info'
      );
    } catch (error) {
      showToast('操作失败，请重试', 'error');
    }
  };

  const categoryLabel = asset
    ? CATEGORIES.find((c) => c.value === asset.category)?.label || asset.category
    : '';

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-6 w-32 bg-slate-800 rounded mb-8" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 h-[500px] bg-slate-800 rounded-xl" />
              <div className="space-y-4">
                <div className="h-8 w-3/4 bg-slate-800 rounded" />
                <div className="h-4 w-1/2 bg-slate-800 rounded" />
                <div className="h-20 bg-slate-800 rounded" />
                <div className="h-12 bg-slate-800 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="min-h-screen bg-slate-900 pt-20 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">素材不存在</h2>
          <p className="text-slate-400 mb-6">该素材可能已被删除或不存在</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-all duration-200 active:scale-95"
          >
            返回市场
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 hover:text-white transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            返回市场
          </button>
          <ChevronRight className="w-4 h-4" />
          <span className="text-white">{categoryLabel}</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-300 truncate max-w-[200px]">{asset.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="h-[500px] rounded-xl overflow-hidden">
              <ModelViewer
                modelUrl={asset.modelUrl}
                autoRotate={true}
                autoRotateSpeed={5}
                className="h-full"
              />
            </div>

            <div className="mt-6 p-6 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <h3 className="text-lg font-semibold text-white mb-3">素材描述</h3>
              <p className="text-slate-300 leading-relaxed">{asset.description}</p>
            </div>

            <div className="mt-6 p-6 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <h3 className="text-lg font-semibold text-white mb-4">标签</h3>
              <div className="flex flex-wrap gap-2">
                {asset.tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors duration-200 cursor-default"
                  >
                    <Tag className="w-3.5 h-3.5 text-blue-400" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 text-xs font-medium rounded-md border border-blue-500/30">
                  {categoryLabel}
                </span>
              </div>

              <h1 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {asset.name}
              </h1>

              <div className="flex items-center gap-4 text-sm text-slate-400 mb-6">
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  <span>{asset.author}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>{formatDate(asset.createdAt)}</span>
                </div>
              </div>

              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-4xl font-bold text-blue-400" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  ${asset.price}
                </span>
                <span className="text-slate-500 text-sm">USD</span>
              </div>

              <div className="space-y-3">
                <button className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-all duration-200 active:scale-[0.98]">
                  <ShoppingCart className="w-5 h-5" />
                  立即购买
                </button>

                <button
                  onClick={handleFavorite}
                  className={`w-full flex items-center justify-center gap-2 px-6 py-3 font-medium rounded-lg transition-all duration-200 active:scale-[0.98] ${
                    favorited
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 hover:bg-amber-500/30'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${favorited ? 'fill-current' : ''}`} />
                  {favorited ? '已收藏' : '收藏'}
                  <span className="text-sm opacity-75">({asset.favorites})</span>
                </button>
              </div>
            </div>

            <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <h3 className="text-sm font-medium text-slate-400 mb-4">上传者信息</h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-medium text-white">{asset.author}</p>
                  <p className="text-sm text-slate-400">认证创作者</p>
                </div>
              </div>
              <button className="w-full mt-4 py-2 text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200">
                查看作者全部素材
              </button>
            </div>

            <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <h3 className="text-sm font-medium text-slate-400 mb-4">素材信息</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex justify-between">
                  <span className="text-slate-400">格式</span>
                  <span className="text-white">GLB</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-slate-400">分类</span>
                  <span className="text-white">{categoryLabel}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-slate-400">收藏数</span>
                  <span className="text-white">{asset.favorites}</span>
                </li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700/50 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors duration-200">
                <Share2 className="w-4 h-4" />
                分享
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700/50 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors duration-200">
                <Download className="w-4 h-4" />
                预览下载
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
