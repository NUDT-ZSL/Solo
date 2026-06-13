import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Product } from '../main';
import { api } from '../services/api';
import DetailPanel from '../components/DetailPanel';
import ComparePanel from '../components/ComparePanel';

const ROOM_HALF = 6;
const ROOM_HEIGHT = 6;
const PLAYER_RADIUS = 0.4;
const BASE_MOVE_SPEED = 2;
const BASE_SENSITIVITY = 0.002;
const MOBILE_MOVE_SPEED = 1.5;
const MOBILE_SENSITIVITY = 0.0035;
const PODIUM_RADIUS = 0.4;
const PODIUM_HEIGHT = 0.6;
const PRODUCT_SPEED = 0.5;
const INTERACT_DISTANCE = 1.2;

interface PedestalPos {
  x: number;
  z: number;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== 'undefined' && window.innerWidth < 768
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

function FloorGrid() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_HALF * 2, ROOM_HALF * 2]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>
      <gridHelper
        args={[ROOM_HALF * 2, ROOM_HALF * 2, '#94a3b8', '#94a3b8']}
        position={[0, 0.002, 0]}
      />
    </group>
  );
}

function Walls() {
  const wallMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        colorTop: { value: new THREE.Color('#fbcfe8') },
        colorBottom: { value: new THREE.Color('#fce7f3') },
      },
      vertexShader: `
        varying vec3 vPosition;
        void main() {
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 colorTop;
        uniform vec3 colorBottom;
        varying vec3 vPosition;
        void main() {
          float mixFactor = (vPosition.y + 3.0) / 6.0;
          vec3 color = mix(colorBottom, colorTop, clamp(mixFactor, 0.0, 1.0));
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.DoubleSide,
    });
  }, []);

  return (
    <group>
      <mesh position={[0, ROOM_HEIGHT / 2, -ROOM_HALF]} material={wallMaterial}>
        <planeGeometry args={[ROOM_HALF * 2, ROOM_HEIGHT]} />
      </mesh>
      <mesh position={[0, ROOM_HEIGHT / 2, ROOM_HALF]} material={wallMaterial} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[ROOM_HALF * 2, ROOM_HEIGHT]} />
      </mesh>
      <mesh position={[-ROOM_HALF, ROOM_HEIGHT / 2, 0]} material={wallMaterial} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_HALF * 2, ROOM_HEIGHT]} />
      </mesh>
      <mesh position={[ROOM_HALF, ROOM_HEIGHT / 2, 0]} material={wallMaterial} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_HALF * 2, ROOM_HEIGHT]} />
      </mesh>
      <mesh position={[0, ROOM_HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_HALF * 2, ROOM_HALF * 2]} />
        <meshStandardMaterial color="#fdf2f8" />
      </mesh>
    </group>
  );
}

function HeartSprite({ position, color = '#fbbf24' }: { position: [number, number, number]; color?: string }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 128, 128);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    const x = 64, y = 70;
    ctx.moveTo(x, y + 20);
    ctx.bezierCurveTo(x - 45, y - 10, x - 30, y - 50, x, y - 15);
    ctx.bezierCurveTo(x + 30, y - 50, x + 45, y - 10, x, y + 20);
    ctx.fill();
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, [color]);

  return (
    <sprite position={position} scale={[0.25, 0.25, 0.25]}>
      <spriteMaterial map={texture} transparent depthTest={false} />
    </sprite>
  );
}

function GlowSprite({ position, color }: { position: [number, number, number]; color: string }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, color + 'cc');
    gradient.addColorStop(0.4, color + '55');
    gradient.addColorStop(1, color + '00');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(canvas);
  }, [color]);

  return (
    <sprite position={position} scale={[1.8, 1.8, 1.8]}>
      <spriteMaterial map={texture} transparent opacity={0.8} depthWrite={false} />
    </sprite>
  );
}

function ProductShape({
  shapeType,
  color,
  isNear,
}: {
  shapeType: number;
  color: string;
  isNear: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const targetScale = isNear ? 1.3 : 1;

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.15);
      if (!isNear) {
        groupRef.current.rotation.y += PRODUCT_SPEED * delta;
      }
    }
  });

  return (
    <group ref={groupRef} position={[0, 0.55, 0]}>
      {shapeType === 0 && (
        <group>
          <mesh castShadow>
            <boxGeometry args={[0.45, 0.5, 0.35]} />
            <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.32, 0]} castShadow>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial color="#ffffff" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[-0.28, 0, 0]} castShadow>
            <torusGeometry args={[0.04, 0.015, 8, 24]} />
            <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[0.28, 0, 0]} rotation={[0, 0, Math.PI]} castShadow>
            <torusGeometry args={[0.04, 0.015, 8, 24]} />
            <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.3} />
          </mesh>
        </group>
      )}
      {shapeType === 1 && (
        <group>
          <mesh castShadow>
            <sphereGeometry args={[0.28, 24, 24]} />
            <meshStandardMaterial color={color} metalness={0.5} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.22, 0.15]} castShadow>
            <torusGeometry args={[0.1, 0.02, 8, 32]} />
            <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.22, 0.15]}>
            <circleGeometry args={[0.08, 32]} />
            <meshStandardMaterial color="#0ea5e9" emissive="#0ea5e9" emissiveIntensity={0.3} />
          </mesh>
        </group>
      )}
      {shapeType === 2 && (
        <group>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.1, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.3, 0.4, 24]} />
            <meshStandardMaterial color={color} metalness={0.4} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.38, 0]} castShadow>
            <torusKnotGeometry args={[0.08, 0.03, 48, 12]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.1} />
          </mesh>
          <mesh position={[0, 0.1, 0]} rotation={[0, 0, 0]}>
            <ringGeometry args={[0.32, 0.35, 32]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}
    </group>
  );
}

interface ProductPedestalProps {
  product: Product;
  position: [number, number, number];
  playerPos: THREE.Vector3;
  onClick: () => void;
  isFavorited: boolean;
}

function ProductPedestal({ product, position, playerPos, onClick, isFavorited }: ProductPedestalProps) {
  const podiumRef = useRef<THREE.Group>(null);
  const pedestalPos = useMemo(() => new THREE.Vector3(...position), [position]);
  const [hovered, setHovered] = useState(false);

  const distance = useMemo(() => {
    return pedestalPos.distanceTo(playerPos);
  }, [pedestalPos, playerPos]);

  const isNear = distance < INTERACT_DISTANCE;

  return (
    <group position={position}>
      <group ref={podiumRef}>
        <mesh position={[0, PODIUM_HEIGHT / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[PODIUM_RADIUS, PODIUM_RADIUS * 1.1, PODIUM_HEIGHT, 32]} />
          <meshPhysicalMaterial
            color="#ffffff"
            transparent
            opacity={0.55}
            transmission={0.3}
            roughness={0.1}
            metalness={0.2}
            clearcoat={1}
          />
        </mesh>
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[PODIUM_RADIUS * 1.2, PODIUM_RADIUS * 1.2, 0.04, 32]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.5} roughness={0.3} />
        </mesh>
      </group>

      {isNear && <GlowSprite position={[0, 0.08, 0]} color={product.color} />}

      <group
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'grab';
        }}
      >
        <ProductShape shapeType={product.shapeType} color={product.color} isNear={isNear} />
      </group>

      <pointLight
        position={[0, 0.15, 0]}
        color={product.color}
        intensity={isNear ? 0.6 : 0.3}
        distance={3}
        decay={2}
      />

      {isFavorited && (
        <HeartSprite position={[0, PODIUM_HEIGHT + 0.75, 0]} />
      )}

      {hovered && (
        <sprite position={[0, PODIUM_HEIGHT + 1.3, 0]} scale={[1.5, 0.45, 1]}>
          <spriteMaterial>
            {(() => {
              const canvas = document.createElement('canvas');
              canvas.width = 512;
              canvas.height = 128;
              const ctx = canvas.getContext('2d')!;
              ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
              ctx.roundRect(0, 0, 512, 128, 20);
              ctx.fill();
              ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)';
              ctx.lineWidth = 2;
              ctx.stroke();
              ctx.fillStyle = '#f1f5f9';
              ctx.font = 'bold 40px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(product.name, 256, 60);
              ctx.fillStyle = '#fbbf24';
              ctx.font = 'bold 32px sans-serif';
              ctx.fillText(`¥${product.price}`, 256, 100);
              const tex = new THREE.CanvasTexture(canvas);
              tex.needsUpdate = true;
              (THREE.SpriteMaterial.prototype as any);
              const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
              return mat as any;
            })()}
          </spriteMaterial>
        </sprite>
      )}
    </group>
  );
}

interface FirstPersonControlsProps {
  playerPosRef: React.MutableRefObject<THREE.Vector3>;
  setPlayerPos: (p: THREE.Vector3) => void;
  isMobile: boolean;
}

function FirstPersonControls({ playerPosRef, setPlayerPos, isMobile }: FirstPersonControlsProps) {
  const { camera, gl } = useThree();
  const yawRef = useRef(0);
  const pitchRef = useRef(-0.15);
  const keysRef = useRef<Record<string, boolean>>({});
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const eulerRef = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const targetYaw = useRef(0);
  const targetPitch = useRef(-0.15);

  useEffect(() => {
    const dom = gl.domElement;

    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      keysRef.current[e.key.toLowerCase()] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
      keysRef.current[e.key.toLowerCase()] = false;
    };
    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      dom.style.cursor = 'grabbing';
    };
    const onMouseUp = () => {
      isDraggingRef.current = false;
      dom.style.cursor = 'grab';
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      const sensitivity = isMobile ? MOBILE_SENSITIVITY : BASE_SENSITIVITY;
      targetYaw.current -= dx * sensitivity;
      targetPitch.current -= dy * sensitivity;
      targetPitch.current = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, targetPitch.current));
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDraggingRef.current = true;
        lastMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - lastMouseRef.current.x;
      const dy = e.touches[0].clientY - lastMouseRef.current.y;
      const sensitivity = MOBILE_SENSITIVITY;
      targetYaw.current -= dx * sensitivity;
      targetPitch.current -= dy * sensitivity;
      targetPitch.current = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, targetPitch.current));
      lastMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const onTouchEnd = () => {
      isDraggingRef.current = false;
    };

    dom.style.cursor = 'grab';

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    dom.addEventListener('contextmenu', (e) => e.preventDefault());
    dom.addEventListener('touchstart', onTouchStart, { passive: true });
    dom.addEventListener('touchmove', onTouchMove, { passive: true });
    dom.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      dom.removeEventListener('touchstart', onTouchStart);
      dom.removeEventListener('touchmove', onTouchMove);
      dom.removeEventListener('touchend', onTouchEnd);
    };
  }, [gl, isMobile]);

  useFrame((_, delta) => {
    const damp = 0.1;
    yawRef.current += (targetYaw.current - yawRef.current) * damp;
    pitchRef.current += (targetPitch.current - pitchRef.current) * damp;

    eulerRef.current.set(pitchRef.current, yawRef.current, 0);
    camera.quaternion.setFromEuler(eulerRef.current);

    const speed = (isMobile ? MOBILE_MOVE_SPEED : BASE_MOVE_SPEED) * delta;
    const forward = new THREE.Vector3(-Math.sin(yawRef.current), 0, -Math.cos(yawRef.current));
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const move = new THREE.Vector3();
    const keys = keysRef.current;
    if (keys['KeyW'] || keys['w'] || keys['ArrowUp']) move.add(forward);
    if (keys['KeyS'] || keys['s'] || keys['ArrowDown']) move.sub(forward);
    if (keys['KeyD'] || keys['d'] || keys['ArrowRight']) move.add(right);
    if (keys['KeyA'] || keys['a'] || keys['ArrowLeft']) move.sub(right);

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(speed);
      const pos = playerPosRef.current.clone();

      const tryX = pos.x + move.x;
      if (Math.abs(tryX) < ROOM_HALF - PLAYER_RADIUS) {
        pos.x = tryX;
      }
      const tryZ = pos.z + move.z;
      if (Math.abs(tryZ) < ROOM_HALF - PLAYER_RADIUS) {
        pos.z = tryZ;
      }

      playerPosRef.current = pos;
      setPlayerPos(pos.clone());
    }

    camera.position.set(
      playerPosRef.current.x,
      1.6,
      playerPosRef.current.z
    );
  });

  return null;
}

interface SceneContentProps {
  products: Product[];
  pedestalPositions: PedestalPos[];
  playerPosRef: React.MutableRefObject<THREE.Vector3>;
  setPlayerPos: (p: THREE.Vector3) => void;
  onProductClick: (p: Product) => void;
  favorites: Set<string>;
  isMobile: boolean;
  playerPosState: THREE.Vector3;
}

function SceneContent({
  products,
  pedestalPositions,
  playerPosRef,
  setPlayerPos,
  onProductClick,
  favorites,
  isMobile,
  playerPosState,
}: SceneContentProps) {
  return (
    <>
      <FirstPersonControls
        playerPosRef={playerPosRef}
        setPlayerPos={setPlayerPos}
        isMobile={isMobile}
      />

      <ambientLight intensity={0.4} />
      <directionalLight
        position={[0, 8, 0]}
        intensity={0.6}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />

      <FloorGrid />
      <Walls />

      {products.map((p, idx) => {
        const pos = pedestalPositions[idx];
        if (!pos) return null;
        return (
          <ProductPedestal
            key={p._id}
            product={p}
            position={[pos.x, 0, pos.z]}
            playerPos={playerPosState}
            onClick={() => onProductClick(p)}
            isFavorited={favorites.has(p._id)}
          />
        );
      })}
    </>
  );
}

export default function Showroom() {
  const [products, setProducts] = useState<Product[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [compareList, setCompareList] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  const initialPos = useMemo(() => new THREE.Vector3(0, 1.6, -5), []);
  const playerPosRef = useRef<THREE.Vector3>(initialPos.clone());
  const [playerPosState, setPlayerPosState] = useState<THREE.Vector3>(initialPos.clone());
  const setPlayerPos = useCallback((p: THREE.Vector3) => setPlayerPosState(p.clone()), []);

  const isMobile = useIsMobile();

  const pedestalPositions = useMemo<PedestalPos[]>(() => {
    const positions: PedestalPos[] = [];
    const count = 10;
    const radius = 3.8;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      positions.push({
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
      });
    }
    return positions;
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [prods, favs] = await Promise.all([
          api.getProducts(),
          api.getFavorites().catch(() => []),
        ]);
        setProducts(prods);
        setFavorites(new Set(favs));
      } catch (e) {
        console.error('加载数据失败:', e);
      } finally {
        setLoaded(true);
      }
    };
    loadData();
  }, []);

  const handleProductClick = useCallback((p: Product) => {
    setSelectedProduct(p);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedProduct(null);
  }, []);

  const handleFavoriteChange = useCallback((id: string, favorited: boolean) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (favorited) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleCompareToggle = useCallback((id: string) => {
    setCompareList((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  }, []);

  const compareProducts = useMemo(
    () =>
      compareList
        .map((id) => products.find((p) => p._id === id))
        .filter((p): p is Product => !!p),
    [compareList, products]
  );

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0f172a', position: 'relative' }}>
      <Canvas
        shadows
        camera={{ position: [0, 1.6, -5], fov: 70, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
        frameloop="always"
      >
        <color attach="background" args={[0x0f172a]} />
        <fog attach="fog" args={[0x0f172a, 12, 22]} />
        {loaded && (
          <SceneContent
            products={products}
            pedestalPositions={pedestalPositions}
            playerPosRef={playerPosRef}
            setPlayerPos={setPlayerPos}
            onProductClick={handleProductClick}
            favorites={favorites}
            isMobile={isMobile}
            playerPosState={playerPosState}
          />
        )}
      </Canvas>

      {loaded && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 20,
              left: 20,
              background: 'rgba(15, 23, 42, 0.85)',
              padding: '12px 16px',
              borderRadius: 10,
              border: '1px solid rgba(99,102,241,0.25)',
              color: '#cbd5e1',
              fontSize: 12,
              lineHeight: 1.8,
              backdropFilter: 'blur(8px)',
              zIndex: 100,
              pointerEvents: 'none',
            }}
          >
            <div style={{ color: '#a5b4fc', fontWeight: 700, fontSize: 13, marginBottom: 6, letterSpacing: 1 }}>
              ✦ ProductExplorer
            </div>
            <div>🎮 WASD / 方向键 — 移动</div>
            <div>🖱️ 按住鼠标拖拽 — 旋转视角</div>
            <div>👆 点击商品 — 查看详情</div>
          </div>

          <div
            style={{
              position: 'fixed',
              top: 20,
              right: 20,
              display: 'flex',
              gap: 8,
              zIndex: 100,
            }}
          >
            <div
              style={{
                background: 'rgba(251,191,36,0.15)',
                border: '1px solid rgba(251,191,36,0.4)',
                padding: '6px 14px',
                borderRadius: 999,
                color: '#fbbf24',
                fontSize: 12,
                fontWeight: 600,
                backdropFilter: 'blur(8px)',
              }}
            >
              ❤ 收藏 {favorites.size}
            </div>
            <div
              style={{
                background: 'rgba(96,165,250,0.15)',
                border: '1px solid rgba(96,165,250,0.4)',
                padding: '6px 14px',
                borderRadius: 999,
                color: '#60a5fa',
                fontSize: 12,
                fontWeight: 600,
                backdropFilter: 'blur(8px)',
              }}
            >
              ⚖ 对比 {compareList.length}/4
            </div>
          </div>
        </>
      )}

      <DetailPanel
        product={selectedProduct}
        onClose={handleCloseDetail}
        isFavorited={selectedProduct ? favorites.has(selectedProduct._id) : false}
        onFavoriteChange={handleFavoriteChange}
        compareList={compareList}
        onCompareToggle={handleCompareToggle}
      />

      <ComparePanel
        products={compareProducts}
        onRemove={(id) => handleCompareToggle(id)}
      />
    </div>
  );
}
