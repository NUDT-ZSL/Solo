import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import PollDetail from './pages/PollDetail';
import CreatePoll from './pages/CreatePoll';

const App: React.FC = () => {
  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={{ flex: 1, padding: '24px 0' }}>
        <div className="container">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/poll/:id" element={<PollDetail />} />
            <Route path="/create" element={<CreatePoll />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default App;
