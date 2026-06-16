import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '../utils/geoMath';
import { useGlobalStore, FocusedRegion } from '../store/useGlobalStore';
import type { RoutePoint, ShippingRoute } from '../types';

const EARTH_TEXTURE_URL =
  'https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg';
const EARTH_BUMP_URL =
  'https://unpkg.com/three-globe@2.31.1/example/img/earth-topology.png';
const EARTH_SPEC_URL =
  'https://unpkg.com/three-globe@2.31.1/example/img/earth-water.png';

export function Globe({ onDoubleClick }: { onDoubleClick?: (p: RoutePoint, routes: ShippingRoute[]) => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const routes = useGlobalStore(s => s.routes);
  const setFocusedRegion = useGlobalStore(s => s.setFocusedRegion);
  const controlsActiveRef = useRef(true);
  const autoRotateRef = useRef(true);

  const textureLoader = useMemo(() => new THREE.TextureLoader(), []);

  const [colorMap, bumpMap, specMap] = useMemo(() => {
    const c = textureLoader.load(EARTH_TEXTURE_URL);
    c.colorSpace = THREE.SRGBColorSpace;
    const b = textureLoader.load(EARTH_BUMP_URL);
    const s = textureLoader.load(EARTH_SPEC_URL);
    return [c, b, s];
  }, [textureLoader]);

  useFrame((_, delta) => {
    if (groupRef.current && autoRotateRef.current) {
      groupRef.current.rotation.y += delta * 0.08;
    }
  });

  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const pointer = useMemo(() => new THREE.Vector2(), []);

  function handlePointerDown() {
    autoRotateRef.current = false;
    controlsActiveRef.current = true;
  }

  function handleDoubleClick(event: { point: THREE.Vector3; nativeEvent: MouseEvent }) {
    event?.nativeEvent?.stopPropagation?.();
    const dir = event.point.clone().normalize();
    const lat = 90 - Math.acos(dir.y) * (180 / Math.PI);
    const lng = Math.atan2(dir.z, -dir.x) * (180 / Math.PI) - 180;
    const lngNorm = ((lng + 540) % 360) - 180;

    const targetPos = dir.multiplyScalar(GLOBE_RADIUS * 2.2);
    const startPos = camera.position.clone();
    const duration = 800;
    const start = performance.now();
    autoRotateRef.current = false;

    function animate() {
      const t = Math.min(1, (performance.now() - start) / duration);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      camera.position.lerpVectors(startPos, targetPos, ease);
      camera.lookAt(0, 0, 0);
      if (t < 1) requestAnimationFrame(animate);
    }
    animate();

    const nearbyRoutes = routes.filter(r => {
      const mid = {
        lat: (r.from.lat + r.to.lat) / 2,
        lng: (r.from.lng + r.to.lng) / 2
      };
      const dLat = Math.abs(mid.lat - lat);
      const dLng = Math.min(Math.abs(mid.lng - lngNorm), 360 - Math.abs(mid.lng - lngNorm));
      return dLat < 35 && dLng < 50;
    });

    const region: FocusedRegion = {
      lat,
      lng: lngNorm,
      routes: nearbyRoutes,
      label: formatRegionLabel(lat, lngNorm)
    };
    setFocusedRegion(region);
    onDoubleClick?.({ lat, lng: lngNorm }, nearbyRoutes);
  }

  function formatRegionLabel(lat: number, lng: number): string {
    const latLabel = lat >= 0 ? `${lat.toFixed(1)}°N` : `${Math.abs(lat).toFixed(1)}°S`;
    const lngLabel = lng >= 0 ? `${lng.toFixed(1)}°E` : `${Math.abs(lng).toFixed(1)}°W`;
    return `${latLabel}, ${lngLabel}`;
  }

  return (
    <group ref={groupRef} onPointerDown={handlePointerDown}>
      <mesh
        ref={meshRef}
        onDoubleClick={handleDoubleClick}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
        <meshPhongMaterial
          map={colorMap}
          bumpMap={bumpMap}
          bumpScale={0.04}
          specularMap={specMap}
          specular={new THREE.Color(0x333333)}
          shininess={14}
        />
      </mesh>
      <PortMarkers routes={routes} />
    </group>
  );
}

function PortMarkers({ routes }: { routes: ShippingRoute[] }) {
  const group = useRef<THREE.Group>(null);
  const positions = useMemo(() => {
    const set = new Set<string>();
    const pts: THREE.Vector3[] = [];
    for (const r of routes) {
      for (const p of [r.from, r.to]) {
        const key = `${p.lat.toFixed(1)}_${p.lng.toFixed(1)}`;
        if (!set.has(key)) {
          set.add(key);
          pts.push(latLngToVector3(p.lat, p.lng, GLOBE_RADIUS + 0.02));
        }
      }
    }
    return pts;
  }, [routes]);

  return (
    <group ref={group}>
      {positions.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.035, 12, 12]} />
          <meshBasicMaterial color="#ffdd55" />
        </mesh>
      ))}
    </group>
  );
}
