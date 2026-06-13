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
        prev ? { ...prev, favorites: result.favorites, isFavorited: result.isFavorited : prev
      );
      showToast(
        result.isFavorited ? '已添加收藏' : '已取消收藏',
        result.isFavorited ? 'success' : 'info'
      );
    } catch (error) {
      showToast('操作失败，请重试', 'error');
    }
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
    );
  }

  if (!asset) {
    return (
      <div className="min-h-screen bg-slate-900 pt-20 flex items-center justify