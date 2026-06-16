import { useRef, useEffect, useState, useCallback } from 'react';
import { regions, Region } from '@/data/cuisineData';

interface MapViewProps {
  onRegionClick: (region: Region) => void;
  selectedRegionId?: string;
  highlightRegionId?: string;
}

export default function MapView({ onRegionClick, selectedRegionId, highlightRegionId }: MapViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredRegionId, setHoveredRegionId] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 500 });
  const animationRef = useRef<number>(0);
  const hoverRadiusRef = useRef<{ [key: string]: number }>({});

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const getRegionAtPosition = useCallback((x: number, y: number): Region | null => {
    for (let i = regions.length - 1; i >= 0; i--) {
      const region = regions[i];
      const px = (region.position.x / 100) * dimensions.width;
      const py = (region.position.y / 100) * dimensions.height;
      const distance = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
      if (distance <= 24) {
        return region;
      }
    }
    return null;
  }, [dimensions]);

  const drawMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#1b4965';
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    drawContinents(ctx, dimensions.width, dimensions.height);

    regions.forEach((region) => {
      const px = (region.position.x / 100) * dimensions.width;
      const py = (region.position.y / 100) * dimensions.height;

      const isHovered = hoveredRegionId === region.id;
      const isSelected = selectedRegionId === region.id;
      const isHighlighted = highlightRegionId === region.id;

      const targetRadius = isHovered || isSelected || isHighlighted ? 24 : 18;
      const currentRadius = hoverRadiusRef.current[region.id] || 18;
      const newRadius = currentRadius + (targetRadius - currentRadius) * 0.2;
      hoverRadiusRef.current[region.id] = newRadius;

      const gradient = ctx.createRadialGradient(px, py, 0, px, py, newRadius * 2);
      gradient.addColorStop(0, region.color + '60');
      gradient.addColorStop(1, region.color + '00');
      ctx.beginPath();
      ctx.arc(px, py, newRadius * 2, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(px, py, newRadius, 0, Math.PI * 2);
      ctx.fillStyle = region.color;
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (isHovered || isSelected || isHighlighted) {
        ctx.font = '14px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const text = region.name;
        const textWidth = ctx.measureText(text).width;
        const labelWidth = textWidth + 20;
        const labelHeight = 26;
        const labelX = px - labelWidth / 2;
        const labelY = py - newRadius - labelHeight - 10;

        ctx.beginPath();
        ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 13);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(px - 6, labelY + labelHeight);
        ctx.lineTo(px + 6, labelY + labelHeight);
        ctx.lineTo(px, labelY + labelHeight + 6);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, px, labelY + labelHeight / 2);
      }
    });

    if (hoveredRegionId || selectedRegionId || highlightRegionId) {
      animationRef.current = requestAnimationFrame(drawMap);
    }
  }, [dimensions, hoveredRegionId, selectedRegionId, highlightRegionId]);

  useEffect(() => {
    drawMap();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [drawMap]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const region = getRegionAtPosition(x, y);
    setHoveredRegionId(region ? region.id : null);

    canvas.style.cursor = region ? 'pointer' : 'default';
  }, [getRegionAtPosition]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const region = getRegionAtPosition(x, y);
    if (region) {
      onRegionClick(region);
    }
  }, [getRegionAtPosition, onRegionClick]);

  const handleMouseLeave = useCallback(() => {
    setHoveredRegionId(null);
  }, []);

  return (
    <div ref={containerRef} className="map-container">
      <canvas
        ref={canvasRef}
        style={{ width: dimensions.width, height: dimensions.height }}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  );
}

function drawContinents(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = '#caf0f8';
  ctx.strokeStyle = '#0077b6';
  ctx.lineWidth = 1;

  const pathData = [
    { points: [[15, 20], [35, 15], [42, 25], [40, 40], [30, 45], [20, 42], [12, 35], [10, 25]], type: 'northAmerica' },
    { points: [[22, 50], [38, 48], [40, 55], [35, 70], [28, 75], [22, 70], [20, 58]], type: 'southAmerica' },
    { points: [[42, 18], [58, 12], [62, 22], [58, 32], [50, 35], [44, 32], [40, 25]], type: 'europe' },
    { points: [[45, 38], [58, 35], [60, 42], [58, 55], [52, 60], [45, 58], [42, 48]], type: 'africa' },
    { points: [[62, 10], [80, 8], [88, 18], [85, 32], [75, 38], [68, 35], [62, 28], [60, 18]], type: 'asia' },
    { points: [[78, 42], [86, 40], [88, 50], [82, 55], [78, 52], [76, 46]], type: 'oceania' }
  ];

  pathData.forEach(continent => {
    ctx.beginPath();
    continent.points.forEach((point, index) => {
      const x = (point[0] / 100) * width;
      const y = (point[1] / 100) * height;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  for (let i = 1; i <= 5; i++) {
    const y = (i / 6) * height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  for (let i = 1; i <= 7; i++) {
    const x = (i / 8) * width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
}
