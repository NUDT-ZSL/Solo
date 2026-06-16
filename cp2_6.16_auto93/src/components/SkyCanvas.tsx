import { useRef, useEffect, useCallback, useMemo } from 'react';
import { City } from '../data/cities';
import {
  getSkyColor,
  getSunColor,
  calculateSunPosition,
  getSunAltitude,
  calculateTemperature,
  isTwilight,
  randomRange,
  randomInt
} from '../utils/math';
import { BuildingInfo } from '../App';

interface SkyCanvasProps {
  city: City;
  time: number;
  onBuildingClick: (info: BuildingInfo) => void;
  selectedBuildingIndex: number | null;
}

interface Building {
  x: number;
  width: number;
  height: number;
  windows: { x: number; y: number; on: boolean; nextToggle: number }[];
}

interface Cloud {
  x: number;
  y: number;
  circles: { offsetX: number; offsetY: number; radius: number }[];
  speed: number;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const BUILDING_COUNT = randomInt(35, 45);
const GROUND_Y = CANVAS_HEIGHT - 40;

function generateBuildings(): Building[] {
  const buildings: Building[] = [];
  let currentX = 0;
  const totalWidth = CANVAS_WIDTH;

  for (let i = 0; i < BUILDING_COUNT; i++) {
    const width = randomRange(18, 35);
    const height = randomRange(40, 120);
    const building: Building = {
      x: currentX,
      width,
      height,
      windows: []
    };

    const windowCols = Math.floor((width - 6) / 10);
    const windowRows = Math.floor((height - 10) / 14);
    for (let row = 0; row < windowRows; row++) {
      for (let col = 0; col < windowCols; col++) {
        building.windows.push({
          x: 6 + col * 10,
          y: 8 + row * 14,
          on: Math.random() > 0.5,
          nextToggle: performance.now() + randomRange(2000, 4000)
        });
      }
    }

    buildings.push(building);
    currentX += width;
    if (currentX >= totalWidth) break;
  }

  return buildings;
}

function generateClouds(): Cloud[] {
  const clouds: Cloud[] = [];
  const count = randomInt(4, 7);
  for (let i = 0; i < count; i++) {
    const circles: { offsetX: number; offsetY: number; radius: number }[] = [];
    const circleCount = randomInt(3, 5);
    for (let j = 0; j < circleCount; j++) {
      circles.push({
        offsetX: randomRange(-20, 20),
        offsetY: randomRange(-8, 8),
        radius: randomRange(12, 22)
      });
    }
    clouds.push({
      x: randomRange(0, CANVAS_WIDTH),
      y: randomRange(60, 200),
      circles,
      speed: randomRange(0.1, 0.3)
    });
  }
  return clouds;
}

export default function SkyCanvas({
  city,
  time,
  onBuildingClick,
  selectedBuildingIndex
}: SkyCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const buildingsRef = useRef<Building[]>(useMemo(() => generateBuildings(), []));
  const cloudsRef = useRef<Cloud[]>(useMemo(() => generateClouds(), []));
  const timeRef = useRef<number>(time);
  const cityRef = useRef<City>(city);
  const selectedIndexRef = useRef<number | null>(selectedBuildingIndex);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    timeRef.current = time;
  }, [time]);

  useEffect(() => {
    cityRef.current = city;
  }, [city]);

  useEffect(() => {
    selectedIndexRef.current = selectedBuildingIndex;
  }, [selectedBuildingIndex]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const buildings = buildingsRef.current;
    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      const buildingTop = GROUND_Y - b.height;
      if (x >= b.x && x <= b.x + b.width && y >= buildingTop && y <= GROUND_Y) {
        const sunAlt = getSunAltitude(timeRef.current, cityRef.current.latitude);
        const temp = calculateTemperature(sunAlt);
        onBuildingClick({
          index: i,
          height: b.height,
          temperature: temp
        });
        return;
      }
    }
  }, [onBuildingClick]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const currentTime = timeRef.current;
      const currentCity = cityRef.current;
      const selectedIdx = selectedIndexRef.current;
      const now = performance.now();

      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const skyColor = getSkyColor(currentTime);
      ctx.fillStyle = skyColor;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const sun = calculateSunPosition(currentTime, CANVAS_WIDTH, CANVAS_HEIGHT, currentCity.latitude);
      if (sun.visible) {
        const sunColor = getSunColor(currentTime);
        const gradient = ctx.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, 60);
        gradient.addColorStop(0, sunColor);
        gradient.addColorStop(0.4, sunColor + '88');
        gradient.addColorStop(1, sunColor + '00');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(sun.x, sun.y, 60, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = sunColor;
        ctx.beginPath();
        ctx.arc(sun.x, sun.y, 30, 0, Math.PI * 2);
        ctx.fill();
      }

      const showClouds = isTwilight(currentTime);
      if (showClouds) {
        const clouds = cloudsRef.current;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        clouds.forEach(cloud => {
          cloud.x += cloud.speed;
          if (cloud.x > CANVAS_WIDTH + 60) {
            cloud.x = -60;
          }
          cloud.circles.forEach(circle => {
            ctx.beginPath();
            ctx.arc(cloud.x + circle.offsetX, cloud.y + circle.offsetY, circle.radius, 0, Math.PI * 2);
            ctx.fill();
          });
        });
      }

      const buildings = buildingsRef.current;
      buildings.forEach((building, index) => {
        const buildingTop = GROUND_Y - building.height;
        const isSelected = selectedIdx === index;

        if (isSelected) {
          ctx.shadowColor = '#e94560';
          ctx.shadowBlur = 10;
        }

        ctx.fillStyle = '#0f3460';
        ctx.fillRect(building.x, buildingTop, building.width, building.height);

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        building.windows.forEach(win => {
          if (now >= win.nextToggle) {
            win.on = !win.on;
            win.nextToggle = now + randomRange(2000, 4000);
          }
          if (win.on) {
            ctx.fillStyle = 'rgba(255, 220, 100, 0.9)';
            ctx.fillRect(building.x + win.x, buildingTop + win.y, 5, 7);
          } else {
            ctx.fillStyle = 'rgba(20, 40, 70, 0.6)';
            ctx.fillRect(building.x + win.x, buildingTop + win.y, 5, 7);
          }
        });
      });

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      onClick={handleClick}
      style={{ backgroundColor: '#1a1a2e' }}
    />
  );
}
