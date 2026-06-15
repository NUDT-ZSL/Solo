import React, { useState, useCallback, useEffect } from 'react';
import Calendar from './components/Calendar';
import DetailPanel from './components/DetailPanel';
import { Todo, TodoFormData } from './types';
import {
  fetchTodosByDate,
  fetchTodosByDateRange,
  createTodo,
  updateTodo,
  deleteTodo,
  reorderTodos,
} from './api';

const getTodayString = (): string => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};

const App: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [allTodos, setAllTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(false);

  const todosMap = allTodos.reduce<Record<string, Todo[]>>((acc, todo) => {
    if (!acc[todo.date]) {
      acc[todo.date] = [];
    }
    acc[todo.date].push(todo);
    return acc;
  }, {});

  const selectedTodos = todosMap[selectedDate] || [];

  const handleDateSelect = useCallback((date: string) => {
    setSelectedDate(date);
    setIsPanelOpen(true);
  }, []);

  const handleMonthChange = useCallback(async (startDate: string, endDate: string) => {
    setLoading(true);
    try {
      const todos = await fetchTodosByDateRange(startDate, endDate);
      setAllTodos((prev) => {
        const existingMap = new Map(prev.map((t) => [t.id, t]));
        todos.forEach((t) => existingMap.set(t.id, t));
        return Array.from(existingMap.values());
      });
    } catch (error) {
      console.error('Failed to fetch todos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isPanelOpen && selectedDate && selectedTodos.length === 0 && !loading) {
      fetchTodosByDate(selectedDate).then((todos) => {
        setAllTodos((prev) => {
          const filtered = prev.filter((t) => t.date !== selectedDate);
          return [...filtered, ...todos];
        });
      }).catch((error) => {
        console.error('Failed to fetch todos for date:', error);
      });
    }
  }, [isPanelOpen, selectedDate, selectedTodos.length, loading]);

  const handleCreate = useCallback(async (data: TodoFormData) => {
    const orderIndex = selectedTodos.length;
    const newTodo = await createTodo(selectedDate, { ...data, order_index: orderIndex });
    setAllTodos((prev) => [...prev, newTodo]);
  }, [selectedDate, selectedTodos.length]);

  const handleUpdate = useCallback(async (id: number, data: Partial<TodoFormData>) => {
    const updatedTodo = await updateTodo(id, data);
    setAllTodos((prev) => prev.map((t) => (t.id === id ? updatedTodo : t)));
  }, []);

  const handleDelete = useCallback(async (id: number) => {
    await deleteTodo(id);
    setAllTodos((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleReorder = useCallback(async (orderedIds: number[]) => {
    const reorderedTodos = orderedIds.map((id, index) => {
      const todo = allTodos.find((t) => t.id === id);
      return todo ? { ...todo, order_index: index } : null;
    }).filter(Boolean) as Todo[];

    setAllTodos((prev) => {
      const others = prev.filter((t) => t.date !== selectedDate || !orderedIds.includes(t.id));
      return [...others, ...reorderedTodos];
    });

    try {
      await reorderTodos(selectedDate, orderedIds);
    } catch (error) {
      console.error('Failed to reorder todos:', error);
    }
  }, [allTodos, selectedDate]);

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1 style={styles.appTitle}>📅 我的备忘录</h1>
        <p style={styles.appSubtitle}>记录每一天的重要事项</p>
      </header>

      <main style={styles.main}>
        <div style={styles.calendarWrapper}>
          <Calendar
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            todosMap={todosMap}
            onMonthChange={handleMonthChange}
          />
        </div>
      </main>

      <DetailPanel
        selectedDate={selectedDate}
        todos={selectedTodos.sort((a, b) => a.order_index - b.order_index)}
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onReorder={handleReorder}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    backgroundColor: 'var(--bg-primary)',
  },
  header: {
    padding: '32px 24px 16px',
    textAlign: 'center',
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: 4,
  },
  appSubtitle: {
    fontSize: 14,
    color: 'var(--text-secondary)',
  },
  main: {
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'center',
  },
  calendarWrapper: {
    maxWidth: 600,
    width: '100%',
  },
};

export default App;
