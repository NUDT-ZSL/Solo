import { useParams, useNavigate } from 'react-router-dom';
import TimelineItem from '../components/TimelineItem';
import useApi from '../hooks/useApi';
import type { Plant, CareRecord } from '../types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import './PlantDetail.css';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const statusConfig: Record<string, { color: string; label: string }> = {
  healthy: { color: '#66bb6a', label: '健康' },
  warning: { color: '#ffa726', label: '需关注' },
  danger: { color: '#ef5350', label: '需救治' },
};

function PlantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: plant, loading: plantLoading } = useApi<Plant>(`/plants/${id}`);
  const { data: records, loading: recordsLoading, refetch } = useApi<CareRecord[]>(
    `/plants/${id}/records`
  );
  const { request } = useApi<{ likes: number; liked: boolean }>('', { manual: true });

  const handleLike = async (recordId: string) => {
    await request(`/records/${recordId}/like`, { method: 'POST' });
    refetch();
  };

  if (plantLoading || !plant) {
    return (
      <div className="plant-detail">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  const status = statusConfig[plant.healthStatus] || statusConfig.healthy;

  return (
    <div className="plant-detail">
      <button className="back-btn" onClick={() => navigate(-1)}>
        ← 返回
      </button>

      <div className="plant-hero" style={{ '--status-color': status.color } as React.CSSProperties}>
        <div className="plant-hero__bg" />
        <div className="plant-hero__content">
          <img src={plant.avatar} alt={plant.name} className="plant-hero__avatar" />
          <div className="plant-hero__info">
            <h1 className="plant-hero__name">{plant.name}</h1>
            <p className="plant-hero__latin">{plant.latinName}</p>
            <div className="plant-hero__status" style={{ backgroundColor: status.color }}>
              {status.label}
            </div>
          </div>
        </div>

        <div className="plant-stats">
          <div className="plant-stat">
            <div className="plant-stat__icon">☀️</div>
            <div className="plant-stat__info">
              <span className="plant-stat__value">{plant.light}%</span>
              <span className="plant-stat__label">光照</span>
            </div>
          </div>
          <div className="plant-stat">
            <div className="plant-stat__icon">💧</div>
            <div className="plant-stat__info">
              <span className="plant-stat__value">{plant.moisture}%</span>
              <span className="plant-stat__label">湿度</span>
            </div>
          </div>
          <div className="plant-stat">
            <div className="plant-stat__icon">🌡️</div>
            <div className="plant-stat__info">
              <span className="plant-stat__value">{plant.temperature}%</span>
              <span className="plant-stat__label">温度</span>
            </div>
          </div>
          <div className="plant-stat">
            <div className="plant-stat__icon">📅</div>
            <div className="plant-stat__info">
              <span className="plant-stat__value">{dayjs(plant.createdAt).fromNow()}</span>
              <span className="plant-stat__label">相伴</span>
            </div>
          </div>
        </div>
      </div>

      {plant.description && (
        <div className="plant-description">
          <h3>📝 简介</h3>
          <p>{plant.description}</p>
        </div>
      )}

      <div className="timeline-section">
        <h2 className="timeline-title">🌱 养护历史</h2>

        {recordsLoading ? (
          <div className="loading">加载中...</div>
        ) : records && records.length > 0 ? (
          <div className="timeline">
            {records.map((record, idx) => (
              <TimelineItem
                key={record.id}
                record={record}
                index={idx}
                onLike={handleLike}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">还没有养护记录，快去记录第一次吧～</div>
        )}
      </div>
    </div>
  );
}

export default PlantDetail;
