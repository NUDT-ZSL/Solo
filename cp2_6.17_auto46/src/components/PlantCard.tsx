import { useRef, useEffect, useState } from 'react';
import type { Plant } from '../types';
import './PlantCard.css';

interface PlantCardProps {
  plant: Plant;
  onClick?: () => void;
  index?: number;
}

const statusColors: Record<string, string> = {
  healthy: '#66bb6a',
  warning: '#ffa726',
  danger: '#ef5350',
};

const statusLabels: Record<string, string> = {
  healthy: '健康',
  warning: '注意',
  danger: '危险',
};

function PlantCard({ plant, onClick, index = 0 }: PlantCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`plant-card ${visible ? 'plant-card--visible' : ''}`}
      style={{
        '--status-color': statusColors[plant.healthStatus],
        '--delay': `${index * 0.08}s`,
      } as React.CSSProperties}
      onClick={onClick}
    >
      <div className="plant-card__status-badge" style={{ backgroundColor: statusColors[plant.healthStatus] }}>
        {statusLabels[plant.healthStatus]}
      </div>

      <div className="plant-card__avatar-wrapper">
        <img
          src={plant.avatar}
          alt={plant.name}
          className="plant-card__avatar"
          loading="lazy"
        />
      </div>

      <div className="plant-card__info">
        <h3 className="plant-card__name">{plant.name}</h3>
        <p className="plant-card__latin">{plant.latinName}</p>
      </div>

      <div className="plant-card__mini-bars">
        <div className="mini-bar mini-bar--light" title="光照强度">
          <div className="mini-bar__fill" style={{ height: `${plant.light}%` }} />
          <span className="mini-bar__label">光</span>
        </div>
        <div className="mini-bar mini-bar--moisture" title="土壤湿度">
          <div className="mini-bar__fill" style={{ height: `${plant.moisture}%` }} />
          <span className="mini-bar__label">湿</span>
        </div>
        <div className="mini-bar mini-bar--temp" title="温度">
          <div className="mini-bar__fill" style={{ height: `${plant.temperature}%` }} />
          <span className="mini-bar__label">温</span>
        </div>
      </div>
    </div>
  );
}

export default PlantCard;
