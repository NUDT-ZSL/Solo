import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import RoomEntry from './components/RoomEntry';
import EditorPage from './components/EditorPage';
import TeacherPanel from './monitor/TeacherPanel';

function App() {
  useEffect(() => {
    let userId = localStorage.getItem('userId');
    let username = localStorage.getItem('username');

    if (!userId) {
      userId = uuidv4();
      localStorage.setItem('userId', userId);
    }

    if (!username) {
      username = `用户_${Math.random().toString(36).substring(2, 8)}`;
      localStorage.setItem('username', username);
    }
  }, []);

  return (
    <Routes>
      <Route path="/" element={<RoomEntry />} />
      <Route path="/editor/:roomId" element={<EditorPage />} />
      <Route path="/monitor/:roomId" element={<TeacherPanel />} />
    </Routes>
  );
}

export default App;
