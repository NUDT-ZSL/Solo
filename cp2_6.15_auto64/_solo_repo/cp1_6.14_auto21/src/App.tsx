import { useRef, useEffect, useState, useCallback } from 'react';
import {
  PhysicsEngine, MaterialType, MaterialParams,
  CANVAS_WIDTH, CANVAS_HEIGHT, SURFACE_WIDTH, CHAR_WIDTH, CHAR_HEIGHT,
  CHAR_HEAD_HEIGHT, GROUND_Y, MATERIALS, DEFAULT_PARAMS
} from './PhysicsEngine';
import { ParticleSystem } from './ParticleSystem';
import { AudioManager } from './AudioManager';
import { GlobalSettings } from './components/GlobalSettings';
import { MaterialEditor } from './components/MaterialEditor';

const MATERIAL_NAMES: Record<MaterialType, string> = {
  grass: '草地', sand: '沙地', stone: '石板', metal: '金属', wood: '木地板'
};

const MATERIAL_COLORS: Record<MaterialType, string[]> = {
  grass: ['#166534', '#15803d', '#22c55e'],
  sand: ['#a16207', '#ca8a04', '#eab308'],
  stone: ['#57534e', '#78716c', '#a8a29e'],
  metal: ['#475569', '#64748b', '#94a3b8'],
  wood: ['#78350f', '#92400e', '#b45309']
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const physicsRef = useRef<PhysicsEngine | null>(null);
  const particlesRef = useRef<ParticleSystem | null>(null);
  const audioRef = useRef<AudioManager | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const fpsHistoryRef = useRef<number[]>([]);
  const hoveredBtnRef = useRef<number | null>(null);

  const [paused, setPaused] = useState(false);
  const [materialParams, setMaterialParams] = useState<Record<MaterialType, MaterialParams>>(
    () => ({ ...DEFAULT_PARAMS })
  );
  const [editorOpen, setEditorOpen] = useState<MaterialType | null>(null);
  const [editorPos, setEditorPos] = useState({ x: 0, y: 0 });
  const [fps, setFps] = useState(60);
  const [particleCount, setParticleCount] = useState(0);

  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const materialParamsRef = useRef(materialParams);
  materialParamsRef.current = materialParams;

  const handleParamChange = useCallback((material: MaterialType, params: MaterialParams) => {
    setMaterialParams(prev => {
      const next = { ...prev, [material]: params };
      if (physicsRef.current) {
        physicsRef.current.materialParams = next;
      }
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setMaterialParams({ ...DEFAULT_PARAMS });
    if (physicsRef.current) {
      physicsRef.current.materialParams = { ...DEFAULT_PARAMS };
      physicsRef.current.reset();
    }
    if (particlesRef.current) {
      particlesRef.current.clear();
    }
  }, []);

  const handleTogglePause = useCallback(() => {
    setPaused(p => !p);
  }, []);

  const openEditor = useCallback((material: MaterialType, canvasRect: DOMRect, idx: number) => {
    const btnScreenX = canvasRect.left + (idx * SURFACE_WIDTH + SURFACE_WIDTH - 20);
    const btnScreenY = canvasRect.top + (GROUND_Y - 80);
    setEditorPos({
      x: Math.min(btnScreenX - 140, window.innerWidth - 300),
      y: Math.max(btnScreenY - 200, 10)
    });
    setEditorOpen(material);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    const physics = new PhysicsEngine();
    const particles = new ParticleSystem();
    const audio = new AudioManager();

    physicsRef.current = physics;
    particlesRef.current = particles;
    audioRef.current = audio;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') physics.keys.left = true;
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') physics.keys.right = true;
      if (e.key === ' ') { physics.keys.jump = true; e.preventDefault(); }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') physics.keys.left = false;
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') physics.keys.right = false;
      if (e.key === ' ') physics.keys.jump = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      let found: number | null = null;
      MATERIALS.forEach((_mat, idx) => {
        const bx = idx * SURFACE_WIDTH + SURFACE_WIDTH - 20;
        const by = GROUND_Y - 64;
        const dist = Math.sqrt((mx - bx) ** 2 + (my - by) ** 2);
        if (dist <= 16) found = idx;
      });
      hoveredBtnRef.current = found;
      canvas.style.cursor = found !== null ? 'pointer' : 'default';
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousemove', handleMouseMove);

    let prevStepMaterial: MaterialType | null = null;

    const gameLoop = (timestamp: number) => {
      animFrameRef.current = requestAnimationFrame(gameLoop);

      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
        return;
      }

      const rawDt = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;
      const dt = Math.min(rawDt, 1 / 30);

      const currentFps = rawDt > 0 ? 1 / rawDt : 60;
      fpsHistoryRef.current.push(currentFps);
      if (fpsHistoryRef.current.length > 30) fpsHistoryRef.current.shift();
      const avgFps = fpsHistoryRef.current.reduce((a, b) => a + b, 0) / fpsHistoryRef.current.length;

      if (!pausedRef.current) {
        physics.materialParams = materialParamsRef.current;
        physics.update(dt);
        particles.update(dt);

        const state = physics.state;

        if (state.justLanded && state.currentMaterial) {
          particles.emit(state.x + CHAR_WIDTH / 2, GROUND_Y, state.currentMaterial);
          audio.playLand(state.currentMaterial);
          prevStepMaterial = null;
          audio.stopStepLoop();
        }

        if (state.isMoving && state.onGround && state.currentMaterial) {
          if (prevStepMaterial !== state.currentMaterial) {
            audio.playStep(state.currentMaterial, Math.abs(state.vx));
            prevStepMaterial = state.currentMaterial;
          }
        } else {
          if (!state.isMoving && prevStepMaterial) {
            audio.stopStepLoop();
            prevStepMaterial = null;
          }
        }
      }

      setFps(Math.round(avgFps));
      setParticleCount(particles.getCount());

      renderScene(ctx, physics, particles);
    };

    lastTimeRef.current = 0;
    animFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('mousemove', handleMouseMove);
      audio.stopStepLoop();
    };
  }, []);

  const renderScene = (
    ctx: CanvasRenderingContext2D,
    physics: PhysicsEngine,
    particles: ParticleSystem
  ) => {
    const state = physics.state;

    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#1e293b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    MATERIALS.forEach((mat, idx) => {
      const x = idx * SURFACE_WIDTH;
      const colors = MATERIAL_COLORS[mat];
      const g = ctx.createLinearGradient(x, GROUND_Y, x, CANVAS_HEIGHT);
      g.addColorStop(0, colors[1]);
      g.addColorStop(0.5, colors[0]);
      g.addColorStop(1, colors[2]);
      ctx.fillStyle = g;
      ctx.fillRect(x, GROUND_Y, SURFACE_WIDTH, CANVAS_HEIGHT - GROUND_Y);

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, GROUND_Y);
      ctx.lineTo(x + SURFACE_WIDTH, GROUND_Y);
      ctx.stroke();

      if (idx > 0) {
        ctx.beginPath();
        ctx.moveTo(x, GROUND_Y);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
      }

      ctx.fillStyle = '#00000060';
      const labelW = 48;
      const labelH = 22;
      const labelX = x + 4;
      const labelY = GROUND_Y + 6;
      ctx.beginPath();
      ctx.roundRect(labelX, labelY, labelW, labelH, 4);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(MATERIAL_NAMES[mat], labelX + labelW / 2, labelY + labelH / 2);
    });

    const charBottom = state.y + CHAR_HEIGHT;
    const heightAboveGround = GROUND_Y - charBottom;
    const shadowScale = Math.max(0.3, 1 - heightAboveGround / 200);
    const shadowOpacity = 0.3 * shadowScale;
    const shadowWidth = 20 * shadowScale;
    ctx.fillStyle = `rgba(0,0,0,${shadowOpacity})`;
    ctx.beginPath();
    ctx.ellipse(state.x + CHAR_WIDTH / 2, GROUND_Y - 2, shadowWidth / 2, 4 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    particles.render(ctx);

    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(state.x, state.y + CHAR_HEAD_HEIGHT, CHAR_WIDTH, CHAR_HEIGHT - CHAR_HEAD_HEIGHT);

    ctx.fillStyle = '#22c55e';
    ctx.fillRect(state.x, state.y, CHAR_WIDTH, CHAR_HEAD_HEIGHT);

    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 1;
    ctx.strokeRect(state.x, state.y, CHAR_WIDTH, CHAR_HEIGHT);
    ctx.beginPath();
    ctx.moveTo(state.x, state.y + CHAR_HEAD_HEIGHT);
    ctx.lineTo(state.x + CHAR_WIDTH, state.y + CHAR_HEAD_HEIGHT);
    ctx.stroke();

    const fpsColor = fps >= 50 ? '#22c55e' : fps >= 30 ? '#eab308' : '#ef4444';
    ctx.fillStyle = '#00000080';
    ctx.beginPath();
    ctx.roundRect(8, CANVAS_HEIGHT - 88, 200, 80, 8);
    ctx.fill();

    ctx.fillStyle = fpsColor;
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`FPS: ${fps}`, 20, CANVAS_HEIGHT - 76);

    ctx.fillStyle = '#fff';
    ctx.fillText(`粒子: ${particleCount}`, 20, CANVAS_HEIGHT - 52);
    ctx.fillText(`材质: ${state.currentMaterial ? MATERIAL_NAMES[state.currentMaterial] : '-'}`, 20, CANVAS_HEIGHT - 28);

    MATERIALS.forEach((_mat, idx) => {
      const bx = idx * SURFACE_WIDTH + SURFACE_WIDTH - 20;
      const by = GROUND_Y - 64;
      const isHovered = hoveredBtnRef.current === idx;
      ctx.fillStyle = isHovered ? '#ffffff80' : '#ffffff40';
      ctx.beginPath();
      ctx.arc(bx, by, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚙', bx, by);
    });
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    MATERIALS.forEach((mat, idx) => {
      const bx = idx * SURFACE_WIDTH + SURFACE_WIDTH - 20;
      const by = GROUND_Y - 64;
      const dist = Math.sqrt((mx - bx) ** 2 + (my - by) ** 2);
      if (dist <= 16) {
        openEditor(mat, rect, idx);
      }
    });
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onClick={handleCanvasClick}
        style={{
          border: '1px solid #334155',
          borderRadius: '8px'
        }}
      />

      <GlobalSettings
        paused={paused}
        onTogglePause={handleTogglePause}
        onReset={handleReset}
      />

      {editorOpen && (
        <MaterialEditor
          material={editorOpen}
          params={materialParams[editorOpen]}
          onChange={handleParamChange}
          onClose={() => setEditorOpen(null)}
          position={editorPos}
        />
      )}
    </div>
  );
}
