import type { BoardState, BoardAction, Task, Column, Priority } from '@/types';

const TODO_ID = 'column-todo';
const IN_PROGRESS_ID = 'column-in-progress';
const DONE_ID = 'column-done';

const initialColumns: Record<string, Column> = {
  [TODO_ID]: {
    id: TODO_ID,
    title: '待办',
    taskIds: ['task-1', 'task-2', 'task-3'],
  },
  [IN_PROGRESS_ID]: {
    id: IN_PROGRESS_ID,
    title: '进行中',
    taskIds: ['task-4', 'task-5'],
  },
  [DONE_ID]: {
    id: DONE_ID,
    title: '已完成',
    taskIds: ['task-6', 'task-7'],
  },
};

const initialTasks: Record<string, Task> = {
  'task-1': {
    id: 'task-1',
    title: '完成登录页面设计稿',
    assignee: '张三',
    estimateHours: 4,
    priority: 'high',
    columnId: TODO_ID,
  },
  'task-2': {
    id: 'task-2',
    title: '编写用户认证接口文档',
    assignee: '李四',
    estimateHours: 2,
    priority: 'medium',
    columnId: TODO_ID,
  },
  'task-3': {
    id: 'task-3',
    title: '修复订单列表分页bug',
    assignee: '王五',
    estimateHours: 3,
    priority: 'urgent',
    columnId: TODO_ID,
  },
  'task-4': {
    id: 'task-4',
    title: '开发商品搜索筛选功能',
    assignee: '赵六',
    estimateHours: 8,
    priority: 'high',
    columnId: IN_PROGRESS_ID,
  },
  'task-5': {
    id: 'task-5',
    title: '优化首页加载性能',
    assignee: '钱七',
    estimateHours: 6,
    priority: 'medium',
    columnId: IN_PROGRESS_ID,
  },
  'task-6': {
    id: 'task-6',
    title: '搭建项目基础框架',
    assignee: '张三',
    estimateHours: 5,
    priority: 'high',
    columnId: DONE_ID,
  },
  'task-7': {
    id: 'task-7',
    title: '编写单元测试用例',
    assignee: '李四',
    estimateHours: 4,
    priority: 'low',
    columnId: DONE_ID,
  },
  'task-8': {
    id: 'task-8',
    title: '设计数据库表结构',
    assignee: '张三',
    estimateHours: 6,
    priority: 'medium',
    columnId: TODO_ID,
  },
  'task-9': {
    id: 'task-9',
    title: '接入支付网关API',
    assignee: '王五',
    estimateHours: 8,
    priority: 'urgent',
    columnId: TODO_ID,
  },
  'task-10': {
    id: 'task-10',
    title: '编写API接口单元测试',
    assignee: '赵六',
    estimateHours: 3,
    priority: 'low',
    columnId: IN_PROGRESS_ID,
  },
};

export const initialBoardState: BoardState = {
  tasks: initialTasks,
  columns: {
    ...initialColumns,
    [TODO_ID]: {
      ...initialColumns[TODO_ID],
      taskIds: ['task-1', 'task-2', 'task-3', 'task-8', 'task-9'],
    },
    [IN_PROGRESS_ID]: {
      ...initialColumns[IN_PROGRESS_ID],
      taskIds: ['task-4', 'task-5', 'task-10'],
    },
  },
  columnOrder: [TODO_ID, IN_PROGRESS_ID, DONE_ID],
};

export const TODO_COLUMN_ID = TODO_ID;

function generateId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function boardReducer(state: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case 'MOVE_TASK': {
      const { source, destination } = action.payload;

      if (!destination) return state;
      if (
        source.droppableId === destination.droppableId &&
        source.index === destination.index
      ) {
        return state;
      }

      const startColumn = state.columns[source.droppableId];
      const finishColumn = state.columns[destination.droppableId];

      if (!startColumn || !finishColumn) return state;

      const newStartTaskIds = Array.from(startColumn.taskIds);
      const [movedTaskId] = newStartTaskIds.splice(source.index, 1);

      if (startColumn === finishColumn) {
        newStartTaskIds.splice(destination.index, 0, movedTaskId);
        const newColumn = { ...startColumn, taskIds: newStartTaskIds };
        return {
          ...state,
          columns: {
            ...state.columns,
            [newColumn.id]: newColumn,
          },
        };
      }

      const newFinishTaskIds = Array.from(finishColumn.taskIds);
      newFinishTaskIds.splice(destination.index, 0, movedTaskId);

      const movedTask = state.tasks[movedTaskId];
      const updatedTask: Task = movedTask
        ? { ...movedTask, columnId: finishColumn.id }
        : movedTask;

      return {
        ...state,
        tasks: {
          ...state.tasks,
          ...(updatedTask ? { [movedTaskId]: updatedTask } : {}),
        },
        columns: {
          ...state.columns,
          [startColumn.id]: { ...startColumn, taskIds: newStartTaskIds },
          [finishColumn.id]: { ...finishColumn, taskIds: newFinishTaskIds },
        },
      };
    }

    case 'ADD_TASK': {
      const taskId = generateId();
      const newTask: Task = {
        ...action.payload,
        id: taskId,
        columnId: TODO_ID,
      } as Task;

      const todoColumn = state.columns[TODO_ID];
      const newTodoTaskIds = [taskId, ...todoColumn.taskIds];

      return {
        ...state,
        tasks: {
          ...state.tasks,
          [taskId]: newTask,
        },
        columns: {
          ...state.columns,
          [TODO_ID]: {
            ...todoColumn,
            taskIds: newTodoTaskIds,
          },
        },
      };
    }

    default:
      return state;
  }
}

export function getAllTasks(state: BoardState): Task[] {
  return Object.values(state.tasks);
}

export function getColumnTasks(
  state: BoardState,
  columnId: string,
  searchKeyword: string = ''
): Task[] {
  const column = state.columns[columnId];
  if (!column) return [];

  const keyword = searchKeyword.trim().toLowerCase();
  const allTasks = column.taskIds
    .map((id) => state.tasks[id])
    .filter(Boolean) as Task[];

  if (!keyword) return allTasks;

  return allTasks.filter(
    (task) =>
      task.title.toLowerCase().includes(keyword) ||
      task.assignee.toLowerCase().includes(keyword)
  );
}

export function createNewTaskData(
  title: string,
  assignee: string,
  estimateHours: number,
  priority: Priority
): Omit<Task, 'id' | 'columnId'> {
  return {
    title: title.length > 15 ? title.slice(0, 15) : title,
    assignee,
    estimateHours: Math.max(1, Math.round(estimateHours)),
    priority,
  };
}
