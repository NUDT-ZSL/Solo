import { useState } from 'react';
import type { Port, VoyageState } from '../types';
import { getPointOnBezier, getBezierControlPoint } from '../GameEngine';

interface MapCanvasProps {
  ports: Port[];
  selectedPort: Port | null;
  destinationPort: Port | null;
  voyage: VoyageState | null;
  onPortClick: (port: Port) => void;
}

const MapCanvas: React.FC<MapCanvasProps> = ({
  ports,
  selectedPort,
  destinationPort,
  voyage,
  onPortClick,
}) => {
  const [hoveredPortId, setHoveredPortId] = useState<string | null>(null);

  const showRoute = selectedPort && destinationPort;
  const controlPoint = showRoute
    ? getBezierControlPoint(selectedPort, destinationPort)
    : null;

  const shipPosition =
    voyage?.status === 'sailing' && showRoute
      ? getPointOnBezier(selectedPort, destinationPort, voyage.progress, controlPoint ?? undefined)
      : null;

  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 100 100"
      style={{ display: 'block' }}
    >
      <defs>
        <filter id="port-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feFlood floodColor="#FFF" result="flood" />
          <feComposite in="flood" in2="SourceGraphic" operator="in" result="mask" />
          <feGaussianBlur in="mask" stdDeviation="1.5" result="blur" />
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

      {showRoute && controlPoint && (
        <path
          d={`M ${selectedPort.x} ${selectedPort.y} Q ${controlPoint.cx} ${controlPoint.cy} ${destinationPort.x} ${destinationPort.y}`}
          fill="none"
          stroke="#E0FBFC"
          strokeWidth={0.4}
          strokeDasharray="1.5 1"
        />
      )}

      {shipPosition && (
        <g transform={`translate(${shipPosition.x}, ${shipPosition.y})`}>
          <polygon
            points="0,-1.5 1.2,1.2 -1.2,1.2"
            fill="#E0FBFC"
            stroke="#E0FBFC"
            strokeWidth={0.2}
          />
          <line
            x1={0} y1={-1.5} x2={0} y2={-3}
            stroke="#E0FBFC"
            strokeWidth={0.2}
          />
        </g>
      )}

      {ports.map((port) => {
        const isHovered = hoveredPortId === port.id;
        const isSelected = selectedPort?.id === port.id;
        const isDestination = destinationPort?.id === port.id;

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
                r={3.5}
                fill="transparent"
                filter="url(#port-glow)"
              />
            )}
            <circle
              cx={port.x}
              cy={port.y}
              r={2.5}
              fill={isHovered ? '#E0FBFC' : '#E76F51'}
              stroke={isSelected ? '#E0FBFC' : isDestination ? '#E0FBFC' : 'none'}
              strokeWidth={isSelected || isDestination ? 0.4 : 0}
            />
            <text
              x={port.x}
              y={port.y + 5}
              textAnchor="middle"
              fill="#F1FAEE"
              fontSize={2.5}
              fontFamily="sans-serif"
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
