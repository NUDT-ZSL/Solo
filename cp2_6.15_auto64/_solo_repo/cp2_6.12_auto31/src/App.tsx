import { Routes, Route, Navigate } from 'react-router-dom';

const StudioPage: React.FC = () => {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <h1 style={{ color: '#e0e0e0', fontSize: '2rem' }}>Studio 工作区</h1>
    </div>
  );
};

const LibraryPage: React.FC = () => {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <h1 style={{ color: '#e0e0e0', fontSize: '2rem' }}>素材库</h1>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        overflow: 'auto',
      }}
    >
      <div
        style={{
          maxWidth: '1920px',
          margin: '0 auto',
          padding: '0 16px',
          minHeight: '100%',
          width: '100%',
        }}
      >
        <Routes>
          <Route path="/studio" element={<StudioPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="*" element={<Navigate to="/studio" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export default App;
