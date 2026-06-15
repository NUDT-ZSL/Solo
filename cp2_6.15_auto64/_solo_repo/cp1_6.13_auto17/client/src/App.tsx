import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import Navbar from '@/components/Navbar';
import HomePage from '@/pages/HomePage';
import ChatPage from '@/pages/ChatPage';
import ProfilePage from '@/pages/ProfilePage';
import RegisterPage from '@/pages/RegisterPage';

export default function App() {
  const { currentUser } = useAppContext();

  return (
    <div>
      {currentUser && <Navbar />}
      <Routes>
        <Route path="/" element={currentUser ? <HomePage /> : <RegisterPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/p/:userId" element={<ProfilePage />} />
        <Route path="*" element={currentUser ? <HomePage /> : <RegisterPage />} />
      </Routes>
    </div>
  );
}
