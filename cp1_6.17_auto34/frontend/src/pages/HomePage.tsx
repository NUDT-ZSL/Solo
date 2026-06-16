import React, { useState, useEffect } from 'react';
import { SpecialDrink } from '../types';
import { fetchSpecials } from '../api';
import { getOrderCount } from '../logic/orderLogic';
import { User } from '../types';
import SpecialModal from '../components/SpecialModal';
import './HomePage.css';

interface HomePageProps {
  user: User;
}

const HomePage: React.FC<HomePageProps> = ({ user }) => {
  const [specials, setSpecials] = useState<SpecialDrink[]>([]);
  const [selectedDrink, setSelectedDrink] = useState<SpecialDrink | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchSpecials();
        setSpecials(data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const orderCount = getOrderCount(user.id);
  const nextUnlock = 5 - (orderCount % 5);
  const progress = ((orderCount % 5) / 5) * 100;

  const getFlavorColor = (level: number) => {
    const colors = ['#FFE0B2', '#FFCC80', '#FFB74D', '#A1887F', '#4E342E'];
    return colors[Math.min(Math.max(level - 1, 0), 4)];
  };

  return (
    <div className="page-container">
      <div className="page-content">
        <div className="home-header">
          <h1 className="page-title">今日咖啡师特调</h1>
          <p className="home-subtitle">每一杯都是咖啡师的心意</p>
        </div>

        <div className="progress-card">
          <div className="progress-header">
            <span className="progress-title">🎯 拼单进度</span>
            <span className="progress-count">已完成 {orderCount} 次</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="progress-text">
            再完成 <strong>{nextUnlock === 5 ? 5 : nextUnlock}</strong> 次拼单即可解锁隐藏菜单！
          </p>
        </div>

        {loading ? (
          <div className="loading-state">加载中...</div>
        ) : (
          <div className="specials-grid">
            {specials.map((drink, idx) => (
              <div
                key={drink.id}
                className="special-card"
                style={{ animationDelay: `${idx * 0.05}s` }}
                onClick={() => setSelectedDrink(drink)}
              >
                <div
                  className="special-card-image"
                  style={{ background: `linear-gradient(135deg, ${drink.imageColor} 0%, #BCAAA4 100%)` }}
                >
                  <svg viewBox="0 0 120 120" width="70" height="70">
                    <path
                      d="M30 45h60c0 25-12 40-30 40S30 70 30 45z"
                      fill="#FFF8E1"
                      stroke="#3E2723"
                      strokeWidth="3"
                    />
                    <ellipse cx="60" cy="45" rx="30" ry="6" fill="#5D4037" />
                    <path
                      d="M90 48c8 2 12 10 12 20s-4 18-12 20"
                      fill="none"
                      stroke="#3E2723"
                      strokeWidth="3"
                    />
                    <ellipse cx="60" cy="45" rx="22" ry="4" fill="#8D6E63" />
                  </svg>
                </div>
                <div className="special-card-body">
                  <h3 className="special-card-title">{drink.name}</h3>
                  <p className="special-card-note">{drink.baristaNote}</p>
                  <div className="special-card-flavors">
                    <div className="mini-flavor" title="酸度">
                      <span className="mini-flavor-label">酸</span>
                      <div className="mini-dots">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <span
                            key={i}
                            className="mini-dot"
                            style={{ backgroundColor: i <= drink.flavorTags.acidity ? getFlavorColor(drink.flavorTags.acidity) : '#E0E0E0' }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="mini-flavor" title="甜度">
                      <span className="mini-flavor-label">甜</span>
                      <div className="mini-dots">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <span
                            key={i}
                            className="mini-dot"
                            style={{ backgroundColor: i <= drink.flavorTags.sweetness ? getFlavorColor(drink.flavorTags.sweetness) : '#E0E0E0' }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="mini-flavor" title="苦度">
                      <span className="mini-flavor-label">苦</span>
                      <div className="mini-dots">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <span
                            key={i}
                            className="mini-dot"
                            style={{ backgroundColor: i <= drink.flavorTags.bitterness ? getFlavorColor(drink.flavorTags.bitterness) : '#E0E0E0' }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="special-card-footer">
                    <span className="special-card-limited">限量{drink.limitedCount}杯</span>
                    <span className="special-card-price">¥{drink.price}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <SpecialModal drink={selectedDrink} onClose={() => setSelectedDrink(null)} />
      </div>
    </div>
  );
};

export default HomePage;
