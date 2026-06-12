import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import EditorPage from './pages/EditorPage';
import VersionHistoryPage from './pages/VersionHistoryPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/editor/:roomId" element={<EditorPage />} />
      <Route path="/room/:roomId/versions" element={<VersionHistoryPage />} />
    </Routes>
  );
}
