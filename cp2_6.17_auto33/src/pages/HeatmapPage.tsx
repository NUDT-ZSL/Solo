import { useEffect, useRef, useState } from 'react';
import { useHeatmapItems } from '../hooks/useItems';
import { useCurrentUser } from '../hooks/useUser';

interface HeatmapItem {
  id: string;
  name: string;
  points: number;
  location: { lat: number; lng: number };
}

export default function HeatmapPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { items, loading } = useHeatmapItems();
  const { user } = useCurrentUser();
  const [popup, setPopup] = useState<{
    x: number;
    y: number;
    items: HeatmapItem[];
  } | null>(null);
  const itemsRef = useRef<HeatmapItem[]>([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    ctx.fillStyle = '#faf8f5';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#e8e4df';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const centerLat = user?.location.lat || 39.9042;
    const centerLng = user?.location.lng || 116.4074;
    const scale = 80000;

    const latToY = (lat: number) => h / 2 + (centerLat - lat) * scale;
    const lngToX = (lng: number) => w / 2 + (lng - centerLng) * scale;

    const clusters: { x: number; y: number; items: HeatmapItem[] }[] = [];
    const clusterRadius = 50;

    items.forEach((item) => {
      const x = lngToX(item.location.lng);
      const y = latToY(item.location.lat);

      let added = false;
      for (const cluster of clusters) {
        const dist = Math.sqrt((x - cluster.x) ** 2 + (y - cluster.y) ** 2);
        if (dist < clusterRadius) {
          cluster.items.push(item);
          cluster.x = (cluster.x * (cluster.items.length - 1) + x) / cluster.items.length;
          cluster.y = (cluster.y * (cluster.items.length - 1) + y) / cluster.items.length;
          added = true;
          break;
        }
      }
      if (!added) {
        clusters.push({ x, y, items: [item] });
      }
    });

    clusters.forEach((cluster) => {
      const count = cluster.items.length;
      const radius = 30 + count * 12;
      const intensity = Math.min(0.3 + count * 0.1, 0.8);

      const gradient = ctx.createRadialGradient(
        cluster.x,
        cluster.y,
        0,
        cluster.x,
        cluster.y,
        radius
      );

      const t = Math.min(count / 5, 1);
      const r = Math.round(45 + (216 - 45) * (1 - t));
      const g = Math.round(106 + (243 - 106) * (1 - t));
      const b = Math.round(79 + (220 - 79) * (1 - t));

      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${intensity})`);
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cluster.x, cluster.y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#2d6a4f';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(count), cluster.x, cluster.y);
    });

    if (user) {
      const cx = w / 2;
      const cy = h / 2;
      ctx.strokeStyle = '#2d6a4f';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#2d6a4f';
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#2d6a4f';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('我的位置', cx, cy + 32);
    }

    (canvas as any)._clusters = clusters;
  }, [items, user]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clusters = (canvas as any)._clusters as
      | { x: number; y: number; items: HeatmapItem[] }[]
      | undefined;

    if (!clusters) return;

    let found: { x: number; y: number; items: HeatmapItem[] } | null = null;
    for (const cluster of clusters) {
      const dist = Math.sqrt((x - cluster.x) ** 2 + (y - cluster.y) ** 2);
      const radius = 30 + cluster.items.length * 12;
      if (dist < radius) {
        found = cluster;
        break;
      }
    }

    if (found) {
      setPopup({ x: found.x, y: found.y - 10, items: found.items });
    } else {
      setPopup(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">附近物品热力图</h1>
        <p className="page-subtitle">点击热区查看附近可用的闲置物品</p>
      </div>

      <div className="heatmap-container" onClick={() => setPopup(null)}>
        <canvas
          ref={canvasRef}
          className="heatmap-canvas"
          onClick={handleCanvasClick}
        />
        {loading && <div className="loading-text">加载中...</div>}
        {popup && (
          <div
            className="heatmap-popup"
            style={{ left: popup.x, top: popup.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="heatmap-popup-title">
              附近物品（{popup.items.length}件）
            </div>
            {popup.items.map((item) => (
              <div className="heatmap-popup-item" key={item.id}>
                <span className="heatmap-popup-item-name">{item.name}</span>
                <span className="heatmap-popup-item-points">
                  {item.points} 积分
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
