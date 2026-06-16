import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Dashboard from './components/Dashboard';
import BookList from './components/BookList';
import BookDetailPage from './components/BookDetailPage';
import MemberList from './components/MemberList';
import { Book, Member, BorrowRecord } from './types';
import { fetchBooks, fetchMembers, fetchBorrowRecords } from './services/api';

function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [borrowRecords, setBorrowRecords] = useState<BorrowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    async function loadData() {
      try {
        const [booksData, membersData, recordsData] = await Promise.all([
          fetchBooks(),
          fetchMembers(),
          fetchBorrowRecords(),
        ]);
        setBooks(booksData);
        setMembers(membersData);
        setBorrowRecords(recordsData);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const refreshData = async () => {
    try {
      const [booksData, membersData, recordsData] = await Promise.all([
        fetchBooks(),
        fetchMembers(),
        fetchBorrowRecords(),
      ]);
      setBooks(booksData);
      setMembers(membersData);
      setBorrowRecords(recordsData);
    } catch (err) {
      console.error('Failed to refresh data:', err);
    }
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <>
      <nav className="navbar">
        <NavLink to="/" className="navbar-brand">青藤书屋</NavLink>
        <ul className="navbar-links">
          <li><NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>仪表盘</NavLink></li>
          <li><NavLink to="/books" className={({ isActive }) => isActive ? 'active' : ''}>图书管理</NavLink></li>
          <li><NavLink to="/members" className={({ isActive }) => isActive ? 'active' : ''}>会员管理</NavLink></li>
        </ul>
      </nav>
      <main className="main-content" key={location.pathname}>
        <Routes>
          <Route path="/" element={<Dashboard books={books} members={members} borrowRecords={borrowRecords} />} />
          <Route path="/books" element={<BookList books={books} members={members} onRefresh={refreshData} />} />
          <Route path="/books/:id" element={<BookDetailPage books={books} members={members} borrowRecords={borrowRecords} onRefresh={refreshData} />} />
          <Route path="/members" element={<MemberList members={members} onRefresh={refreshData} />} />
        </Routes>
      </main>
    </>
  );
}

export default App;
