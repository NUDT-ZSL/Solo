import React, { useState, useEffect, useCallback } from 'react';
import { User, Heart } from 'lucide-react';
import type { ClothingItem, RecommendResult } from './types';
import { UploadPanel } from './components/UploadPanel';
import { CardGallery } from './components/CardGallery';
import { DetailPage } from './components/DetailPage';
import { RecommendPage } from './components/RecommendPage';
import { FavoritesDrawer } from './components/FavoritesDrawer';
import { generateRecommendations } from './logic/recommendEngine';
import axios from 'axios';

type PageType = 'home' | 'detail' | 'recommend';

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ClothingItem | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendResult[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadItems = async () => {
      try {
        const response = await axios.get<ClothingItem[]>('/api/items');
        setItems(response.data);
      } catch (e) {
        console.error('Failed to load items:', e);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    loadItems();
  }, []);

  const handleItemClick = useCallback((item: ClothingItem) => {
    setSelectedItem(item);
    setCurrentPage('detail');
    setShowUserMenu(false);
  }, []);

  const handleUploadComplete = useCallback((item: ClothingItem) => {
    setSelectedItem(item);
    setCurrentPage('detail');
    setShowUserMenu(false);
  }, []);

  const handleGenerateRecommend = useCallback((item: ClothingItem) => {
    const allItems = items.length > 0 ? items : [];
    const recs = generateRecommendations(item, allItems);
    setRecommendations(recs);
    setSelectedItem(item);
    setCurrentPage('recommend');
  }, [items]);

  const handleBackToHome = useCallback(() => {
    setCurrentPage('home');
    setSelectedItem(null);
    setRecommendations([]);
  }, []);

  const handleBackToDetail = useCallback(() => {
    setCurrentPage('detail');
    setRecommendations([]);
  }, []);

  const handleLogoClick = useCallback(() => {
    setCurrentPage('home');
    setSelectedItem(null);
    setRecommendations([]);
    setShowUserMenu(false);
  }, []);

  const handleToggleFavorites = useCallback(() => {
    setShowFavorites((prev) => !prev);
    setShowUserMenu(false);
  }, []);

  const handleUserMenuClick = useCallback(() => {
    setShowUserMenu((prev) => !prev);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.user-menu')) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="app-header">
        <div className="app-logo" onClick={handleLogoClick}>
          穿搭推荐
        </div>
        <div className="user-menu">
          <button
            className="avatar-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleUserMenuClick();
            }}
          >
            <User size={20} />
          </button>
          {showUserMenu && (
            <div className="dropdown-menu">
              <button className="dropdown-item" onClick={handleToggleFavorites}>
                <Heart size={16} />
                我的收藏
              </button>
            </div>
          )}
        </div>
      </header>

      <main style={{ flex: 1 }}>
        {loading ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '60vh',
            color: '#7F8C8D',
            fontSize: 18,
          }}>
            加载中...
          </div>
        ) : (
          <>
            {currentPage === 'home' && (
              <div className="home-container">
                <div style={{ textAlign: 'center' }}>
                  <h1 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 42,
                    marginBottom: 8,
                    color: 'var(--color-text)',
                  }}>
                    古着穿搭推荐
                  </h1>
                  <p style={{
                    color: 'var(--color-text-light)',
                    fontSize: 16,
                    maxWidth: 480,
                    margin: '0 auto',
                  }}>
                    上传你的衣物照片或选择精选单品，获取专业的穿搭风格建议
                  </p>
                </div>
                <UploadPanel onUploadComplete={handleUploadComplete} />
                <CardGallery items={items} onItemClick={handleItemClick} />
              </div>
            )}

            {currentPage === 'detail' && selectedItem && (
              <DetailPage
                item={selectedItem}
                allItems={items}
                onBack={handleBackToHome}
                onGenerateRecommend={handleGenerateRecommend}
              />
            )}

            {currentPage === 'recommend' && selectedItem && (
              <RecommendPage
                recommendations={recommendations}
                sourceItemName={selectedItem.name}
                onBack={handleBackToDetail}
              />
            )}
          </>
        )}
      </main>

      <FavoritesDrawer
        isOpen={showFavorites}
        onClose={() => setShowFavorites(false)}
      />
    </div>
  );
}

export default App;
