import { useState, useMemo } from 'react';
import type { Port, VoyageState } from '../types';
import { getPointOnBezier, getBezierControlPoint } from '../GameEngine';

interface MapCanvasProps {
  ports: Port[];
  selectedPort: Port | null;
  destinationPort: Port | null;
  voyage: VoyageState | null;
  onPortClick: (port: Port) => void;
}

const PORT_RADIUS = 4.5;
const PORT_GLOW_RADIUS = 6.5;

const MapCanvas: React.FC<MapCanvasProps> = ({
  ports,
  selectedPort,
  destinationPort,
  voyage,
  onPortClick,
}) => {
  const [hoveredPortId, setHoveredPortId] = useState<string | null>(null);

  const allRoutes = useMemo(() => {
    const routes: { from: Port; to: Port; key: string }[] = [];
    for (let i = 0; i < ports.length; i++) {
      for (let j = i + 1; j < ports.length; j++) {
        routes.push({
          from: ports[i],
          to: ports[j],
          key: `${ports[i].id}-${ports[j].id}`,
        });
      }
    }
    return routes;
  }, [ports]);

  const isSelectedRoute = (fromId: string, toId: string): boolean => {
    if (!selectedPort || !destinationPort) return false;
    return (
      (selectedPort.id === fromId && destinationPort.id === toId) ||
      (selectedPort.id === toId && destinationPort.id === fromId)
    );
  };

  const showVoyageRoute = voyage && voyage.status !== 'idle';
  const voyageFrom = showVoyageRoute ? voyage.fromPort : selectedPort;
  const voyageTo = showVoyageRoute ? voyage.toPort : destinationPort;
  const voyageProgress = showVoyageRoute ? voyage.progress : 0;

  const controlPoint = voyageFrom && voyageTo
    ? getBezierControlPoint(voyageFrom, voyageTo)
    : null;

  const shipPosition =
    showVoyageRoute && controlPoint && voyageFrom && voyageTo
      ? getPointOnBezier(voyageFrom, voyageTo, voyageProgress, controlPoint)
      : null;

  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 100 100"
      style={{ display: 'block' }}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <filter id="port-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feFlood floodColor="#FFF" result="flood" />
          <feComposite in="flood" in2="SourceGraphic" operator="in" result="mask" />
          <feGaussianBlur in="mask" stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect x={0} y={0} width={100} height={100} fill="#0B1D3A" />

      {Array.from({ length: 9 }, (_, i) => {
        const pos = (i + 1) * 10;
        return (
          <g key={`grid-${i}`}>
            <line
              x1={pos} y1={0} x2={pos} y2={100}
              stroke="#1A3A5C" strokeOpacity={0.3} strokeWidth={0.15}
            />
            <line
              x1={0} y1={pos} x2={100} y2={pos}
              stroke="#1A3A5C" strokeOpacity={0.3} strokeWidth={0.15}
            />
          </g>
        );
      })}

      {allRoutes.map(({ from, to, key }) => {
        const cp = getBezierControlPoint(from, to);
        const selected = isSelectedRoute(from.id, to.id);
        const isVoyageRoute = showVoyageRoute &&
          ((voyage.fromPort.id === from.id && voyage.toPort.id === to.id) ||
           (voyage.fromPort.id === to.id && voyage.toPort.id === from.id));
        const active = selected || isVoyageRoute;
        return (
          <path
            key={key}
            d={`M ${from.x} ${from.y} Q ${cp.cx} ${cp.cy} ${to.x} ${to.y}`}
            fill="none"
            stroke={active ? '#E0FBFC' : 'rgba(61, 90, 128, 0.4)'}
            strokeWidth={active ? 0.5 : 0.3}
            strokeDasharray={active ? '2 1.2' : 'none'}
            opacity={active ? 1 : 0.6}
          />
        );
      })}

      {shipPosition && (
        <g transform={`translate(${shipPosition.x}, ${shipPosition.y})`}>
          <polygon
            points="0,-2.5 2,2 -2,2"
            fill="#E0FBFC"
            stroke="#E0FBFC"
            strokeWidth={0.3}
          />
          <line
            x1={0} y1={-2.5} x2={0} y2={-4.5}
            stroke="#E0FBFC"
            strokeWidth={0.3}
          />
          <polygon
            points="0,-4.5 1.5,-3 0,-2.5"
            fill="#F4A261"
          />
        </g>
      )}

      {ports.map((port) => {
        const isHovered = hoveredPortId === port.id;
        const isSelected = selectedPort?.id === port.id;
        const isDestination = destinationPort?.id === port.id;
        const isCurrent = voyage?.fromPort.id === port.id || voyage?.toPort.id === port.id;

        return (
          <g
            key={port.id}
            onClick={() => onPortClick(port)}
            onMouseEnter={() => setHoveredPortId(port.id)}
            onMouseLeave={() => setHoveredPortId(null)}
            style={{ cursor: 'pointer' }}
          >
            {port.isExplored && (
              <circle
                cx={port.x}
                cy={port.y}
                r={PORT_GLOW_RADIUS}
                fill="transparent"
                filter="url(#port-glow)"
              />
            )}
            <circle
              cx={port.x}
              cy={port.y}
              r={PORT_RADIUS}
              fill={isHovered ? '#E0FBFC' : '#3D5A80'}
              stroke={isSelected || isDestination || isCurrent
                ? '#E0FBFC'
                : port.isExplored
                  ? 'rgba(255,255,255,0.3)'
                  : 'rgba(241,250,238,0.2)'}
              strokeWidth={isSelected || isDestination ? 0.6 : 0.3}
            />
            <text
              x={port.x}
              y={port.y + PORT_RADIUS + 3.5}
              textAnchor="middle"
              fill="#F1FAEE"
              fontSize={3}
              fontFamily="Cinzel, serif"
              fontWeight={500}
            >
              {port.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export default MapCanvas;
