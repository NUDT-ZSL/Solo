import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store/useStore';
import { getArtworkTemplate, getArtworkBottomOffset, generateRandomPaintingColors } from './ArtworkManager';
import LightSystem from './LightSystem';

const ROOM_WIDTH = 20;
const ROOM_DEPTH = 15;
const ROOM_HEIGHT = 6;

function GalleryRoom() {
  const floorTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    const tileSize = 64;
    for (let x = 0; x < 8; x++) {
      for (let y = 0; y < 8; y++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#e0e0e0' : '#d0d0d0';
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(10, 7.5);
    return texture;
  }, []);

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_WIDTH, ROOM_DEPTH]} />
        <meshStandardMaterial map={floorTexture} roughness={0.8} metalness={0.1} />
      </mesh>

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM_HEIGHT, 0]} receiveShadow>
        <planeGeometry args={[ROOM_WIDTH, ROOM_DEPTH]} />
        <meshStandardMaterial color="#f5f5f0" side={THREE.DoubleSide} />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2]} receiveShadow>
        <planeGeometry args={[ROOM_WIDTH, ROOM_HEIGHT]} />
        <meshStandardMaterial color="#f5e6d3" side={THREE.DoubleSide} />
      </mesh>

      {/* Front wall */}
      <mesh position={[0, ROOM_HEIGHT / 2, ROOM_DEPTH / 2]} receiveShadow>
        <planeGeometry args={[ROOM_WIDTH, ROOM_HEIGHT]} />
        <meshStandardMaterial color="#f5e6d3" side={THREE.DoubleSide} />
      </mesh>

      {/* Left wall */}
      <mesh position={[-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[ROOM_DEPTH, ROOM_HEIGHT]} />
        <meshStandardMaterial color="#f5e6d3" side={THREE.DoubleSide} />
      </mesh>

      {/* Right wall */}
      <mesh position={[ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[ROOM_DEPTH, ROOM_HEIGHT]} />
        <meshStandardMaterial color="#f5e6d3" side={THREE.DoubleSide} />
      </mesh>

      {/* Ceiling rails */}
      <mesh position={[0, ROOM_HEIGHT - 0.1, -4]}>
        <boxGeometry args={[ROOM_WIDTH - 1, 0.08, 0.15]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, ROOM_HEIGHT - 0.1, 4]}>
        <boxGeometry args={[ROOM_WIDTH - 1, 0.08, 0.15]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Rail end markers */}
      {[-ROOM_WIDTH / 2 + 0.5, ROOM_WIDTH / 2 - 0.5].map((x, i) => (
        <group key={i}>
          <mesh position={[x, ROOM_HEIGHT - 0.1, -4]}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.3} />
          </mesh>
          <mesh position={[x, ROOM_HEIGHT - 0.1, 4]}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function AbstractPainting({ scale = 1, isPreview = false }: { scale?: number; isPreview?: boolean }) {
  const colors = useMemo(() => generateRandomPaintingColors(), []);
  
  const canvas = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 341;
    const ctx = c.getContext('2d')!;
    
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, 512, 341);
    
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = colors[i % colors.length];
      ctx.globalAlpha = 0.7;
      const x = Math.random() * 460 + 26;
      const y = Math.random() * 290 + 26;
      const w = Math.random() * 150 + 60;
      const h = Math.random() * 150 + 60;
      ctx.beginPath();
      ctx.ellipse(x, y, w / 2, h / 2, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.globalAlpha = 1;
    ctx.strokeStyle = colors[5 % colors.length];
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(50, 280);
    ctx.bezierCurveTo(150, 100, 350, 280, 462, 120);
    ctx.stroke();
    
    return c;
  }, [colors]);

  const texture = useMemo(() => new THREE.CanvasTexture(canvas), [canvas]);

  if (isPreview) {
    return (
      <group>
        <mesh position={[0, 0, 0.05]}>
          <planeGeometry args={[3 * scale, 2 * scale]} />
          <meshBasicMaterial map={texture} transparent opacity={0.6} />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[3.1 * scale, 2.1 * scale, 0.1 * scale]} />
          <meshBasicMaterial color="#d4af37" transparent opacity={0.6} />
        </mesh>
      </group>
    );
  }

  return (
    <group>
      <mesh position={[0, 0, 0.05]} castShadow receiveShadow>
        <planeGeometry args={[3, 2]} />
        <meshStandardMaterial map={texture} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[3.1, 2.1, 0.1]} />
        <meshStandardMaterial color="#d4af37" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
}

function ArtworkMesh({ 
  type, 
  color, 
  scale = 1,
  isPreview = false,
  isSelected = false,
}: { 
  type: string; 
  color?: string; 
  scale?: number;
  isPreview?: boolean;
  isSelected?: boolean;
}) {
  const template = getArtworkTemplate(type);
  const meshRef = useRef<THREE.Group>(null);
  const [pulseScale, setPulseScale] = useState(1);

  useFrame((state) => {
    if (isSelected && meshRef.current) {
      setPulseScale(1 + Math.sin(state.clock.elapsedTime * (Math.PI * 2 / 1.5)) * 0.03);
    }
  });

  if (!template) return null;

  const { dimensions } = template;
  const materialColor = color || template.color;

  const material = isPreview 
    ? <meshStandardMaterial color={materialColor} transparent opacity={0.5} />
    : <meshStandardMaterial color={materialColor} metalness={0.3} roughness={0.5} />;

  const renderGeometry = () => {
    switch (type) {
      case 'sculpture-sphere':
        return (
          <mesh castShadow receiveShadow>
            <sphereGeometry args={[dimensions.width / 2 * scale, 32, 32]} />
            {material}
          </mesh>
        );
      case 'sculpture-cube':
        return (
          <mesh castShadow receiveShadow>
            <boxGeometry args={[dimensions.width * scale, dimensions.height * scale, dimensions.depth * scale]} />
            {material}
          </mesh>
        );
      case 'sculpture-torus':
        return (
          <mesh castShadow receiveShadow rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[dimensions.width / 2 * scale, dimensions.height / 3 * scale, 16, 64]} />
            {material}
          </mesh>
        );
      case 'sculpture-cone':
        return (
          <mesh castShadow receiveShadow>
            <coneGeometry args={[dimensions.width / 2 * scale, dimensions.height * scale, 32]} />
            {material}
          </mesh>
        );
      case 'painting-abstract':
      case 'painting-landscape':
      case 'painting-portrait':
        return <AbstractPainting scale={scale} isPreview={isPreview} />;
      case 'installation-pyramid':
        return (
          <mesh castShadow receiveShadow>
            <coneGeometry args={[dimensions.width / 2 * scale, dimensions.height * scale, 4]} />
            {material}
          </mesh>
        );
      case 'installation-cylinder':
        return (
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[dimensions.width / 2 * scale, dimensions.width / 2 * scale, dimensions.height * scale, 32]} />
            {material}
          </mesh>
        );
      case 'installation-tetra':
        return (
          <mesh castShadow receiveShadow>
            <tetrahedronGeometry args={[dimensions.width / 2 * scale, 0]} />
            {material}
          </mesh>
        );
      default:
        return (
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1, 1, 1]} />
            {material}
          </mesh>
        );
    }
  };

  const bottomOffset = getArtworkBottomOffset(type) * scale;

  return (
    <group ref={meshRef} position={[0, bottomOffset, 0]} scale={isSelected ? pulseScale : 1}>
      {renderGeometry()}
      {isSelected && (
        <mesh position={[0, -bottomOffset + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[dimensions.width * 0.6 * scale, dimensions.width * 0.75 * scale, 64]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

function PlacingPreview() {
  const { isPlacing, placingType, addArtwork, setIsPlacing } = useStore();
  const [hoverPos, setHoverPos] = useState<[number, number, number]>([0, 0, 0]);
  const { camera, gl } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);

  useEffect(() => {
    if (!isPlacing) return;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );

      raycaster.setFromCamera(mouse, camera);
      const intersection = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, intersection);

      if (intersection) {
        const clampedX = Math.max(-ROOM_WIDTH / 2 + 1, Math.min(ROOM_WIDTH / 2 - 1, intersection.x));
        const clampedZ = Math.max(-ROOM_DEPTH / 2 + 1, Math.min(ROOM_DEPTH / 2 - 1, intersection.z));
        setHoverPos([clampedX, 0, clampedZ]);
      }
    };

    const handleClick = () => {
      if (placingType) {
        const template = getArtworkTemplate(placingType);
        if (template) {
          const bottomOffset = getArtworkBottomOffset(placingType);
          addArtwork({
            type: placingType,
            name: template.name,
            position: [hoverPos[0], bottomOffset, hoverPos[2]],
            rotation: [0, 0, 0],
            scale: 1,
            color: template.color,
          });
        }
      }
      setIsPlacing(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPlacing(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPlacing, placingType, camera, gl, raycaster, plane, hoverPos, addArtwork, setIsPlacing]);

  if (!isPlacing || !placingType) return null;

  const template = getArtworkTemplate(placingType);
  if (!template) return null;

  const shadowRadius = Math.max(template.dimensions.width, template.dimensions.depth) * 0.75;

  return (
    <group position={hoverPos}>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[shadowRadius, 32]} />
        <meshBasicMaterial color="#87ceeb" transparent opacity={0.3} />
      </mesh>
      <ArtworkMesh type={placingType} isPreview />
    </group>
  );
}

function ArtworkInstance({ 
  artwork, 
  isSelected,
  onSelect,
  onDrag,
}: { 
  artwork: ReturnType<typeof useStore.getState>['artworks'][0];
  isSelected: boolean;
  onSelect: () => void;
  onDrag: (pos: [number, number, number]) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { camera, gl } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const bottomOffset = getArtworkBottomOffset(artwork.type) * artwork.scale;

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    onSelect();
    setIsDragging(true);
    e.target.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: any) => {
    if (!isDragging || !isSelected) return;
    e.stopPropagation();

    const rect = gl.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    raycaster.setFromCamera(mouse, camera);
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersection);

    if (intersection) {
      const clampedX = Math.max(-ROOM_WIDTH / 2 + 1, Math.min(ROOM_WIDTH / 2 - 1, intersection.x));
      const clampedZ = Math.max(-ROOM_DEPTH / 2 + 1, Math.min(ROOM_DEPTH / 2 - 1, intersection.z));
      onDrag([clampedX, bottomOffset, clampedZ]);
    }
  };

  const handlePointerUp = (e: any) => {
    setIsDragging(false);
    e.target.releasePointerCapture?.(e.pointerId);
  };

  return (
    <group
      ref={groupRef}
      position={artwork.position}
      rotation={artwork.rotation as any}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <ArtworkMesh 
        type={artwork.type} 
        color={artwork.color} 
        scale={artwork.scale}
        isSelected={isSelected}
      />
    </group>
  );
}

function CameraController() {
  const { camera } = useThree();
  const { cameraView } = useStore();
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number | null>(null);
  const initialAnimationDone = useRef(false);

  const startPos = useMemo(() => new THREE.Vector3(0, 1.6, 5), []);
  const targetPos = useRef(new THREE.Vector3(0, 1.6, 5));
  const currentPos = useRef(new THREE.Vector3(0, 1.6, 5));

  const startRot = useRef({ yaw: 0, pitch: 0 });
  const targetRot = useRef({ yaw: 0, pitch: 0 });
  const currentRot = useRef({ yaw: 0, pitch: 0 });

  const [isRightMouseDown, setIsRightMouseDown] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const velocity = useRef({ yaw: 0, pitch: 0 });

  useEffect(() => {
    if (!initialAnimationDone.current) {
      initialAnimationDone.current = true;
      const startTime = Date.now();
      const duration = 2000;
      const startYaw = -Math.PI / 6;
      const endYaw = Math.PI / 6;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const t = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        if (progress < 0.5) {
          currentRot.current.yaw = startYaw + (endYaw - startYaw) * t * 2;
        } else {
          currentRot.current.yaw = endYaw - endYaw * (t - 0.5) * 2;
        }

        targetRot.current.yaw = currentRot.current.yaw;
        startRot.current.yaw = currentRot.current.yaw;

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      animate();
    }
  }, []);

  useEffect(() => {
    if (cameraView === 'free') return;

    setIsAnimating(true);
    const startTime = Date.now();
    let duration = 800;

    const fromPos = currentPos.current.clone();
    const fromRot = { ...currentRot.current };

    if (cameraView === 'top') {
      targetPos.current.set(0, 8, 0.1);
      targetRot.current = { yaw: 0, pitch: -Math.PI / 2 + 0.01 };
      duration = 800;
    } else if (cameraView === 'front') {
      targetPos.current.set(0, 1.6, ROOM_DEPTH / 2 - 0.5);
      targetRot.current = { yaw: 0, pitch: 0 };
      duration = 600;
    }

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const t = 1 - Math.pow(1 - progress, 3);

      currentPos.current.lerpVectors(fromPos, targetPos.current, t);
      currentRot.current.yaw = fromRot.yaw + (targetRot.current.yaw - fromRot.yaw) * t;
      currentRot.current.pitch = fromRot.pitch + (targetRot.current.pitch - fromRot.pitch) * t;

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [cameraView]);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 2 && cameraView === 'free') {
        setIsRightMouseDown(true);
        lastMousePos.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 2) {
        setIsRightMouseDown(false);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isRightMouseDown || cameraView !== 'free') return;

      const deltaX = e.clientX - lastMousePos.current.x;
      const deltaY = e.clientY - lastMousePos.current.y;

      const sensitivity = 0.005;
      targetRot.current.yaw -= deltaX * sensitivity;
      targetRot.current.pitch -= deltaY * sensitivity;

      targetRot.current.pitch = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, targetRot.current.pitch));
      targetRot.current.yaw = Math.max(-Math.PI, Math.min(Math.PI, targetRot.current.yaw));

      velocity.current = {
        yaw: -deltaX * sensitivity * 0.5,
        pitch: -deltaY * sensitivity * 0.5,
      };

      lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleWheel = (e: WheelEvent) => {
      if (cameraView !== 'free') return;
      e.preventDefault();
      
      if (camera instanceof THREE.PerspectiveCamera) {
        const zoomSpeed = 0.9;
        if (e.deltaY > 0) {
          camera.fov = Math.min(110, camera.fov / zoomSpeed);
        } else {
          camera.fov = Math.max(30, camera.fov * zoomSpeed);
        }
        camera.updateProjectionMatrix();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [isRightMouseDown, cameraView, camera]);

  useFrame(() => {
    if (cameraView === 'free' && !isRightMouseDown) {
      velocity.current.yaw *= 0.95;
      velocity.current.pitch *= 0.95;

      targetRot.current.yaw += velocity.current.yaw;
      targetRot.current.pitch += velocity.current.pitch;

      targetRot.current.pitch = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, targetRot.current.pitch));
    }

    currentRot.current.yaw += (targetRot.current.yaw - currentRot.current.yaw) * 0.1;
    currentRot.current.pitch += (targetRot.current.pitch - currentRot.current.pitch) * 0.1;

    if (cameraView === 'free' && !isAnimating) {
      const distance = 5;
      const yaw = currentRot.current.yaw;
      const pitch = currentRot.current.pitch;

      currentPos.current.x = Math.sin(yaw) * Math.cos(pitch) * distance;
      currentPos.current.y = 1.6 + Math.sin(pitch) * distance;
      currentPos.current.z = Math.cos(yaw) * Math.cos(pitch) * distance;
    }

    camera.position.copy(currentPos.current);

    const lookAt = new THREE.Vector3(0, 1.6, 0);
    if (cameraView === 'free') {
      lookAt.x = currentPos.current.x - Math.sin(currentRot.current.yaw) * 10;
      lookAt.y = currentPos.current.y + Math.sin(currentRot.current.pitch) * 10;
      lookAt.z = currentPos.current.z - Math.cos(currentRot.current.yaw) * 10;
    }
    camera.lookAt(lookAt);
  });

  return null;
}

export default function GalleryScene() {
  const { artworks, selectedArtworkId, selectArtwork, updateArtwork } = useStore();

  return (
    <>
      <ambientLight intensity={0.4} />
      
      <GalleryRoom />
      <LightSystem />
      <PlacingPreview />
      <CameraController />

      {artworks.map((artwork) => (
        <ArtworkInstance
          key={artwork.id}
          artwork={artwork}
          isSelected={selectedArtworkId === artwork.id}
          onSelect={() => selectArtwork(artwork.id)}
          onDrag={(pos) => updateArtwork(artwork.id, { position: pos })}
        />
      ))}
    </>
  );
}
