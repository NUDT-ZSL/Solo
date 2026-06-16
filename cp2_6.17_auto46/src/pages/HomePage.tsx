import { useNavigate } from 'react-router-dom';
import PlantCard from '../components/PlantCard';
import ImageGrid from '../components/ImageGrid';
import useApi from '../hooks/useApi';
import type { Plant, FeedItem, ExchangeItem } from '../types';
import dayjs from 'dayjs';
import './HomePage.css';

function HomePage() {
  const navigate = useNavigate();

  const { data: plants, loading: plantsLoading } = useApi<Plant[]>('/plants');
  const { data: feed, loading: feedLoading } = useApi<FeedItem[]>('/feed');
  const { data: exchanges, loading: exchangesLoading } = useApi<ExchangeItem[]>('/exchanges');

  const typeLabels: Record<string, string> = {
    water: '浇水',
    fertilize: '施肥',
    repot: '换盆',
    prune: '修剪',
    other: '记录',
  };

  return (
    <div className="home-container">
      {/* 左栏 - 我的植物 */}
      <aside className="home-col home-col--left">
        <div className="col-header">
          <h2 className="col-title">🌿 我的植物</h2>
          <span className="col-count">{plants?.length || 0} 盆</span>
        </div>

        <div className="plants-scroll">
          {plantsLoading ? (
            <div className="loading">加载中...</div>
          ) : (
            <div className="plants-grid">
              {plants?.map((plant, idx) => (
                <PlantCard
                  key={plant.id}
                  plant={plant}
                  index={idx}
                  onClick={() => navigate(`/plant/${plant.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* 中栏 - 动态消息 */}
      <main className="home-col home-col--center">
        <div className="col-header">
          <h2 className="col-title">📢 动态消息</h2>
        </div>

        <div className="feed-scroll">
          {feedLoading ? (
            <div className="loading">加载中...</div>
          ) : (
            <div className="feed-list">
              {feed?.map((item, idx) => (
                <div key={item.id} className="feed-item" style={{ animationDelay: `${idx * 0.05}s` }}>
                  <div className="feed-item__header">
                    <img src={item.plantAvatar} alt="" className="feed-item__avatar" />
                    <div className="feed-item__meta">
                      <span className="feed-item__plant">{item.plantName}</span>
                      <span className="feed-item__time">{dayjs(item.time).fromNow()}</span>
                    </div>
                    <span className="feed-item__type">{typeLabels[item.type]}</span>
                  </div>
                  <p className="feed-item__desc">{item.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* 右栏 - 推荐交换 */}
      <aside className="home-col home-col--right">
        <div className="col-header">
          <h2 className="col-title">🔄 推荐交换</h2>
          <button className="see-all-btn" onClick={() => navigate('/exchange')}>
            查看全部
          </button>
        </div>

        <div className="exchange-scroll">
          {exchangesLoading ? (
            <div className="loading">加载中...</div>
          ) : (
            <div className="exchange-list">
              {exchanges?.slice(0, 4).map((item, idx) => (
                <div
                  key={item.id}
                  className="exchange-card-mini"
                  style={{ animationDelay: `${idx * 0.08}s` }}
                  onClick={() => navigate('/exchange')}
                >
                  <div className="exchange-card-mini__header">
                    <img src={item.userAvatar} alt="" className="exchange-card-mini__avatar" />
                    <div className="exchange-card-mini__user">
                      <span className="exchange-card-mini__name">{item.userName}</span>
                      <span className="exchange-card-mini__loc">📍 {item.location.address}</span>
                    </div>
                    <span className={`exchange-tag exchange-tag--${item.type}`}>
                      {item.type === 'give' ? '赠送' : item.type === 'want' ? '求购' : '交换'}
                    </span>
                  </div>
                  <h3 className="exchange-card-mini__title">{item.title}</h3>
                  {item.images.length > 0 && (
                    <div className="exchange-card-mini__images">
                      <ImageGrid images={item.images} size={60} max={3} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

export default HomePage;
