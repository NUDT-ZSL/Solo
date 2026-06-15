import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Home from './pages/Home';
import StoryDetail from './pages/StoryDetail';
import JoinPage from './pages/JoinPage';

export interface UserInfo {
  id: string;
  nickname: string;
  color: string;
  storyId: string;
}

export const UserContext = React.createContext<{
  user: UserInfo | null;
  setUser: (user: UserInfo | null) => void;
}>({ user: null, setUser: () => {} });

export default function App() {
  const [user, setUser] = useState<UserInfo | null>(() => {
    const stored = localStorage.getItem('tribetales_user');
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('tribetales_user', JSON.stringify(user));
    }
  }, [user]);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/story/:id" element={<StoryDetail />} />
        <Route path="/join/:inviteCode" element={<JoinPage />} />
      </Routes>
    </UserContext.Provider>
  );
}
