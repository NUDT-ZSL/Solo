import { useEffect, useRef, useState, useCallback } from 'react';
import { CanvasRenderer } from './utils/canvasRenderer';
import { SceneController, type SceneId } from './utils/sceneController';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const sceneControllerRef = useRef<SceneController | null>(null);
  const rafIdRef = useRef<number>(0);

  const [currentScene, setCurrentScene] = useState<SceneId>('default');
  const [hoverDawn, setHoverDawn] = useState(false);
  const [hoverAurora, setHoverAurora] = useState(false);

  const dawnBtnRef = useRef<HTMLButtonElement>(null);
  const auroraBtnRef = useRef<HTMLButtonElement>(null);

  const handleMouseDown = useCallback((e: MouseEvent | TouchEvent) => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    renderer.setDragging(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    renderer.setDragging(false);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    let clientX: number, clientY: number;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    if (e.target === dawnBtnRef.current || e.target === auroraBtnRef.current) return;
    const dawnRect = dawnBtnRef.current?.getBoundingClientRect();
    const auroraRect = auroraBtnRef.current?.getBoundingClientRect();
    if (dawnRect && clientX >= dawnRect.left && clientX <= dawnRect.right &&
        clientY >= dawnRect.top && clientY <= dawnRect.bottom) return;
    if (auroraRect && clientX >= auroraRect.left && clientX <= auroraRect.right &&
        clientY >= auroraRect.top && clientY <= auroraRect.bottom) return;

    renderer.setLightPosition(clientX, clientY);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const renderer = new CanvasRenderer(canvas);
    const sceneController = new SceneController('default');

    rendererRef.current = renderer;
    sceneControllerRef.current = sceneController;

    sceneController.setBurstCallback((color: string) => {
      renderer.triggerBurst(color);
    });

    sceneController.setSceneChangeCallback((id: SceneId) => {
      setCurrentScene(id);
    });

    const renderLoop = (now: number) => {
      const params = sceneController.getRenderParams(now);
      renderer.render(now, params);
      rafIdRef.current = requestAnimationFrame(renderLoop);
    };
    rafIdRef.current = requestAnimationFrame(renderLoop);

    const handleResize = () => {
      renderer.resize();
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('touchstart', handleMouseDown, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleMouseMove, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(rafIdRef.current);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('touchstart', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  }, [handleMouseDown, handleMouseUp, handleMouseMove]);

  const handleSceneSwitch = useCallback((sceneId: SceneId, e: React.MouseEvent<HTMLButtonElement>) => {
    const controller = sceneControllerRef.current;
    const renderer = rendererRef.current;
    if (!controller || !renderer) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    renderer.triggerRipple(cx, cy);

    controller.switchScene(sceneId);
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          cursor: 'grab',
        }}
      />

      <button
        ref={dawnBtnRef}
        onClick={(e) => handleSceneSwitch('dawn', e)}
        onMouseEnter={() => setHoverDawn(true)}
        onMouseLeave={() => setHoverDawn(false)}
        title="晨曦场景"
        style={{
          position: 'fixed',
          left: 32,
          bottom: 32,
          width: 50,
          height: 50,
          borderRadius: '50%',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          background: currentScene === 'dawn'
            ? 'rgba(255, 140, 0, 0.3)'
            : 'rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease',
          transform: hoverDawn ? 'scale(1.1) rotate(5deg)' : 'scale(1) rotate(0deg)',
          outline: 'none',
          padding: 0,
          boxShadow: currentScene === 'dawn'
            ? '0 0 20px rgba(255, 140, 0, 0.4)'
            : '0 4px 16px rgba(0, 0, 0, 0.3)',
        }}
      >
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="13" cy="15" r="6" fill="url(#sunGrad)" />
          <defs>
            <radialGradient id="sunGrad" cx="0.35" cy="0.35" r="0.8">
              <stop offset="0%" stopColor="#FFE4B5" />
              <stop offset="50%" stopColor="#FFA500" />
              <stop offset="100%" stopColor="#FF6347" />
            </radialGradient>
          </defs>
          <g stroke="#FFD700" strokeWidth="1.8" strokeLinecap="round" opacity="0.9">
            <line x1="13" y1="2.5" x2="13" y2="6.5" />
            <line x1="3.5" y1="8" x2="6.5" y2="10" />
            <line x1="22.5" y1="8" x2="19.5" y2="10" />
            <line x1="1" y1="16.5" x2="4.5" y2="16" />
            <line x1="25" y1="16.5" x2="21.5" y2="16" />
          </g>
          <path
            d="M2 23.5 Q13 19 24 23.5"
            stroke="#FF7F50"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            opacity="0.85"
          />
        </svg>
      </button>

      <button
        ref={auroraBtnRef}
        onClick={(e) => handleSceneSwitch('aurora', e)}
        onMouseEnter={() => setHoverAurora(true)}
        onMouseLeave={() => setHoverAurora(false)}
        title="极光场景"
        style={{
          position: 'fixed',
          right: 32,
          bottom: 32,
          width: 50,
          height: 50,
          borderRadius: '50%',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          background: currentScene === 'aurora'
            ? 'rgba(138, 43, 226, 0.3)'
            : 'rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease',
          transform: hoverAurora ? 'scale(1.1) rotate(5deg)' : 'scale(1) rotate(0deg)',
          outline: 'none',
          padding: 0,
          boxShadow: currentScene === 'aurora'
            ? '0 0 20px rgba(138, 43, 226, 0.4)'
            : '0 4px 16px rgba(0, 0, 0, 0.3)',
        }}
      >
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="auroraGrad1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#00FF7F" />
              <stop offset="100%" stopColor="#40E0D0" />
            </linearGradient>
            <linearGradient id="auroraGrad2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#40E0D0" />
              <stop offset="100%" stopColor="#8A2BE2" />
            </linearGradient>
            <linearGradient id="auroraGrad3" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#8A2BE2" />
              <stop offset="100%" stopColor="#00CED1" />
            </linearGradient>
          </defs>
          <path
            d="M1.5 9 Q6 4 10 8 Q14 12 18 6 Q22 2 24.5 5"
            stroke="url(#auroraGrad1)"
            strokeWidth="2.2"
            fill="none"
            strokeLinecap="round"
            opacity="0.95"
          />
          <path
            d="M1.5 14 Q7 8 11 13 Q15 18 20 11 Q23 6.5 24.5 10"
            stroke="url(#auroraGrad2)"
            strokeWidth="2.2"
            fill="none"
            strokeLinecap="round"
            opacity="0.9"
          />
          <path
            d="M2 19.5 Q7 15 11 18.5 Q15 22 19.5 17 Q22.5 13.5 24.5 16.5"
            stroke="url(#auroraGrad3)"
            strokeWidth="2.2"
            fill="none"
            strokeLinecap="round"
            opacity="0.85"
          />
          <circle cx="20" cy="3.5" r="1.1" fill="#FFFFFF" opacity="0.95" />
          <circle cx="5" cy="5.5" r="0.8" fill="#FFFFFF" opacity="0.8" />
          <circle cx="15.5" cy="1.5" r="0.7" fill="#FFFFFF" opacity="0.7" />
        </svg>
      </button>

      <div
        style={{
          position: 'fixed',
          top: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '8px 20px',
          borderRadius: 20,
          background: 'rgba(255, 255, 255, 0.06)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: 13,
          letterSpacing: 1,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        ✦ 按住拖拽光源 · 点击按钮切换场景 ✦
      </div>
    </div>
  );
}

export default App;
