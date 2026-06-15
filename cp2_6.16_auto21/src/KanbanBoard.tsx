import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
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
      <div className="column-content">
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

  const todoTasks = getTasksByStatus('todo');
  const inProgressTasks = getTasksByStatus('inProgress');
  const doneTasks = getTasksByStatus('done');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const findTaskById = (id: string): Task | undefined => {
    return tasks.find(t => t.id === id);
  };

  const getStatusFromId = (id: string): TaskStatus | null => {
    const task = findTaskById(id);
    return task ? task.status : null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    // Can add visual feedback here if needed
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = findTaskById(activeId);
    if (!activeTask) return;

    const overTask = findTaskById(overId);

    if (overTask) {
      if (activeTask.status !== overTask.status) {
        const overTasks = getTasksByStatus(overTask.status);
        const overIndex = overTasks.findIndex(t => t.id === overId);
        moveTask(activeId, overTask.status, overIndex);
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const activeTask = findTaskById(activeId);
    const overTask = findTaskById(overId);

    if (!activeTask || !overTask) return;

    const overTasks = getTasksByStatus(overTask.status);
    const overIndex = overTasks.findIndex(t => t.id === overId);

    if (activeTask.status === overTask.status) {
      const activeIndex = overTasks.findIndex(t => t.id === activeId);
      if (activeIndex !== overIndex) {
        moveTask(activeId, activeTask.status, overIndex);
      }
    } else {
      moveTask(activeId, overTask.status, overIndex);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="kanban-board">
        <KanbanColumn
          status="todo"
          title="To Do"
          tasks={todoTasks}
          onEdit={onEditTask}
          onDelete={deleteTask}
        />
        <KanbanColumn
          status="inProgress"
          title="In Progress"
          tasks={inProgressTasks}
          onEdit={onEditTask}
          onDelete={deleteTask}
        />
        <KanbanColumn
          status="done"
          title="Done"
          tasks={doneTasks}
          onEdit={onEditTask}
          onDelete={deleteTask}
        />
      </div>
    </DndContext>
  );
};

export default KanbanBoard;
