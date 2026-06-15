import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package, Plus, Edit2, Trash2, Eye,
  MoreHorizontal, Search
} from 'lucide-react';
import { assetApi } from '@/api/client';
import { useStore } from '@/store/useStore';
import type { Asset } from '@shared/types';
import { CATEGORIES } from '@shared/types';

export default function ManagePage() {
  const navigate = useNavigate();
  const { showToast, currentUserId } = useStore();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAssets();
  }, [currentUserId]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const data = await assetApi.getAssets(searchQuery, 'author-1');
      setAssets(data);
    } catch (error) {
      showToast('加载素材列表失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个素材吗？此操作不可撤销。')) {
      return;
    }
    
    setDeletingId(id);
    try {
      await assetApi.deleteAsset(id);
      setAssets((prev) => prev.filter((a) => a._id !== id));
      showToast('素材已删除', 'success');
    } catch (error) {
      showToast('删除失败，请重试', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const getCategoryLabel = (category: string) => {
    return CATEGORIES.find((c) => c.value === category)?.label || category;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <Package className="w-7 h-7 text-blue-400" />
              素材管理
            </h1>
            <p className="text-slate-400 mt-1">
              管理你已发布的所有素材
            </p>
          </div>
          
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-all duration-200 active:scale-[0.98]"
          >
            <Plus className="w-5 h-5" />
            上传新素材
          </Link>
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchAssets()}
              placeholder="搜索你的素材..."
              className="w-full pl-11 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
            />
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-400">加载中...</p>
            </div>
          ) : assets.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-20 h-20 mx-auto mb-5 bg-slate-700/50 rounded-full flex items-center justify-center">
                <Package className="w-10 h-10 text-slate-600" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">暂无素材</h3>
              <p className="text-slate-400 mb-6">上传你的第一个素材开始交易吧</p>
              <Link
                to="/upload"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-all duration-200 active:scale-[0.98]"
              >
                <Plus className="w-5 h-5" />
                上传素材
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      素材
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      分类
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      价格
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      收藏
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      发布时间
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {assets.map((asset) => (
                    <tr key={asset._id} className="hover:bg-slate-700/20 transition-colors duration-150">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={asset.thumbnailUrl}
                            alt={asset.name}
                            className="w-12 h-12 rounded-lg object-cover bg-slate-700"
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-white truncate max-w-xs">
                              {asset.name}
                            </p>
                            <p className="text-xs text-slate-400 truncate max-w-xs">
                              {asset.tags.slice(0, 3).join(', ')}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 text-xs font-medium rounded-md">
                          {getCategoryLabel(asset.category)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white font-medium">${asset.price}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-300">{asset.favorites}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-400 text-sm">
                          {formatDate(asset.createdAt)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/asset/${asset._id}`)}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors duration-200"
                            title="预览"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors duration-200"
                            title="编辑"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(asset._id)}
                            disabled={deletingId === asset._id}
                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors duration-200 disabled:opacity-50"
                            title="删除"
                          >
                            {deletingId === asset._id ? (
                              <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {assets.length > 0 && (
          <div className="mt-4 text-center text-sm text-slate-500">
            共 {assets.length} 个素材
          </div>
        )}
      </div>
    </div>
  );
}
