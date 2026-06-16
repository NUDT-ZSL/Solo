import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import type { Book, Recommendation, LayoutRecommendation } from './types';
import { getBooks, getRecommendations, getLayoutRecommendation, submitRecommendation } from './api/bookApi';
import Bookshelf from './components/Bookshelf';
import ReaderRecommend from './components/ReaderRecommend';
import LayoutRecommend from './components/LayoutRecommend';
import StockWarningPanel from './components/StockWarningPanel';
import './App.css';

const HomePage = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [booksData, recsData] = await Promise.all([
        getBooks(),
        getRecommendations()
      ]);
      setBooks(booksData);
      setRecommendations(recsData);
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRecommendation = async (data: {
    bookTitle: string;
    recommenderName: string;
    reason: string;
  }) => {
    const newRec = await submitRecommendation(data);
    setRecommendations((prev) => [newRec, ...prev].slice(0, 100));
  };

  const handleRestock = (bookId: string) => {
    setBooks((prev) =>
      prev.map((book) =>
        book.id === bookId
          ? { ...book, stock: book.stock + 10 }
          : book
      )
    );
  };

  const lowStockBooks = books.filter((b) => b.stock < 3);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>正在加载书店数据...</p>
      </div>
    );
  }

  return (
    <div className="home-page">
      <StockWarningPanel lowStockBooks={lowStockBooks} onRestock={handleRestock} />
      <div className="main-content">
        <Bookshelf books={books} lowStockBooks={lowStockBooks} />
        <ReaderRecommend
          recommendations={recommendations}
          onSubmitRecommendation={handleSubmitRecommendation}
        />
      </div>
    </div>
  );
};

const LayoutRecommendPage = () => {
  const [layout, setLayout] = useState<LayoutRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLayout();
  }, []);

  const loadLayout = async () => {
    try {
      setLoading(true);
      const data = await getLayoutRecommendation();
      setLayout(data);
    } catch (err) {
      console.error('加载布局推荐失败:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>正在生成布局推荐...</p>
      </div>
    );
  }

  return <LayoutRecommend layout={layout} />;
};

const ReaderRecommendPage = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      const data = await getRecommendations();
      setRecommendations(data);
    } catch (err) {
      console.error('加载推荐失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRecommendation = async (data: {
    bookTitle: string;
    recommenderName: string;
    reason: string;
  }) => {
    const newRec = await submitRecommendation(data);
    setRecommendations((prev) => [newRec, ...prev].slice(0, 100));
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>正在加载推荐数据...</p>
      </div>
    );
  }

  return (
    <div className="reader-page">
      <ReaderRecommend
        recommendations={recommendations}
        onSubmitRecommendation={handleSubmitRecommendation}
      />
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <nav className="navbar">
          <div className="nav-brand">📚 书店助手</div>
          <div className="nav-links">
            <NavLink to="/home" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              🏠 首页
            </NavLink>
            <NavLink to="/reader-recommend" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              📝 读者推荐
            </NavLink>
            <NavLink to="/layout-recommend" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              🗺️ 书展布局
            </NavLink>
          </div>
        </nav>

        <main className="page-content">
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/reader-recommend" element={<ReaderRecommendPage />} />
            <Route path="/layout-recommend" element={<LayoutRecommendPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
