import React from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { motion } from 'framer-motion';
import type { Task } from '@/types';
import { PRIORITY_COLORS } from '@/types';

interface TaskCardProps {
  task: Task;
  index: number;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, index }) => {
  const priorityColor = PRIORITY_COLORS[task.priority];
  const displayTitle =
    task.title.length > 15 ? task.title.slice(0, 15) + '...' : task.title;

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
            ...provided.draggableProps.style,
            marginBottom: 10,
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{
              opacity: snapshot.isDragging ? 0.7 : 1,
              y: 0,
              scale: snapshot.isDragging ? 0.95 : 1,
              transition: {
                type: 'spring',
                stiffness: 500,
                damping: 30,
                duration: 0.3,
              },
            }}
            whileHover={{
              y: -2,
              transition: { duration: 0.2 },
            }}
            style={{
              background: '#ffffff',
              borderRadius: 8,
              padding: '12px 12px 12px 16px',
              boxShadow: snapshot.isDragging
                ? '0 8px 16px rgba(0,0,0,0.12)'
                : '0 2px 4px rgba(0,0,0,0.06)',
              borderLeft: `4px solid ${priorityColor}`,
              cursor: 'grab',
              userSelect: 'none',
              minHeight: 70,
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#2d3436',
                  lineHeight: 1.4,
                  wordBreak: 'break-all',
                }}
                title={task.title}
              >
                {displayTitle}
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: `linear-gradient(135deg, #4d79ff, #6c5ce7)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#ffffff',
                      flexShrink: 0,
                    }}
                  >
                    {task.assignee.charAt(0)}
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      color: '#636e72',
                    }}
                  >
                    {task.assignee}
                  </span>
                </div>

                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#636e72',
                    background: '#f1f3f5',
                    padding: '3px 8px',
                    borderRadius: 10,
                  }}
                >
                  {task.estimateHours}h
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </Draggable>
  );
};

export default TaskCard;
