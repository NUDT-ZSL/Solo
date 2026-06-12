import React from 'react';
import { motion } from 'framer-motion';
import { Task, TaskPosition, CATEGORY_COLORS } from '../types';

interface TaskBarProps {
  task: Task;
  position: TaskPosition;
  isHighlighted: boolean;
  isDependencyHighlighted: boolean;
  onMouseEnter: (e: React.MouseEvent, task: Task) => void;
  onMouseMove: (e: React.MouseEvent, task: Task) => void;
  onMouseLeave: () => void;
  onClick: (taskId: string) => void;
}

const TaskBar = React.memo(function TaskBar({
  task,
  position,
  isHighlighted,
  isDependencyHighlighted,
  onMouseEnter,
  onMouseMove,
  onMouseLeave,
  onClick,
}: TaskBarProps) {
  const baseColor = CATEGORY_COLORS[task.category];
  const borderColor = isHighlighted || isDependencyHighlighted
    ? '#4A90D9'
    : 'transparent';

  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <motion.rect
        x={position.x}
        y={position.y}
        height={position.height}
        rx={6}
        ry={6}
        fill={baseColor}
        stroke={borderColor}
        strokeWidth={isHighlighted || isDependencyHighlighted ? 2.5 : 0}
        initial={{ width: 0 }}
        animate={{ width: position.width }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={{ cursor: 'pointer' }}
        onMouseEnter={(e) => onMouseEnter(e as unknown as React.MouseEvent, task)}
        onMouseMove={(e) => onMouseMove(e as unknown as React.MouseEvent, task)}
        onMouseLeave={onMouseLeave}
        onClick={() => onClick(task.id)}
      />
      {(position.width > 40) && (
        <motion.text
          x={position.x + 8}
          y={position.y + position.height / 2 + 4}
          fontSize={11}
          fill="#2c3e50"
          fontWeight={500}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.2 }}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {task.name.length * 7 > position.width - 16
            ? task.name.slice(0, Math.floor((position.width - 16) / 7)) + '…'
            : task.name}
        </motion.text>
      )}
    </motion.g>
  );
});

export default TaskBar;
