import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Subscribe from './pages/Subscribe';
import Orders from './pages/Orders';
import Admin from './pages/Admin';
import { useAuth } from './context/AuthContext';

const App: React.FC = () => {
  const location = useLocation();
  const { loading } = useAuth();

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <div className="app">
      {!isAuthPage && <Navbar />}

      <main>
        {loading ? (
          <div style={{ padding: '100px', textAlign: 'center', color: '#9ca3af' }}>
            加载中...
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/subscribe/:boxId" element={<Subscribe />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        )}
      </main>
    </div>
  );
};

export default App;
