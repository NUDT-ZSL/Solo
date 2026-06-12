import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DesignerView from './views/DesignerView';
import PlayerView from './components/PlayerView';
import HomePage from './views/HomePage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/designer/:roomId?" element={<DesignerView />} />
        <Route path="/play/:sessionId" element={<PlayerView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
