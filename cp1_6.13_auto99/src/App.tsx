import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import CartDrawer from './components/CartDrawer';
import BookDetailModal from './components/BookDetailModal';
import BrowsePage from './pages/BrowsePage';
import SharePage from './pages/SharePage';

const App: React.FC = () => {
  return (
    <div className="app">
      <Header />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<BrowsePage />} />
          <Route path="/share/:id" element={<SharePage />} />
        </Routes>
      </main>
      <CartDrawer />
      <BookDetailModal />
    </div>
  );
};

export default App;
