import { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useBooks } from './hooks/useBooks';
import { useReminders } from './hooks/useReminders';
import { SearchBar } from './components/SearchBar';
import { BookList } from './components/BookList';
import { ReminderBar } from './components/ReminderBar';
import type { ToastMessage } from './types';
import './App.css';

function HomePage() {
  const { books, loading, toasts, borrowBook, returnBook, fetchBooks } = useBooks();
  const { reminders, fetchReminders } = useReminders();
  const [filter, setFilter] = useState('');

  const handleBorrow = useCallback(async (id: string): Promise<boolean> => {
    const ok = await borrowBook(id);
    if (ok) {
      fetchReminders();
    }
    return ok;
  }, [borrowBook, fetchReminders]);

  const handleCancel = useCallback(async (id: string): Promise<boolean> => {
    const ok = await returnBook(id);
    if (ok) {
      fetchReminders();
    }
    return ok;
  }, [returnBook, fetchReminders]);

  const handleReturnFromReminder = useCallback(async (id: string): Promise<boolean> => {
    const ok = await returnBook(id);
    if (ok) {
      fetchReminders();
    }
    return ok;
  }, [returnBook, fetchReminders]);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">
          <span className="title-icon">📚</span>
          BookNest
        </h1>
        <p className="app-subtitle">社区图书角 · 借阅管理</p>
      </header>

      <SearchBar value={filter} onChange={setFilter} />

      <main className="app-main">
        {loading ? (
          <div className="loading">
            <div className="loading-spinner" />
            <p>加载中...</p>
          </div>
        ) : (
          <BookList
            books={books}
            filter={filter}
            onBorrow={handleBorrow}
            onCancel={handleCancel}
            onRefresh={fetchBooks}
          />
        )}
      </main>

      <ReminderBar reminders={reminders} onReturn={handleReturnFromReminder} />

      <ToastContainer toasts={toasts} />
    </div>
  );
}

function ToastContainer({ toasts }: { toasts: ToastMessage[] }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
}
