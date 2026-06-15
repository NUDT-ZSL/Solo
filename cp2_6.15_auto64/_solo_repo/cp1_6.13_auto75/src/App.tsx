import { useState, useCallback, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useBooks } from './hooks/useBooks';
import { useReminders } from './hooks/useReminders';
import { useReservations } from './hooks/useReservations';
import { SearchBar } from './components/SearchBar';
import { BookList } from './components/BookList';
import { ReminderBar } from './components/ReminderBar';
import type { Book, ToastMessage } from './types';
import './App.css';

function HomePage() {
  const { books, setBooks, loading, toasts, borrowBook, returnBook, fetchBooks, showToast } = useBooks();
  const { reminders, fetchReminders } = useReminders();
  const [filter, setFilter] = useState('');

  const handleSyncBooks = useCallback((updatedBooks: Book[]) => {
    setBooks(updatedBooks);
    fetchReminders();
  }, [setBooks, fetchReminders]);

  const { addReservation, cancelReservation, fetchReservations } = useReservations({
    onSyncBooks: handleSyncBooks
  });

  useEffect(() => {
    if (books.length > 0) {
      fetchReservations();
    }
  }, [books.length, fetchReservations]);

  const handleBorrow = useCallback(async (id: string): Promise<boolean> => {
    const book = books.find(b => b.id === id);
    const ok = await addReservation(id, book);
    if (!ok) {
      showToast('error', '预约失败，请稍后重试');
      fetchBooks();
      fetchReminders();
    } else {
      showToast('success', '预约成功！');
      fetchReminders();
    }
    return ok;
  }, [books, addReservation, showToast, fetchBooks, fetchReminders]);

  const handleCancel = useCallback(async (id: string): Promise<boolean> => {
    const ok = await cancelReservation(id);
    if (!ok) {
      showToast('error', '取消失败，请稍后重试');
      fetchBooks();
      fetchReminders();
    } else {
      showToast('success', '取消预约成功！');
      fetchReminders();
    }
    return ok;
  }, [cancelReservation, showToast, fetchBooks, fetchReminders]);

  const handleReturnFromReminder = useCallback(async (id: string): Promise<boolean> => {
    const ok = await returnBook(id);
    if (ok) {
      fetchReminders();
      fetchReservations();
    }
    return ok;
  }, [returnBook, fetchReminders, fetchReservations]);

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
