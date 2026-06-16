import React, { useState, useEffect } from 'react';
import BoxCard from '../components/BoxCard';
import { BoxCardSkeleton } from '../components/Skeleton';
import { boxesAPI } from '../utils/api';
import type { Box } from '../types';
import './Home.css';

const Home: React.FC = () => {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    const fetchBoxes = async () => {
      try {
        const res = await boxesAPI.getAll(true);
        setBoxes(res.data);
      } catch (error) {
        console.error('Failed to fetch boxes:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBoxes();
  }, []);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('farm_favorites') || '[]');
    setFavorites(stored);
  }, [showFavoritesOnly]);

  const displayedBoxes = showFavoritesOnly
    ? boxes.filter((b) => favorites.includes(b.id))
    : boxes;

  const getComparisonData = () => {
    const sortedBoxes = [...boxes].sort((a, b) => a.sortOrder - b.sortOrder);
    return sortedBoxes.map((box) => ({
      id: box.id,
      name: box.name,
      size: box.size,
      price: box.price,
      veggieCount: box.veggies.length,
      swapCount: box.swapOptions.length,
      hasSwap: box.swapOptions.length > 0,
      weekly: true,
      biweekly: true,
    }));
  };

  const sizeLabel = {
    small: '小箱',
    medium: '中箱',
    large: '大箱',
  };

  return (
    <div className="home-page">
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="highlight">新鲜直达</span>的农场蔬菜
          </h1>
          <p className="hero-subtitle">
            来自阳光农场的当季鲜蔬，每周精选配送，为您的餐桌增添健康与美味
          </p>
          <div className="hero-features">
            <div className="feature-item">
              <span className="feature-icon">🌱</span>
              <span>有机种植</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🚚</span>
              <span>当日配送</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">💚</span>
              <span>品质保证</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="section-header">
          <div className="section-title-row">
            <div>
              <h2>选择您的蔬菜箱</h2>
              <p>三种规格，满足不同家庭需求</p>
            </div>
            <button
              className={`filter-toggle ${showFavoritesOnly ? 'active' : ''}`}
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            >
              <span className="toggle-icon">{showFavoritesOnly ? '❤️' : '🤍'}</span>
              <span>我的收藏 ({favorites.length})</span>
            </button>
          </div>
        </div>

        {displayedBoxes.length > 0 ? (
          <div className="boxes-grid">
            {loading
              ? [...Array(3)].map((_, i) => <BoxCardSkeleton key={i} />)
              : displayedBoxes.map((box) => (
                  <BoxCard key={box.id} box={box} allBoxes={boxes} />
                ))}
          </div>
        ) : (
          <div className="empty-favorites">
            <span className="empty-icon">💝</span>
            <h3>还没有收藏哦</h3>
            <p>点击卡片右上角的爱心按钮收藏您喜欢的箱型</p>
            <button
              className="btn btn-outline"
              onClick={() => setShowFavoritesOnly(false)}
            >
              查看全部蔬菜箱
            </button>
          </div>
        )}

        {!showFavoritesOnly && boxes.length > 0 && (
          <div className="comparison-section">
            <div className="section-header">
              <h2>规格对比</h2>
              <p>一目了然，选择最适合您的蔬菜箱</p>
            </div>

            <div className="comparison-table">
              <table>
                <thead>
                  <tr>
                    <th className="feature-col">对比项</th>
                    {getComparisonData().map((item) => (
                      <th key={item.id} className={`box-col size-${item.size}`}>
                        <span className="col-size-badge">{sizeLabel[item.size]}</span>
                        <span className="col-name">{item.name}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="feature-cell">
                      <span className="feature-icon-col">💰</span>
                      <span>价格</span>
                    </td>
                    {getComparisonData().map((item) => (
                      <td key={item.id} className="highlight-cell">
                        <span className="price-compare">
                          <span className="cur">¥</span>
                          <span className="num">{item.price}</span>
                          <span className="suf">/箱</span>
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="feature-cell">
                      <span className="feature-icon-col">🥗</span>
                      <span>蔬菜种类</span>
                    </td>
                    {getComparisonData().map((item) => (
                      <td key={item.id}>
                        <strong>{item.veggieCount}</strong> 种
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="feature-cell">
                      <span className="feature-icon-col">🔄</span>
                      <span>蔬菜替换</span>
                    </td>
                    {getComparisonData().map((item) => (
                      <td key={item.id}>
                        {item.hasSwap ? (
                          <span className="check-tag yes">
                            ✓ {item.swapCount}种可选
                          </span>
                        ) : (
                          <span className="check-tag no">✗ 不支持</span>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="feature-cell">
                      <span className="feature-icon-col">📅</span>
                      <span>每周配送</span>
                    </td>
                    {getComparisonData().map((item) => (
                      <td key={item.id}>
                        {item.weekly ? (
                          <span className="check-tag yes">✓ 支持</span>
                        ) : (
                          <span className="check-tag no">✗ 不支持</span>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="feature-cell">
                      <span className="feature-icon-col">📆</span>
                      <span>每两周配送</span>
                    </td>
                    {getComparisonData().map((item) => (
                      <td key={item.id}>
                        {item.biweekly ? (
                          <span className="check-tag yes">✓ 支持</span>
                        ) : (
                          <span className="check-tag no">✗ 不支持</span>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="feature-cell">
                      <span className="feature-icon-col">👨‍👩‍👧</span>
                      <span>适合人数</span>
                    </td>
                    <td>1-2人</td>
                    <td>3-4人</td>
                    <td>5人以上</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="info-section">
          <div className="info-card">
            <h3>📦 如何订阅</h3>
            <ol>
              <li>选择适合您家庭的蔬菜箱规格</li>
              <li>设置配送频率和蔬菜替换选项</li>
              <li>填写配送地址和联系方式</li>
              <li>确认订单，等待新鲜蔬菜送达</li>
            </ol>
          </div>
          <div className="info-card">
            <h3>🌟 品质承诺</h3>
            <ul>
              <li>所有蔬菜均为当季采摘，新鲜有保障</li>
              <li>不使用农药化肥，健康又美味</li>
              <li>不满意可随时退换，购物无忧</li>
              <li>会员专享价格，越订越划算</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
