import React from 'react';
import { Task, TaskPosition } from '../types';

interface DependencyLinesProps {
  tasks: Task[];
  positions: TaskPosition[];
  highlightedTaskIds: Set<string>;
}

function getDependencyPath(
  sourcePos: TaskPosition,
  targetPos: TaskPosition
): string {
  const x1 = sourcePos.x + sourcePos.width;
  const y1 = sourcePos.y + sourcePos.height / 2;
  const x2 = targetPos.x;
  const y2 = targetPos.y + targetPos.height / 2;
  const offset = Math.min(Math.abs(x2 - x1) * 0.4, 60);
  return `M ${x1} ${y1} C ${x1 + offset} ${y1}, ${x2 - offset} ${y2}, ${x2} ${y2}`;
}

const DependencyLines = React.memo(function DependencyLines({
  tasks,
  positions,
  highlightedTaskIds,
}: DependencyLinesProps) {
  const posMap = new Map(positions.map(p => [p.id, p]));
  const lines: { key: string; path: string; isHighlighted: boolean }[] = [];

  for (const task of tasks) {
    const targetPos = posMap.get(task.id);
    if (!targetPos) continue;
    for (const depId of task.dependencies) {
      const sourcePos = posMap.get(depId);
      if (!sourcePos) continue;
      const isHighlighted =
        highlightedTaskIds.has(task.id) &&
        highlightedTaskIds.has(depId);
      lines.push({
        key: `${depId}-${task.id}`,
        path: getDependencyPath(sourcePos, targetPos),
        isHighlighted,
      });
    }
  }

  return (
    <g className="dependency-lines">
      {lines.map(line => (
        <path
          key={line.key}
          d={line.path}
          fill="none"
          stroke={line.isHighlighted ? '#4A90D9' : '#ccc'}
          strokeWidth={line.isHighlighted ? 3 : 2}
          style={{ transition: 'stroke 0.15s, stroke-width 0.15s' }}
        />
      ))}
    </g>
  );
});

export default DependencyLines;
