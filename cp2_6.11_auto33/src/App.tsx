import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Workspace } from './components/Workspace';
import { UploadPanel } from './components/UploadPanel';
import { PropertyPanel } from './components/PropertyPanel';
import { StylePanel } from './components/StylePanel';
import { Toolbar } from './components/Toolbar';
import { Gallery } from './components/Gallery';

const EditorPage: React.FC = () => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 24px 120px',
        gap: 24,
        position: 'relative',
      }}
    >
      <Toolbar />

      <div
        style={{
          position: 'fixed',
          left: 24,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 40,
        }}
      >
        <UploadPanel />
      </div>

      <Workspace />

      <PropertyPanel />

      <StylePanel />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<EditorPage />} />
        <Route path="/gallery" element={<Gallery />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
