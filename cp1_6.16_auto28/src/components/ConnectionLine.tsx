import React from 'react';
import { Connection, NodeData, NODE_WIDTH, NODE_HEIGHT } from '@/store';

interface ConnectionLineProps {
  connections: Connection[];
  nodes: NodeData[];
  tempLine: {
    fromId: string;
    toX: number;
    toY: number;
  } | null;
}

function getNodeCenter(node: NodeData) {
  return {
    x: node.x + NODE_WIDTH / 2,
    y: node.y + NODE_HEIGHT / 2,
  };
}

function getNodeRightAnchor(node: NodeData) {
  return {
    x: node.x + NODE_WIDTH,
    y: node.y + NODE_HEIGHT / 2,
  };
}

function getNodeLeftAnchor(node: NodeData) {
  return {
    x: node.x,
    y: node.y + NODE_HEIGHT / 2,
  };
}

function getCurvePath(x1: number, y1: number, x2: number, y2: number) {
  const dx = Math.abs(x2 - x1);
  const controlOffset = Math.max(dx * 0.5, 40);

  return `M ${x1} ${y1} C ${x1 + controlOffset} ${y1}, ${x2 - controlOffset} ${y2}, ${x2} ${y2}`;
}

const ConnectionLine: React.FC<ConnectionLineProps> = ({ connections, nodes, tempLine }) => {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#2E86C1" />
        </marker>
      </defs>

      {connections.map((conn) => {
        const fromNode = nodeMap.get(conn.from);
        const toNode = nodeMap.get(conn.to);
        if (!fromNode || !toNode) return null;

        let start = getNodeRightAnchor(fromNode);
        let end = getNodeLeftAnchor(toNode);

        if (toNode.x < fromNode.x) {
          start = getNodeLeftAnchor(fromNode);
          end = getNodeRightAnchor(toNode);
        }

        const path = getCurvePath(start.x, start.y, end.x, end.y);

        return (
          <path
            key={conn.id}
            d={path}
            stroke="#2E86C1"
            strokeWidth="2"
            fill="none"
            style={{
              transition: 'd 0.3s ease-out',
            }}
          />
        );
      })}

      {tempLine && (() => {
        const fromNode = nodeMap.get(tempLine.fromId);
        if (!fromNode) return null;

        const start = getNodeRightAnchor(fromNode);
        const path = getCurvePath(start.x, start.y, tempLine.toX, tempLine.toY);

        return (
          <path
            d={path}
            stroke="#4A90D9"
            strokeWidth="2"
            strokeDasharray="8 4"
            fill="none"
            opacity="0.7"
          />
        );
      })()}
    </svg>
  );
};

export default ConnectionLine;
