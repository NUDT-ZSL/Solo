import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import SessionManager from './modules/session/SessionManager';
import PlayerDashboard from './modules/player/PlayerDashboard';
import GameRankings from './modules/ranking/GameRankings';

function App() {
  return (
    <div className="app">
      <Navbar />
      <div className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/session" replace />} />
          <Route path="/session" element={<SessionManager />} />
          <Route path="/session/:id" element={<SessionManager />} />
          <Route path="/player/:id" element={<PlayerDashboard />} />
          <Route path="/rankings" element={<GameRankings />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
