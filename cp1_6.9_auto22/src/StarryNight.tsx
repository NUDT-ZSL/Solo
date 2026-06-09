import { useRef, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, CSS2DObject } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { ParticleField } from './ParticleField';
import { TextAnalyzer, type WordData } from './TextAnalyzer';

function SceneContent({
  inputText,
  resetTrigger,
  onHoverWord,
  labelPosition,
  hoveredWord
}: {
  inputText: string;
  resetTrigger: number;
  onHoverWord: (word: string | null, pos: THREE.Vector3 | null) => void;
  labelPosition: THREE.Vector3 | null;
  hoveredWord: string | null;
}) {
  const particleFieldRef = useRef<ParticleField | null>(null);
  const { scene, camera } = useThree();
  const lastTextRef = useRef('');
  const lastResetRef = useRef(0);

  useEffect(() => {
    if (!scene || !camera) return;
    const cam = camera as THREE.PerspectiveCamera;
    const pf = new ParticleField(scene, cam);
    particleFieldRef.current = pf;

    pf.onHover = (word, pos) => {
      onHoverWord(word, pos);
    };

    return () => {
      pf.dispose();
      particleFieldRef.current = null;
    };
  }, [scene, camera, onHoverWord]);

  useEffect(() => {
    if (!particleFieldRef.current) return;
    if (inputText === lastTextRef.current && resetTrigger === lastResetRef.current) return;

    if (resetTrigger !== lastResetRef.current) {
      particleFieldRef.current.resetToIdle();
      lastResetRef.current = resetTrigger;
      lastTextRef.current = '';
      return;
    }

    if (inputText && inputText.trim().length > 0) {
      const wordData = TextAnalyzer.analyze(inputText);
      particleFieldRef.current.updateParticles(wordData);
    } else {
      particleFieldRef.current.resetToIdle();
    }
    lastTextRef.current = inputText;
  }, [inputText, resetTrigger]);

  useFrame((_, delta) => {
    if (particleFieldRef.current) {
      const safeDelta = Math.min(delta, 0.05);
      particleFieldRef.current.animate(safeDelta);
    }
  });

  return (
    <>
      <ambientLight intensity={0.3} />
      {labelPosition && hoveredWord && (
        <CSS2DObject position={labelPosition}>
          <div
            style={{
              padding: '4px 10px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(64,224,208,0.4)',
              borderRadius: '6px',
              color: '#ffffff',
              fontSize: '14px',
              fontFamily: 'system-ui, sans-serif',
              whiteSpace: 'nowrap',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              pointerEvents: 'none',
              transform: 'translateY(-20px)',
              boxShadow: '0 0 12px rgba(64,224,208,0.3)',
              fontWeight: 500,
              letterSpacing: '0.5px'
            }}
          >
            {hoveredWord}
          </div>
        </CSS2DObject>
      )}
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.1}
          luminanceSmoothing={0.8}
          intensity={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

export default function StarryNight() {
  const [inputText, setInputText] = useState('');
  const [displayText, setDisplayText] = useState('');
  const [resetTrigger, setResetTrigger] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);
  const [labelPosition, setLabelPosition] = useState<THREE.Vector3 | null>(null);
  const debounceRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsVisible(true), 50);
    return () => window.clearTimeout(timer);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length > 100) return;
    setInputText(value);

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      setDisplayText(value);
    }, 300);
  }, []);

  const handleReset = useCallback(() => {
    setInputText('');
    setDisplayText('');
    setHoveredWord(null);
    setLabelPosition(null);
    setResetTrigger(prev => prev + 1);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    window.dispatchEvent(new CustomEvent('starry-pointer-move', {
      detail: { x, y }
    }));
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    window.dispatchEvent(new CustomEvent('starry-click', {
      detail: { x, y }
    }));
  }, []);

  const handleHoverWord = useCallback((word: string | null, pos: THREE.Vector3 | null) => {
    setHoveredWord(word);
    setLabelPosition(pos ? pos.clone().add(new THREE.Vector3(0, 2, 0)) : null);
  }, []);

  useEffect(() => {
    const canvas = containerRef.current?.querySelector('canvas');
    if (!canvas) return;

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      const event = new CustomEvent('starry-pointer-raw', { detail: { x, y } });
      window.dispatchEvent(event);
    };

    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      const event = new CustomEvent('starry-click-raw', { detail: { x, y } });
      window.dispatchEvent(event);
    };

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('click', onClick);
    return () => {
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('click', onClick);
    };
  }, [inputText]);

  useEffect(() => {
    const onRawPointerMove = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        const canvas = containerRef.current?.querySelector('canvas');
        if (!canvas) return;
        const internalEvent = new CustomEvent('starry-internal-pointer', { detail });
        window.dispatchEvent(internalEvent);
      }
    };
    const onRawClick = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        const internalEvent = new CustomEvent('starry-internal-click', { detail });
        window.dispatchEvent(internalEvent);
      }
    };
    window.addEventListener('starry-pointer-raw', onRawPointerMove);
    window.addEventListener('starry-click-raw', onRawClick);
    return () => {
      window.removeEventListener('starry-pointer-raw', onRawPointerMove);
      window.removeEventListener('starry-click-raw', onRawClick);
    };
  }, []);

  useEffect(() => {
    const onInternalPointer = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      const pf = window.__particleFieldInstance as ParticleField | undefined;
      if (pf) {
        pf.handlePointerMove(detail.x, detail.y);
      }
      const pfState = window.__particleFieldState as { particleField?: ParticleField } | undefined;
      if (pfState?.particleField) {
        pfState.particleField.handlePointerMove(detail.x, detail.y);
      }
    };
    const onInternalClick = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      const pf = window.__particleFieldInstance as ParticleField | undefined;
      if (pf) {
        pf.handleClick(detail.x, detail.y);
      }
      const pfState = window.__particleFieldState as { particleField?: ParticleField } | undefined;
      if (pfState?.particleField) {
        pfState.particleField.handleClick(detail.x, detail.y);
      }
    };
    window.addEventListener('starry-internal-pointer', onInternalPointer);
    window.addEventListener('starry-internal-click', onInternalClick);
    return () => {
      window.removeEventListener('starry-internal-pointer', onInternalPointer);
      window.removeEventListener('starry-internal-click', onInternalClick);
    };
  }, []);

  const ParticleBridge = () => {
    const { scene, camera } = useThree();
    useEffect(() => {
      const cam = camera as THREE.PerspectiveCamera;
      const state = window.__particleFieldState as { particleField?: ParticleField } | undefined;
      let observer: { pf: ParticleField | null } | null = null;

      const findParticleField = () => {
        for (const child of scene.children) {
          if (child.userData?.isParticleFieldContainer) {
            return child.userData.particleField as ParticleField;
          }
        }
        return null;
      };

      const checkInterval = window.setInterval(() => {
        const pf = findParticleField();
        if (pf) {
          window.__particleFieldInstance = pf;
          window.clearInterval(checkInterval);
        }
      }, 100);

      const tryBridge = () => {
        const pf = findParticleField();
        if (pf) {
          window.__particleFieldInstance = pf;
          pf.onHover = (word, pos) => {
            handleHoverWord(word, pos);
          };
        }
      };
      tryBridge();

      return () => {
        window.clearInterval(checkInterval);
        if (observer) observer.pf = null;
        _ = cam;
      };
    }, [scene, camera]);
    return null;
  };

  const BridgeAndForward = () => {
    const { scene, camera } = useThree();
    useEffect(() => {
      const registerPF = () => {
        let found: ParticleField | null = null;
        const traverse = (obj: THREE.Object3D) => {
          if (found) return;
          if (obj.userData?.particleField instanceof ParticleField) {
            found = obj.userData.particleField;
          }
          for (const c of obj.children) traverse(c);
        };
        traverse(scene);
        if (found) {
          window.__particleFieldInstance = found;
          found.onHover = (w, p) => handleHoverWord(w, p);
          return true;
        }
        return false;
      };

      if (!registerPF()) {
        const iv = window.setInterval(() => {
          if (registerPF()) window.clearInterval(iv);
        }, 80);
        const to = window.setTimeout(() => window.clearInterval(iv), 3000);
        return () => {
          window.clearInterval(iv);
          window.clearTimeout(to);
        };
      }
      _ = camera;
    }, [scene, camera]);
    return null;
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100vw',
        height: '100vh',
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(ellipse at center, #0d1b2a 0%, #0a0a0a 65%, #050505 100%)',
        overflow: 'hidden',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 2s ease-out',
        touchAction: 'none'
      }}
      onPointerMove={handlePointerMove}
      onClick={handleClick}
    >
      <Canvas
        camera={{
          position: [0, 0, 80],
          fov: 60,
          near: 0.1,
          far: 1000
        }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: false
        }}
        dpr={[1, Math.min(window.devicePixelRatio, 2)]}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%'
        }}
        shadows={false}
      >
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={30}
          maxDistance={150}
          enableDamping={true}
          dampingFactor={0.08}
          rotateSpeed={0.6}
          zoomSpeed={0.8}
        />
        <SceneContent
          inputText={displayText}
          resetTrigger={resetTrigger}
          onHoverWord={handleHoverWord}
          labelPosition={labelPosition}
          hoveredWord={hoveredWord}
        />
        <ParticleFieldAccessor />
        <BridgeAndForward />
      </Canvas>

      <div
        style={{
          position: 'absolute',
          top: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          width: '100%',
          maxWidth: '320px',
          padding: '0 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          pointerEvents: 'none'
        }}
      >
        <div
          style={{
            width: '100%',
            padding: '12px 16px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(64,224,208,0.4)',
            borderRadius: '12px',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
            pointerEvents: 'auto'
          }}
        >
          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder="输入文字，点亮思絮星河..."
            maxLength={100}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#ffffff',
              fontSize: '15px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontWeight: 400,
              letterSpacing: '0.3px',
              placeholder: 'rgba(255,255,255,0.4)' as unknown as string
            }}
          />
          <div
            style={{
              marginTop: '6px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span
              style={{
                color: 'rgba(255,255,255,0.35)',
                fontSize: '11px',
                fontFamily: 'system-ui, sans-serif',
                letterSpacing: '0.3px'
              }}
            >
              {inputText.length} / 100
            </span>
            <button
              onClick={handleReset}
              style={{
                padding: '5px 14px',
                background: 'rgba(64,224,208,0.1)',
                border: '1px solid rgba(64,224,208,0.3)',
                borderRadius: '6px',
                color: '#40E0D0',
                fontSize: '12px',
                fontFamily: 'system-ui, sans-serif',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                letterSpacing: '0.5px',
                fontWeight: 500
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.background = 'rgba(64,224,208,0.2)';
                (e.target as HTMLButtonElement).style.boxShadow = '0 0 12px rgba(64,224,208,0.3)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.background = 'rgba(64,224,208,0.1)';
                (e.target as HTMLButtonElement).style.boxShadow = 'none';
              }}
            >
              重置场景
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'rgba(255,255,255,0.25)',
            fontSize: '11px',
            fontFamily: 'system-ui, sans-serif',
            letterSpacing: '0.5px',
            marginTop: '4px'
          }}
        >
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'linear-gradient(135deg, #8A2BE2, #00FFFF)' }} />
          <span>正面词义</span>
          <span style={{ margin: '0 4px', opacity: 0.3 }}>·</span>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'linear-gradient(135deg, #FF4500, #C71585)' }} />
          <span>负面词义</span>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(255,255,255,0.18)',
          fontSize: '11px',
          fontFamily: 'system-ui, sans-serif',
          letterSpacing: '0.8px',
          textAlign: 'center',
          zIndex: 10,
          pointerEvents: 'none'
        }}
      >
        <div style={{ marginBottom: '4px' }}>拖拽旋转视角 · 悬停查看词语 · 点击触发脉冲</div>
        <div style={{ fontSize: '10px', opacity: 0.7 }}>THOUGHT STREAM VISUALIZATION</div>
      </div>
    </div>
  );
}

function ParticleFieldAccessor() {
  const { scene, camera } = useThree();
  const pfRef = useRef<ParticleField | null>(null);

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const existingObj = scene.getObjectByName('__pf_container__');
    if (existingObj && existingObj.userData?.particleField) {
      pfRef.current = existingObj.userData.particleField;
      window.__particleFieldInstance = pfRef.current;
      return;
    }

    const container = new THREE.Object3D();
    container.name = '__pf_container__';
    const pf = new ParticleField(scene, cam);
    container.userData.particleField = pf;
    container.userData.isParticleFieldContainer = true;
    scene.add(container);
    pfRef.current = pf;
    window.__particleFieldInstance = pf;
    _ = cam;

    return () => {
    };
  }, [scene, camera]);

  return null;
}

declare global {
  interface Window {
    __particleFieldInstance?: ParticleField;
    __particleFieldState?: { particleField?: ParticleField };
  }
}

let _: unknown;
