import React, { useState, useEffect } from 'react';
import BoxCard from '../components/BoxCard';
import { BoxCardSkeleton } from '../components/Skeleton';
import { boxesAPI } from '../utils/api';
import type { Box } from '../types';
import './Home.css';

const Home: React.FC = () => {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [loading, setLoading] = useState(true);

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
          <h2>选择您的蔬菜箱</h2>
          <p>三种规格，满足不同家庭需求</p>
        </div>

        <div className="boxes-grid">
          {loading
            ? [...Array(3)].map((_, i) => <BoxCardSkeleton key={i} />)
            : boxes.map((box) => <BoxCard key={box.id} box={box} />)}
        </div>

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
