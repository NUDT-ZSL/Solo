import { useState, useEffect, useRef, useCallback } from 'react';
import { ParticleNebula } from './particle-nebula';
import { GestureCapture } from './gesture-capture';
import { MusicReactor } from './music-reactor';
import eventBus from './event-bus';
import { ParticleShape } from './types';

const styles: Record<string, React.CSSProperties> = {
  app: {
    position: 'fixed',
    inset: 0,
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    background: '#0a0a1a',
    fontFamily: "'Courier New', Monaco, Consolas, monospace"
  },
  canvasContainer: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%'
  },
  video: {
    position: 'absolute',
    width: 0,
    height: 0,
    opacity: 0,
    pointerEvents: 'none'
  },
  playButton: {
    position: 'absolute',
    top: 'clamp(16px, 3vw, 28px)',
    left: 'clamp(16px, 3vw, 28px)',
    width: 'clamp(40px, 7vw, 56px)',
    height: 'clamp(40px, 7vw, 56px)',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    background: 'linear-gradient(135deg, #f72585 0%, #b5179e 100%)',
    color: '#fff',
    fontSize: 'clamp(16px, 3vw, 22px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 0 rgba(247,37,133,0)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    zIndex: 100,
    userSelect: 'none'
  },
  playButtonHover: {
    transform: 'scale(1.1)',
    boxShadow: '0 0 20px rgba(247,37,133,0.6)'
  },
  fpsCounter: {
    position: 'absolute',
    top: 'clamp(16px, 3vw, 20px)',
    right: 'clamp(16px, 3vw, 20px)',
    padding: '6px 10px',
    background: 'rgba(0,0,0,0.5)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold',
    letterSpacing: '1px',
    zIndex: 100,
    userSelect: 'none',
    transition: 'all 0.2s ease'
  },
  fpsCounterMobile: {
    top: 'auto',
    right: 'auto',
    bottom: '80px',
    left: '16px'
  },
  fpsWarning: {
    position: 'absolute',
    bottom: '80px',
    left: '16px',
    padding: '10px 14px',
    background: 'rgba(0,0,0,0.7)',
    borderRadius: '8px',
    color: '#fbbf24',
    fontSize: '14px',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
    zIndex: 100,
    userSelect: 'none',
    opacity: 0,
    transform: 'translateY(10px)',
    transition: 'opacity 0.3s ease, transform 0.3s ease',
    pointerEvents: 'none'
  },
  fpsWarningVisible: {
    opacity: 1,
    transform: 'translateY(0)'
  },
  statusBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '24px',
    background: 'rgba(10,10,30,0.8)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderTop: '1px solid rgba(124,58,237,0.2)',
    zIndex: 100
  },
  shapeButton: {
    width: 'clamp(36px, 6vw, 48px)',
    height: 'clamp(36px, 6vw, 48px)',
    borderRadius: '50%',
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'clamp(14px, 3vw, 20px)',
    background: '#4a4a6a',
    color: '#fff',
    transition: 'all 0.2s ease',
    userSelect: 'none'
  },
  shapeButtonActive: {
    background: '#f72585',
    boxShadow: '0 0 16px rgba(247,37,133,0.7)',
    borderColor: 'rgba(255,255,255,0.3)'
  },
  permissionOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(10,10,26,0.95)',
    zIndex: 200,
    padding: '20px',
    textAlign: 'center'
  },
  permissionTitle: {
    fontSize: 'clamp(20px, 4vw, 32px)',
    color: '#fff',
    marginBottom: '16px',
    background: 'linear-gradient(90deg, #7c3aed, #06b6d4, #f72585)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    fontWeight: 'bold',
    letterSpacing: '2px'
  },
  permissionText: {
    fontSize: 'clamp(12px, 2.5vw, 15px)',
    color: '#a0a0c0',
    maxWidth: '420px',
    lineHeight: '1.7',
    marginBottom: '24px'
  },
  permissionButton: {
    padding: '14px 32px',
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    background: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)',
    color: '#fff',
    fontSize: 'clamp(13px, 2.5vw, 16px)',
    fontWeight: 'bold',
    letterSpacing: '1px',
    transition: 'all 0.2s ease',
    fontFamily: "'Courier New', Monaco, Consolas, monospace"
  }
};

type PermissionStatus = 'idle' | 'requesting' | 'granted' | 'denied';

function App() {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const nebulaRef = useRef<ParticleNebula | null>(null);
  const gestureRef = useRef<GestureCapture | null>(null);
  const musicRef = useRef<MusicReactor | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentShape, setCurrentShape] = useState<ParticleShape>(ParticleShape.CLOUD);
  const [fps, setFps] = useState(60);
  const [showFpsWarning, setShowFpsWarning] = useState(false);
  const [hoverPlay, setHoverPlay] = useState(false);
  const [permission, setPermission] = useState<PermissionStatus>('idle');
  const [isMobile, setIsMobile] = useState(false);

  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fpsFramesRef = useRef({ count: 0, lastTime: performance.now() });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (canvasContainerRef.current && !nebulaRef.current) {
      nebulaRef.current = new ParticleNebula(canvasContainerRef.current);
      nebulaRef.current.start();
      setCurrentShape(ParticleShape.CLOUD);
    }

    let rafId: number;
    const measureFps = () => {
      fpsFramesRef.current.count++;
      const now = performance.now();
      const elapsed = now - fpsFramesRef.current.lastTime;
      if (elapsed >= 500) {
        const currentFps = Math.round((fpsFramesRef.current.count * 1000) / elapsed);
        setFps(currentFps);
        fpsFramesRef.current.count = 0;
        fpsFramesRef.current.lastTime = now;

        if (currentFps < 30) {
          setShowFpsWarning(true);
          if (warningTimeoutRef.current) {
            clearTimeout(warningTimeoutRef.current);
          }
          warningTimeoutRef.current = setTimeout(() => {
            setShowFpsWarning(false);
          }, 3000);
        }
      }
      rafId = requestAnimationFrame(measureFps);
    };
    rafId = requestAnimationFrame(measureFps);

    return () => {
      cancelAnimationFrame(rafId);
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      nebulaRef.current?.destroy();
      nebulaRef.current = null;
    };
  }, []);

  const requestPermissions = useCallback(async () => {
    if (permission === 'requesting') return;
    setPermission('requesting');

    try {
      if (videoRef.current) {
        gestureRef.current = new GestureCapture(videoRef.current);
      }
      musicRef.current = new MusicReactor();
      await musicRef.current.start();
      await gestureRef.current?.start();

      setPermission('granted');
      setIsPlaying(true);
      eventBus.emit('togglePlay', true);
    } catch (err) {
      console.warn('摄像头/麦克风不可用，使用降级模式（可使用按钮切换形态）:', err);
      setPermission('granted');
      setIsPlaying(true);
      eventBus.emit('togglePlay', true);
    }
  }, [permission]);

  const togglePlay = useCallback(() => {
    if (permission !== 'granted') {
      requestPermissions();
      return;
    }
    const newPlaying = !isPlaying;
    setIsPlaying(newPlaying);
    eventBus.emit('togglePlay', newPlaying);
    if (newPlaying) {
      nebulaRef.current?.start();
    } else {
      nebulaRef.current?.stop();
    }
  }, [isPlaying, permission, requestPermissions]);

  const handleSwitchShape = useCallback((shape: ParticleShape) => {
    setCurrentShape(shape);
    eventBus.emit('switchShape', shape);
    nebulaRef.current?.switchShape(shape);
  }, []);

  const PlayIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="6,4 20,12 6,20" />
    </svg>
  );

  const PauseIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );

  const SphereIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="6" />
    </svg>
  );

  const GalaxyIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2 C18 2 22 6 22 12 C22 18 18 22 12 22" />
      <path d="M12 2 C6 2 2 6 2 12 C2 18 6 22 12 22" opacity="0.6" />
      <path d="M12 6 C16 6 18 9 18 12 C18 15 16 18 12 18" opacity="0.4" />
    </svg>
  );

  return (
    <div style={styles.app}>
      <div ref={canvasContainerRef} style={styles.canvasContainer} />
      <video ref={videoRef} style={styles.video} muted playsInline />

      <button
        style={{
          ...styles.playButton,
          ...(hoverPlay || isPlaying ? styles.playButtonHover : {})
        }}
        onMouseEnter={() => setHoverPlay(true)}
        onMouseLeave={() => setHoverPlay(false)}
        onClick={togglePlay}
        title={isPlaying ? '暂停' : '启动'}
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>

      <div
        style={{
          ...styles.fpsCounter,
          ...(isMobile ? styles.fpsCounterMobile : {})
        }}
      >
        FPS {fps}
      </div>

      <div
        style={{
          ...styles.fpsWarning,
          ...(showFpsWarning ? styles.fpsWarningVisible : {})
        }}
      >
        ⚠ 性能警告：FPS 低于 30
      </div>

      <div style={styles.statusBar}>
        <button
          style={{
            ...styles.shapeButton,
            ...(currentShape === ParticleShape.SPHERE ? styles.shapeButtonActive : {})
          }}
          onClick={() => handleSwitchShape(ParticleShape.SPHERE)}
          title="球体形态（握拳）"
        >
          <SphereIcon />
        </button>
        <button
          style={{
            ...styles.shapeButton,
            ...(currentShape === ParticleShape.CLOUD ? styles.shapeButtonActive : {})
          }}
          onClick={() => handleSwitchShape(ParticleShape.CLOUD)}
          title="云雾形态（张开手掌）"
        >
          ☁️
        </button>
        <button
          style={{
            ...styles.shapeButton,
            ...(currentShape === ParticleShape.GALAXY ? styles.shapeButtonActive : {})
          }}
          onClick={() => handleSwitchShape(ParticleShape.GALAXY)}
          title="螺旋星系（V字手势）"
        >
          <GalaxyIcon />
        </button>
      </div>

      {permission !== 'granted' && (
        <div style={styles.permissionOverlay}>
          <div style={styles.permissionTitle}>GESTURE NEBULA</div>
          <div style={styles.permissionText}>
            {permission === 'idle' &&
              '请授权摄像头和麦克风权限，体验手势控制与音乐节奏驱动的三维粒子星云交互装置。握拳→聚合球体，张开手掌→离散云雾，食指中指并拢→螺旋星系。'}
            {permission === 'requesting' && '正在请求摄像头和麦克风权限，请在浏览器弹窗中选择允许...'}
            {permission === 'denied' && '权限被拒绝。请在浏览器设置中手动允许摄像头和麦克风访问，然后重试。'}
          </div>
          {(permission === 'idle' || permission === 'denied') && (
            <button
              style={{
                ...styles.permissionButton,
                ...(hoverPlay
                  ? { transform: 'scale(1.05)', boxShadow: '0 0 24px rgba(124,58,237,0.5)' }
                  : {})
              }}
              onMouseEnter={() => setHoverPlay(true)}
              onMouseLeave={() => setHoverPlay(false)}
              onClick={requestPermissions}
            >
              {permission === 'denied' ? '重新授权' : '开始体验'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
