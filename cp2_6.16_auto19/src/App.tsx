import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import NotificationDrawer from './components/NotificationDrawer';
import BookList from './pages/BookList';
import BookDetail from './pages/BookDetail';
import MyBooks from './pages/MyBooks';
import ExchangeHub from './pages/ExchangeHub';
import Login from './pages/Login';
import Register from './pages/Register';

export default function App() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Navbar onNotificationClick={() => setDrawerOpen(true)} />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<BookList />} />
              <Route path="/book/:id" element={<BookDetail />} />
              <Route path="/my-books" element={<MyBooks />} />
              <Route path="/exchange" element={<ExchangeHub />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Routes>
          </main>
          <NotificationDrawer
            isOpen={drawerOpen}
            onClose={() => setDrawerOpen(false)}
          />
        </div>
      </Router>
    </AuthProvider>
  );
}
