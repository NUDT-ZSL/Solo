import { useRef, useEffect, useState, useCallback } from 'react';
import { generateVisualData, generateWaveformPoints, getBeatPositions, type BeatPoint, type BeatPosition } from '../utils/beatEngine';
import '../components/BeatCanvas.css';

interface BeatCanvasProps {
  standardBeats: number[];
  userBeats: number[];
  fadeOpacity: number;
  playProgress: number;
  playTime: number;
  isPlaying: boolean;
  beatPosition: BeatPosition | null;
  deviations: number[];
  bpm: number;
}

interface TooltipInfo {
  visible: boolean;
  x: number;
  y: number;
  deviation: number;
  beatIndex: number;
}

function BeatCanvas({
  standardBeats,
  userBeats,
  fadeOpacity,
  playProgress,
  playTime,
  isPlaying,
  beatPosition,
  deviations,
  bpm,
}: BeatCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const [tooltip, setTooltip] = useState<TooltipInfo>({
    visible: false, x: 0, y: 0, deviation: 0, beatIndex: 0 });
  const [hoveredPoint, setHoveredPoint] = useState<BeatPoint | null>(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDimensions({
        width: rect.width,
        height: Math.max(400, window.innerHeight * 0.5),
      });
    }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const visualData = generateVisualData(
    userBeats,
    standardBeats,
    dimensions.width,
    dimensions.height
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensions;
    const padding = 60;
    const centerY = height / 2;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#16213E';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(15, 52, 96, 0.5)';
    ctx.lineWidth = 0.5;

    const gridSpacing = 50;
    for (let x = padding; x < width - padding; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }

    for (let y = padding; y < height - padding; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    ctx.strokeStyle = '#0F3460';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding, centerY);
    ctx.lineTo(width - padding, centerY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#8892B0';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('-150ms', padding - 30, centerY - 30);
    ctx.fillText('0ms', padding - 30, centerY);
    ctx.fillText('+150ms', padding - 30, centerY + 30);

    const standardWavePoints = generateWaveformPoints(
      visualData.standardPoints,
      width,
      height
    );

    ctx.globalAlpha = fadeOpacity;
    ctx.strokeStyle = '#3498DB';
    ctx.lineWidth = 2;
    ctx.beginPath();
    standardWavePoints.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.stroke();

    visualData.standardPoints.forEach((point, index) => {
      const deviation = deviations[index];
      const hasDeviation = deviation !== undefined;
      const isAccurate = hasDeviation && Math.abs(deviation) <= 50;
      const isInaccurate = hasDeviation && Math.abs(deviation) > 50;
      const isPassed = beatPosition && index <= beatPosition.currentBeatIndex;

      let fillColor = '#3498DB';
      let radius = 6;
      let strokeColor: string | null = null;

      if (isPassed && hasDeviation) {
        if (isAccurate) {
          fillColor = '#2ECC71';
          strokeColor = '#27AE60';
          radius = 8;
        } else if (isInaccurate) {
          fillColor = '#E74C3C';
          strokeColor = '#C0392B';
          radius = 8;
        }
      }

      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = fillColor;
      ctx.fill();

      if (strokeColor) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.fillStyle = '#8892B0';
      ctx.font = '11px sans-serif';
      ctx.fillText(`${index + 1}`, point.x, height - padding + 20);
    });

    if (visualData.userPoints.length > 0) {
      const userWavePoints = generateWaveformPoints(
        visualData.userPoints,
        width,
        height
      );

      ctx.strokeStyle = '#E74C3C';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      userWavePoints.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.stroke();
      ctx.setLineDash([]);

      visualData.userPoints.forEach((point, index) => {
        const deviation = deviations[index];
        const hasDeviation = deviation !== undefined;
        const isAccurate = hasDeviation && Math.abs(deviation) <= 50;
        const isInaccurate = hasDeviation && Math.abs(deviation) > 50;
        const isPassed = beatPosition && index <= beatPosition.currentBeatIndex;

        let fillColor = '#E74C3C';
        let radius = 6;
        let strokeColor: string | null = null;

        if (isPassed && hasDeviation) {
          if (isAccurate) {
            fillColor = '#2ECC71';
            strokeColor = '#27AE60';
            radius = 8;
          } else if (isInaccurate) {
            fillColor = '#E74C3C';
            strokeColor = '#C0392B';
            radius = 8;
          }
        }

        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = fillColor;
        ctx.fill();

        if (strokeColor) {
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
    }

    if (isPlaying || playProgress > 0) {
      const position = beatPosition || getBeatPositions(standardBeats, playTime, bpm);
      const currentX = padding + position.positionPercent * (width - padding * 2);

      ctx.save();
      ctx.translate(currentX, centerY);

      const swingAngle = Math.sin(position.beatProgress * Math.PI) * 0.3;
      ctx.rotate(swingAngle);

      const gradient = ctx.createLinearGradient(0, -centerY + padding, 0, 0);
      gradient.addColorStop(0, 'rgba(52, 152, 219, 0.1)');
      gradient.addColorStop(1, 'rgba(52, 152, 219, 0.8)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.lineTo(-3, -centerY + padding);
      ctx.lineTo(3, -centerY + padding);
      ctx.lineTo(8, 0);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#3498DB';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -centerY + padding + 10);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fillStyle = '#3498DB';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, -centerY + padding + 10, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#E74C3C';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();

      ctx.strokeStyle = 'rgba(52, 152, 219, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(currentX, padding);
      ctx.lineTo(currentX, height - padding);
      ctx.stroke();
      ctx.setLineDash([]);

      if (visualData.userPoints.length > 0) {
        const userIndex = Math.min(position.currentBeatIndex, visualData.userPoints.length - 1);
        const userPoint = visualData.userPoints[userIndex];
        if (userPoint && position.beatProgress < 0.5) {
          const pulseRadius = 10 + position.beatProgress * 10;
          ctx.beginPath();
          ctx.arc(userPoint.x, userPoint.y, pulseRadius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(231, 76, 60, ${0.5 - position.beatProgress * 0.5})`;
          ctx.fill();
        }
      }

      if (position.currentBeatIndex < standardBeats.length) {
        const standardPoint = visualData.standardPoints[position.currentBeatIndex];
        if (standardPoint && position.beatProgress < 0.5) {
          const pulseRadius = 10 + position.beatProgress * 10;
          ctx.beginPath();
          ctx.arc(standardPoint.x, standardPoint.y, pulseRadius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(52, 152, 219, ${0.5 - position.beatProgress * 0.5})`;
          ctx.fill();
        }
      }
    }

    if (hoveredPoint) {
      ctx.beginPath();
      ctx.arc(hoveredPoint.x, hoveredPoint.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }, [dimensions, visualData, fadeOpacity, isPlaying, playProgress, playTime, hoveredPoint, standardBeats, beatPosition, deviations, bpm]);

  useEffect(() => {
    const animate = () => {
      draw();
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [draw]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const allPoints = [...visualData.standardPoints, ...visualData.userPoints];
    let foundPoint: BeatPoint | null = null;
    let minDistance = 20;

    for (const point of allPoints) {
      const distance = Math.sqrt(Math.pow(point.x - mouseX, 2) + Math.pow(point.y - mouseY, 2));
      if (distance < minDistance) {
        minDistance = distance;
        foundPoint = point;
      }
    }

    if (foundPoint) {
      setHoveredPoint(foundPoint);
      setTooltip({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        deviation: foundPoint.deviation,
        beatIndex: foundPoint.beatIndex,
      });
    } else {
      setHoveredPoint(null);
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  }, [visualData]);

  const handleMouseLeave = useCallback(() => {
    setHoveredPoint(null);
    setTooltip(prev => ({ ...prev, visible: false }));
  }, []);

  return (
    <div className="beat-canvas-container" ref={containerRef}>
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="beat-canvas"
      />
      {tooltip.visible && (
        <div
          className="beat-tooltip"
          style={{
            left: tooltip.x + 15,
            top: tooltip.y - 40,
          }}
        >
          <div className="tooltip-content">
            <div className="tooltip-beat">第{tooltip.beatIndex + 1}拍</div>
            <div className="tooltip-deviation">
              偏差: {tooltip.deviation === 0
                ? '完美'
                : tooltip.deviation > 0
                ? `+${tooltip.deviation}ms`
                : `${tooltip.deviation}ms`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BeatCanvas;
