import { useMemo, useRef, useEffect } from 'react';
import { useThree, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { ShippingRoute } from '../types';
import { createBezierCurve, computeArcHeight, pointToVec3, GLOBE_RADIUS } from '../utils/geoMath';
import { interpolateRouteColor, normalize, hexToRgb } from '../analysis/colorScale';
import {
  useGlobalStore,
  selectYearlyEmission,
  getEmissionMinMax
} from '../store/useGlobalStore';

interface RouteArcProps {
  route: ShippingRoute;
  year: number;
  isHovered: boolean;
  isSelected: boolean;
  emissionT: number;
  onClick: (id: string) => void;
  onPointerOver: (e: ThreeEvent<PointerEvent>, id: string) => void;
  onPointerOut: () => void;
}

function RouteArc({
  route,
  year,
  isHovered,
  isSelected,
  emissionT,
  onClick,
  onPointerOver,
  onPointerOut
}: RouteArcProps) {
  const lineRef = useRef<THREE.Line>(null);
  const points = useMemo(() => {
    const h = computeArcHeight(route.distanceKm);
    return createBezierCurve(route.from, route.to, h, 64);
  }, [route]);

  const { position, color } = useMemo(() => {
    const positions = new Float32Array(points.length * 3);
    const colors = new Float32Array(points.length * 3);
    const baseColor = interpolateRouteColor(emissionT);
    const rgb = hexToRgb(baseColor);
    for (let i = 0; i < points.length; i++) {
      positions[i * 3] = points[i].x;
      positions[i * 3 + 1] = points[i].y;
      positions[i * 3 + 2] = points[i].z;
      const fade = i < 6 ? i / 6 : i > points.length - 7 ? (points.length - 1 - i) / 6 : 1;
      colors[i * 3] = (rgb.r / 255) * fade;
      colors[i * 3 + 1] = (rgb.g / 255) * fade;
      colors[i * 3 + 2] = (rgb.b / 255) * fade;
    }
    return { position: positions, color: colors };
  }, [points, emissionT]);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(position, 3));
    g.setAttribute('color', new THREE.BufferAttribute(color, 3));
    return g;
  }, [position, color]);

  const lineWidth = isHovered || isSelected ? 0.06 : 0.03;
  const opacity = isHovered || isSelected ? 1 : 0.78;

  return (
    <group>
      <line
        ref={lineRef}
        geometry={geometry}
        onClick={e => {
          e.stopPropagation();
          onClick(route.id);
        }}
        onPointerOver={e => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
          onPointerOver(e, route.id);
        }}
        onPointerOut={e => {
          e.stopPropagation();
          document.body.style.cursor = '';
          onPointerOut();
        }}
      >
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={opacity}
          linewidth={1}
        />
      </line>
      <GlowTube
        points={points}
        color={interpolateRouteColor(emissionT)}
        width={lineWidth}
        opacity={opacity * 0.5}
      />
      {isHovered && <EndpointMarkers route={route} />}
    </group>
  );
}

function GlowTube({
  points,
  color,
  width,
  opacity
}: {
  points: THREE.Vector3[];
  color: string;
  width: number;
  opacity: number;
}) {
  const curve = useMemo(() => {
    return new THREE.CatmullRomCurve3(points);
  }, [points]);

  return (
    <mesh>
      <tubeGeometry args={[curve, 80, width * 0.5, 6, false]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

function EndpointMarkers({ route }: { route: ShippingRoute }) {
  const from = useMemo(() => pointToVec3(route.from, GLOBE_RADIUS + 0.05), [route]);
  const to = useMemo(() => pointToVec3(route.to, GLOBE_RADIUS + 0.05), [route]);
  return (
    <>
      <mesh position={from}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshBasicMaterial color="#4ecdc4" />
      </mesh>
      <mesh position={to}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshBasicMaterial color="#ff6b6b" />
      </mesh>
    </>
  );
}

export function RoutesLayer() {
  const routes = useGlobalStore(s => s.routes);
  const currentYear = useGlobalStore(s => s.currentYear);
  const hoveredId = useGlobalStore(s => s.hoveredRouteId);
  const selectedId = useGlobalStore(s => s.selectedRouteId);
  const setHovered = useGlobalStore(s => s.setHoveredRouteId);
  const setSelected = useGlobalStore(s => s.setSelectedRouteId);
  const setTooltip = useGlobalStore(s => s.setTooltip);
  const setPanelCollapsed = useGlobalStore(s => s.setPanelCollapsed);

  const { size } = useThree();

  const { min, max } = useMemo(() => getEmissionMinMax(currentYear), [routes, currentYear]);

  function handlePointerOver(e: ThreeEvent<PointerEvent>, id: string) {
    setHovered(id);
    const x = e.nativeEvent.clientX;
    const y = e.nativeEvent.clientY;
    setTooltip({ visible: true, x, y, routeId: id });
  }

  function handlePointerOut() {
    setHovered(null);
    setTooltip({ visible: false });
  }

  function handleClick(id: string) {
    setSelected(id === selectedId ? null : id);
    setPanelCollapsed(false);
  }

  useEffect(() => {
    if (!hoveredId) return;
    function onMove(e: MouseEvent) {
      setTooltip({ x: e.clientX, y: e.clientY });
    }
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [hoveredId, setTooltip]);

  return (
    <group>
      {routes.map(route => {
        const yd = selectYearlyEmission(route, currentYear);
        const t = normalize(yd.emission, min, max);
        return (
          <RouteArc
            key={route.id}
            route={route}
            year={currentYear}
            isHovered={hoveredId === route.id}
            isSelected={selectedId === route.id}
            emissionT={t}
            onClick={handleClick}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
          />
        );
      })}
    </group>
  );
}
