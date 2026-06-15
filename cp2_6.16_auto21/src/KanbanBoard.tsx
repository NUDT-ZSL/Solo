import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, TaskStatus, useTasks } from './store';
import TaskCard from './TaskCard';
import './KanbanBoard.css';

interface KanbanColumnProps {
  status: TaskStatus;
  title: string;
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

const statusConfig: Record<TaskStatus, { label: string; accent: string }> = {
  todo: { label: '待办', accent: '#8b8b8b' },
  inProgress: { label: '进行中', accent: '#6b7a8f' },
  done: { label: '完成', accent: '#6b8e6b' },
};

const KanbanColumn: React.FC<KanbanColumnProps> = ({ status, title, tasks, onEdit, onDelete }) => {
  const config = statusConfig[status];

  return (
    <div className="kanban-column" data-status={status}>
      <div className="column-header">
        <div className="column-title-wrapper">
          <span
            className="column-accent"
            style={{ backgroundColor: config.accent }}
          />
          <h2 className="column-title">{title}</h2>
          <span className="column-count">{tasks.length}</span>
        </div>
      </div>
      <div className="column-content" data-droppable-id={status}>
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="empty-column">
            <p>暂无任务</p>
          </div>
        )}
      </div>
    </div>
  );
};

interface KanbanBoardProps {
  onEditTask: (task: Task) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ onEditTask }) => {
  const { getTasksByStatus, moveTask, tasks, deleteTask } = useTasks();
  const [activeId, setActiveId] = useState<string | null>(null);

  const todoTasks = getTasksByStatus('todo');
  const inProgressTasks = getTasksByStatus('inProgress');
  const doneTasks = getTasksByStatus('done');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const findTaskById = (id: string): Task | undefined => {
    return tasks.find(t => t.id === id);
  };

  const activeTask = activeId ? findTaskById(activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;

    const activeTaskItem = findTaskById(activeIdStr);
    if (!activeTaskItem) return;

    const overTaskItem = findTaskById(overIdStr);

    if (overTaskItem) {
      if (activeTaskItem.status !== overTaskItem.status) {
        const overTasks = getTasksByStatus(overTaskItem.status);
        const overIndex = overTasks.findIndex(t => t.id === overIdStr);
        moveTask(activeIdStr, overTaskItem.status, overIndex);
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;

    if (!over) return;

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;

    if (activeIdStr === overIdStr) return;

    const activeTaskItem = findTaskById(activeIdStr);
    const overTaskItem = findTaskById(overIdStr);

    if (!activeTaskItem || !overTaskItem) return;

    const overTasks = getTasksByStatus(overTaskItem.status);
    const overIndex = overTasks.findIndex(t => t.id === overIdStr);

    if (activeTaskItem.status === overTaskItem.status) {
      const activeIndex = overTasks.findIndex(t => t.id === activeIdStr);
      if (activeIndex !== overIndex) {
        moveTask(activeIdStr, activeTaskItem.status, overIndex);
      }
    } else {
      moveTask(activeIdStr, overTaskItem.status, overIndex);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const handleEdit = (task: Task) => {
    onEditTask(task);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="kanban-board">
        <KanbanColumn
          status="todo"
          title="To Do"
          tasks={todoTasks}
          onEdit={handleEdit}
          onDelete={deleteTask}
        />
        <KanbanColumn
          status="inProgress"
          title="In Progress"
          tasks={inProgressTasks}
          onEdit={handleEdit}
          onDelete={deleteTask}
        />
        <KanbanColumn
          status="done"
          title="Done"
          tasks={doneTasks}
          onEdit={handleEdit}
          onDelete={deleteTask}
        />
      </div>

      <DragOverlay>
        {activeTask ? (
          <div
            className="task-card drag-overlay-card"
            style={{
              transform: `translate3d(0, 0, 0) scale(1.02)`,
              opacity: 0.6,
            }}
          >
            <h3 className="task-card-title">{activeTask.title || '无标题'}</h3>
            {(() => {
              const tmp = document.createElement('div');
              tmp.innerHTML = activeTask.description;
              const plain = tmp.textContent || tmp.innerText || '';
              const preview = plain.length > 60
                ? plain.substring(0, 60) + '...'
                : plain;
              return preview ? <p className="task-card-content">{preview}</p> : null;
            })()}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default KanbanBoard;
