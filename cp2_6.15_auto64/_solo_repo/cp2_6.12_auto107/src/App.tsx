import { useCallback, useState } from 'react';
import { Task, addDays, formatDate, CATEGORY_COLORS } from './types';
import GanttChart from './GanttChart';
import TaskForm from './TaskForm';

const now = new Date();
now.setHours(0, 0, 0, 0);

const initialTasks: Task[] = [
  {
    id: 'demo-1',
    name: '需求分析',
    startDate: now,
    endDate: addDays(now, 5),
    category: 'completed',
    dependencies: [],
  },
  {
    id: 'demo-2',
    name: 'UI 设计',
    startDate: addDays(now, 3),
    endDate: addDays(now, 10),
    category: 'completed',
    dependencies: ['demo-1'],
  },
  {
    id: 'demo-3',
    name: '前端开发',
    startDate: addDays(now, 8),
    endDate: addDays(now, 20),
    category: 'inProgress',
    dependencies: ['demo-2'],
  },
  {
    id: 'demo-4',
    name: '后端 API 开发',
    startDate: addDays(now, 8),
    endDate: addDays(now, 22),
    category: 'inProgress',
    dependencies: ['demo-1'],
  },
  {
    id: 'demo-5',
    name: '集成测试',
    startDate: addDays(now, 20),
    endDate: addDays(now, 26),
    category: 'planned',
    dependencies: ['demo-3', 'demo-4'],
  },
  {
    id: 'demo-6',
    name: '部署上线',
    startDate: addDays(now, 26),
    endDate: addDays(now, 28),
    category: 'planned',
    dependencies: ['demo-5'],
  },
];

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);

  const addTask = useCallback((task: Task) => {
    setTasks(prev => [...prev, task]);
    setNewlyAddedId(task.id);
  }, []);

  const consumeNewlyAdded = useCallback(() => {
    setNewlyAddedId(null);
  }, []);

  const completedCount = tasks.filter(t => t.category === 'completed').length;

  return (
    <div className="app-root">
      <header className="app-header">
        <h1 className="app-title">交互式甘特图</h1>
        <div className="app-header-info">
          <span className="header-badge" style={{ background: CATEGORY_COLORS.completed }}>
            {completedCount} 已完成
          </span>
          <span className="header-badge" style={{ background: CATEGORY_COLORS.inProgress }}>
            {tasks.filter(t => t.category === 'inProgress').length} 进行中
          </span>
          <span className="header-badge" style={{ background: CATEGORY_COLORS.planned }}>
            {tasks.filter(t => t.category === 'planned').length} 计划中
          </span>
        </div>
      </header>

      <div className="app-body">
        <TaskForm tasks={tasks} onAddTask={addTask} />
        <GanttChart
          tasks={tasks}
          newlyAddedId={newlyAddedId}
          onNewAddedConsumed={consumeNewlyAdded}
        />
      </div>
    </div>
  );
}
