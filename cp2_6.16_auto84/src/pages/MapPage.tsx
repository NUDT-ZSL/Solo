import { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlants } from '../hooks/usePlants';
import { Plant } from '../types';
import './MapPage.css';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;
const MARKER_RADIUS = 14;
const HOVER_RADIUS = 18;

function MapPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { plants, loading, adoptPlant } = usePlants();
  const [hoveredPlant, setHoveredPlant] = useState<Plant | null>(null);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [adopting, setAdopting] = useState(false);
  const navigate = useNavigate();

  const drawMap = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = '#c8e6c9';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = '#a5d6a7';
    const buildings = [
      { x: 30, y: 30, w: 80, h: 60 },
      { x: 150, y: 20, w: 100, h: 70 },
      { x: 300, y: 40, w: 90, h: 50 },
      { x: 450, y: 25, w: 110, h: 65 },
      { x: 50, y: 150, w: 70, h: 80 },
      { x: 180, y: 180, w: 120, h: 70 },
      { x: 350, y: 150, w: 80, h: 90 },
      { x: 480, y: 170, w: 90, h: 75 },
      { x: 20, y: 300, w: 100, h: 60 },
      { x: 200, y: 310, w: 80, h: 55 },
      { x: 330, y: 290, w: 110, h: 70 },
      { x: 480, y: 300, w: 90, h: 65 },
    ];
    buildings.forEach(b => {
      ctx.fillRect(b.x, b.y, b.w, b.h);
    });

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(0, 120);
    ctx.lineTo(CANVAS_WIDTH, 130);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 260);
    ctx.lineTo(CANVAS_WIDTH, 250);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(130, 0);
    ctx.lineTo(140, CANVAS_HEIGHT);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(320, 0);
    ctx.lineTo(310, CANVAS_HEIGHT);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(490, 0);
    ctx.lineTo(500, CANVAS_HEIGHT);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(0, 120);
    ctx.lineTo(CANVAS_WIDTH, 130);
    ctx.stroke();
    ctx.setLineDash([]);
  }, []);

  const drawMarkers = useCallback((ctx: CanvasRenderingContext2D, timestamp: number) => {
    plants.forEach(plant => {
      const isHovered = hoveredPlant?.id === plant.id;
      const isSelected = selectedPlant?.id === plant.id;
      const radius = isHovered || isSelected ? HOVER_RADIUS : MARKER_RADIUS;

      const pulseScale = 1 + Math.sin(timestamp / 500 + plant.x) * 0.08;

      ctx.save();
      ctx.translate(plant.x, plant.y);
      ctx.scale(pulseScale, pulseScale);

      ctx.shadowColor = 'rgba(46, 125, 50, 0.4)';
      ctx.shadowBlur = 8;

      ctx.fillStyle = plant.adopted ? '#81c784' : '#2e7d32';
      ctx.beginPath();
      ctx.arc(0, -radius * 0.3, radius * 0.85, Math.PI, 0);
      ctx.quadraticCurveTo(radius * 0.85, radius * 0.6, 0, radius);
      ctx.quadraticCurveTo(-radius * 0.85, radius * 0.6, -radius * 0.85, -radius * 0.3);
      ctx.closePath();
      ctx.fill();

      ctx.shadowBlur = 0;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.ellipse(-radius * 0.25, -radius * 0.2, radius * 0.3, radius * 0.2, -0.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      if (isHovered || isSelected) {
        ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        const textWidth = ctx.measureText(plant.name).width;
        const labelWidth = textWidth + 16;
        const labelHeight = 26;
        const labelX = plant.x - labelWidth / 2;
        const labelY = plant.y - radius - labelHeight - 10;

        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 2;
        roundRect(ctx, labelX, labelY, labelWidth, labelHeight, 6);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#1b5e20';
        ctx.fillText(plant.name, plant.x, labelY + 17);

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(plant.x - 6, labelY + labelHeight);
        ctx.lineTo(plant.x + 6, labelY + labelHeight);
        ctx.lineTo(plant.x, labelY + labelHeight + 6);
        ctx.closePath();
        ctx.fill();
      }
    });
  }, [plants, hoveredPlant, selectedPlant]);

  const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const animate = (timestamp: number) => {
      drawMap(ctx);
      drawMarkers(ctx, timestamp);
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [drawMap, drawMarkers]);

  const getPlantAtPosition = useCallback((x: number, y: number): Plant | null => {
    for (let i = plants.length - 1; i >= 0; i--) {
      const plant = plants[i];
      const dx = x - plant.x;
      const dy = y - plant.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= HOVER_RADIUS + 4) {
        return plant;
      }
    }
    return null;
  }, [plants]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const plant = getPlantAtPosition(x, y);
    setHoveredPlant(plant);
    canvas.style.cursor = plant ? 'pointer' : 'default';
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const plant = getPlantAtPosition(x, y);
    if (plant) {
      setSelectedPlant(plant);
    } else {
      setSelectedPlant(null);
    }
  };

  const handleAdopt = async () => {
    if (!selectedPlant || selectedPlant.adopted) return;

    try {
      setAdopting(true);
      const updated = await adoptPlant(selectedPlant.id, 'user_001', '绿植爱好者');
      setSelectedPlant(updated);
    } catch (err) {
      console.error('Adopt failed:', err);
    } finally {
      setAdopting(false);
    }
  };

  const handleViewDetail = () => {
    if (selectedPlant) {
      navigate(`/plant/${selectedPlant.id}`);
    }
  };

  if (loading) {
    return (
      <div className="map-page">
        <h2 className="page-title">🗺️ 城市绿植地图</h2>
        <div className="map-container loading">
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="map-page">
      <h2 className="page-title">🗺️ 城市绿植地图</h2>
      <p className="map-subtitle">点击地图上的水滴标记，认养属于你的绿植</p>

      <div className="map-wrapper">
        <div className="map-container">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onMouseMove={handleMouseMove}
            onClick={handleClick}
            onMouseLeave={() => setHoveredPlant(null)}
          />

          <div className="map-legend">
            <div className="legend-item">
              <span className="legend-marker available"></span>
              <span>可认养</span>
            </div>
            <div className="legend-item">
              <span className="legend-marker adopted"></span>
              <span>已认养</span>
            </div>
          </div>
        </div>

        {selectedPlant && (
          <div className="plant-detail-card" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <h3>{selectedPlant.name}</h3>
              <button className="close-btn" onClick={() => setSelectedPlant(null)}>
                ✕
              </button>
            </div>

            <div className="plant-image-placeholder">
              🌿 {selectedPlant.name}
            </div>

            <div className="plant-info">
              <div className="info-row">
                <span className="info-label">状态</span>
                <span className={`status-badge ${selectedPlant.adopted ? 'adopted' : 'available'}`}>
                  {selectedPlant.adopted ? '已认养' : '可认养'}
                </span>
              </div>

              <div className="info-row">
                <span className="info-label">生长分值</span>
                <span className="growth-score">{selectedPlant.growthScore}/100</span>
              </div>

              <div className="growth-bar">
                <div
                  className="growth-fill"
                  style={{ width: `${selectedPlant.growthScore}%` }}
                ></div>
              </div>

              <p className="plant-description">{selectedPlant.description}</p>
            </div>

            {!selectedPlant.adopted ? (
              <button
                className="adopt-btn"
                onClick={handleAdopt}
                disabled={adopting}
              >
                {adopting ? '认养中...' : '🌱 立即认养'}
              </button>
            ) : (
              <button
                className="view-detail-btn"
                onClick={handleViewDetail}
              >
                查看日记 →
              </button>
            )}
          </div>
        )}
      </div>

      {selectedPlant && (
        <div className="modal-overlay" onClick={() => setSelectedPlant(null)}></div>
      )}
    </div>
  );
}

export default MapPage;
