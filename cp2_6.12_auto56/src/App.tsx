import { useState, useEffect, useRef, useCallback } from 'react';
import GradientPreview from './components/GradientPreview';
import ControlPanel from './components/ControlPanel';
import {
  ColorStop,
  GradientType,
  GradientConfig,
  FavoriteGradient,
  presetGradients,
  lerpStops,
  lerpAngle,
} from './utils/gradient';

const defaultStops: ColorStop[] = [
  { id: 's1', color: '#667eea', position: 0 },
  { id: 's2', color: '#764ba2', position: 50 },
  { id: 's3', color: '#f093fb', position: 100 },
];

const defaultConfig: GradientConfig = {
  type: 'linear',
  stops: defaultStops,
  angle: 135,
  shape: 'circle',
};

const FAVORITES_KEY = 'gradient_favorites';

export default function App() {
  const [config, setConfig] = useState<GradientConfig>(defaultConfig);
  const [displayConfig, setDisplayConfig] = useState<GradientConfig>(defaultConfig);
  const [leftWidth, setLeftWidth] = useState<number>(60);
  const [isDraggingDivider, setIsDraggingDivider] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteGradient[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const animStartRef = useRef<GradientConfig | null>(null);
  const animTargetRef = useRef<GradientConfig | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_KEY);
      if (saved) {
        setFavorites(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load favorites:', e);
    }
  }, []);

  const saveFavorites = useCallback((newFavorites: FavoriteGradient[]) => {
    setFavorites(newFavorites);
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
    } catch (e) {
      console.error('Failed to save favorites:', e);
    }
  }, []);

  const updateStops = useCallback((stops: ColorStop[]) => {
    if (isAnimating) return;
    setConfig((prev) => ({ ...prev, stops }));
    setDisplayConfig((prev) => ({ ...prev, stops }));
  }, [isAnimating]);

  const updateType = useCallback((type: GradientType) => {
    setConfig((prev) => ({ ...prev, type }));
    setDisplayConfig((prev) => ({ ...prev, type }));
  }, []);

  const updateAngle = useCallback((angle: number) => {
    if (isAnimating) return;
    setConfig((prev) => ({ ...prev, angle }));
    setDisplayConfig((prev) => ({ ...prev, angle }));
  }, [isAnimating]);

  const updateShape = useCallback((shape: 'circle' | 'ellipse') => {
    setConfig((prev) => ({ ...prev, shape }));
    setDisplayConfig((prev) => ({ ...prev, shape }));
  }, []);

  const animateToConfig = useCallback((target: GradientConfig) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    animStartRef.current = { ...displayConfig };
    animTargetRef.current = target;
    setIsAnimating(true);

    const duration = 400;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const t = Math.min(elapsed / duration, 1);
      const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      if (animStartRef.current && animTargetRef.current) {
        const interpolated: GradientConfig = {
          type: animTargetRef.current.type,
          stops: lerpStops(animStartRef.current.stops, animTargetRef.current.stops, easeT),
          angle: lerpAngle(animStartRef.current.angle, animTargetRef.current.angle, easeT),
          shape: animTargetRef.current.shape,
        };
        setDisplayConfig(interpolated);
      }

      if (t < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setConfig(target);
        setDisplayConfig(target);
        setIsAnimating(false);
        animationRef.current = null;
        animStartRef.current = null;
        animTargetRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [displayConfig]);

  const applyPreset = useCallback((presetId: string) => {
    const preset = presetGradients.find((p) => p.id === presetId);
    if (!preset) return;

    const targetConfig: GradientConfig = {
      type: preset.type,
      stops: preset.stops.map((s) => ({ ...s })),
      angle: preset.angle ?? config.angle,
      shape: preset.shape ?? config.shape,
    };

    animateToConfig(targetConfig);
  }, [config.angle, config.shape, animateToConfig]);

  const addFavorite = useCallback(() => {
    const newFavorite: FavoriteGradient = {
      id: `fav_${Date.now()}`,
      name: `渐变收藏 ${favorites.length + 1}`,
      ...config,
      stops: config.stops.map((s) => ({ ...s })),
      createdAt: Date.now(),
    };
    saveFavorites([...favorites, newFavorite]);
  }, [config, favorites, saveFavorites]);

  const removeFavorite = useCallback((id: string) => {
    saveFavorites(favorites.filter((f) => f.id !== id));
  }, [favorites, saveFavorites]);

  const updateFavoriteName = useCallback((id: string, name: string) => {
    saveFavorites(favorites.map((f) => (f.id === id ? { ...f, name } : f)));
  }, [favorites, saveFavorites]);

  const applyFavorite = useCallback((favorite: FavoriteGradient) => {
    const targetConfig: GradientConfig = {
      type: favorite.type,
      stops: favorite.stops.map((s) => ({ ...s })),
      angle: favorite.angle,
      shape: favorite.shape,
    };
    animateToConfig(targetConfig);
  }, [animateToConfig]);

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingDivider(true);
  }, []);

  useEffect(() => {
    if (!isDraggingDivider) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      let percentage = (x / rect.width) * 100;

      const minLeftPercent = (480 / rect.width) * 100;
      const maxLeftPercent = 100 - (320 / rect.width) * 100;

      percentage = Math.max(minLeftPercent, Math.min(maxLeftPercent, percentage));
      setLeftWidth(percentage);
    };

    const handleMouseUp = () => {
      setIsDraggingDivider(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingDivider]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        background: '#1a1a2e',
        position: 'relative',
      }}
    >
      <div
        style={{
          width: `${leftWidth}%`,
          minWidth: '480px',
          height: '100%',
          transition: isDraggingDivider ? 'none' : 'width 0.3s ease',
        }}
      >
        <GradientPreview config={displayConfig} onUpdateStops={updateStops} />
      </div>

      <div
        onMouseDown={handleDividerMouseDown}
        style={{
          width: '4px',
          cursor: 'col-resize',
          background: isDraggingDivider ? '#e94560' : '#2a2a4a',
          transition: 'background-color 0.2s ease',
          flexShrink: 0,
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '20px',
            height: '40px',
            background: isDraggingDivider ? '#e94560' : '#2a2a4a',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2px',
            transition: 'background-color 0.2s ease',
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: '2px',
                height: '16px',
                borderRadius: '1px',
                background: isDraggingDivider ? '#fff' : '#555',
                transition: 'background-color 0.2s ease',
              }}
            />
          ))}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minWidth: '320px',
          height: '100%',
          overflow: 'auto',
        }}
      >
        <ControlPanel
          config={config}
          displayConfig={displayConfig}
          favorites={favorites}
          onUpdateStops={updateStops}
          onUpdateType={updateType}
          onUpdateAngle={updateAngle}
          onUpdateShape={updateShape}
          onApplyPreset={applyPreset}
          onAddFavorite={addFavorite}
          onRemoveFavorite={removeFavorite}
          onUpdateFavoriteName={updateFavoriteName}
          onApplyFavorite={applyFavorite}
        />
      </div>
    </div>
  );
}
