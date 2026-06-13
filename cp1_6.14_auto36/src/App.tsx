import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Detail from './pages/Detail';
import Match from './pages/Match';
import Messages from './pages/Messages';
import Login from './pages/Login';
import Register from './pages/Register';
import { useAppStore } from './store';
import { getSkills } from './api';

export default function App() {
  const { user, setSkills, setSkillsLoading } = useAppStore();

  useEffect(() => {
    setSkillsLoading(true);
    getSkills()
      .then(setSkills)
      .finally(() => setSkillsLoading(false));
  }, [setSkills, setSkillsLoading]);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/skill/:id" element={<Detail />} />
      <Route path="/match" element={<Match />} />
      <Route path="/messages" element={<Messages />} />
      <Route path="/messages/:peerId" element={<Messages />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
    </Routes>
  );
}
