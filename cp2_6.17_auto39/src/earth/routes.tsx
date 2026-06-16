import { useMemo, useRef, useEffect } from 'react';
import { useThree, ThreeEvent } from '@react-three/fiber';
import { Line } from '@react-three/drei';
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
  const lineRef = useRef<any>(null);
  const points = useMemo(() => {
    const h = computeArcHeight(route.distanceKm);
    return createBezierCurve(route.from, route.to, h, 64);
  }, [route]);

  const colors = useMemo(() => {
    const baseColor = interpolateRouteColor(emissionT);
    const rgb = hexToRgb(baseColor);
    const colorArr: [number, number, number][] = [];
    for (let i = 0; i < points.length; i++) {
      const fade = i < 6 ? i / 6 : i > points.length - 7 ? (points.length - 1 - i) / 6 : 1;
      colorArr.push([
        (rgb.r / 255) * fade,
        (rgb.g / 255) * fade,
        (rgb.b / 255) * fade
      ]);
    }
    return colorArr;
  }, [points, emissionT]);

  const lineWidth = isHovered || isSelected 
    ? 2.5 + emissionT * 1.5
    : 0.8 + emissionT * 2.0;
  const opacity = isHovered || isSelected ? 1 : 0.7 + emissionT * 0.2;

  return (
    <group>
      <Line
        ref={lineRef}
        points={points}
        color={interpolateRouteColor(emissionT)}
        lineWidth={lineWidth}
        transparent
        opacity={opacity}
        vertexColors={colors}
        onClick={(e: any) => {
          e.stopPropagation();
          onClick(route.id);
        }}
        onPointerOver={(e: any) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
          onPointerOver(e, route.id);
        }}
        onPointerOut={(e: any) => {
          e.stopPropagation();
          document.body.style.cursor = '';
          onPointerOut();
        }}
      />
      {isHovered && <EndpointMarkers route={route} />}
    </group>
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

  const { min, max } = useMemo(() => getEmissionMinMax(currentYear), [routes, currentYear]);

  function handlePointerOver(e: any, id: string) {
    setHovered(id);
    const x = e?.nativeEvent?.clientX ?? 0;
    const y = e?.nativeEvent?.clientY ?? 0;
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
