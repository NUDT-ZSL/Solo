import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { OkrBoard } from './components/OkrBoard';
import { useWebSocket } from './components/WebSocketProvider';

const App: React.FC = () => {
  const { okrs } = useWebSocket();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<OkrBoard okrs={okrs} />} />
        <Route path="/okr/:id" element={<OkrBoard okrs={okrs} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
