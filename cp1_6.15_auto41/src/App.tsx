import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import WorkDetailPage from './pages/WorkDetailPage';

const fadeStyle = `
@keyframes pageFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.page-fade-in {
  animation: pageFadeIn 0.4s ease-out forwards;
}
`;

const App: React.FC = () => {
  return (
    <>
      <style>{fadeStyle}</style>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/work/:id" element={<WorkDetailPage />} />
      </Routes>
    </>
  );
};

export default App;
