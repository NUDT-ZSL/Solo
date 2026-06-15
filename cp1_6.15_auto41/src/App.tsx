import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import WorkDetailPage from './pages/WorkDetailPage';

const fadeStyle = `
@keyframes pageFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.page-fade-in {
  animation: pageFadeIn 0.4s ease-out forwards;
}
`;

const AnimatedRoutes: React.FC = () => {
  const location = useLocation();
  return (
    <Routes location={location} key={location.pathname}>
      <Route path="/" element={<HomePage />} />
      <Route path="/work/:id" element={<WorkDetailPage />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <>
      <style>{fadeStyle}</style>
      <AnimatedRoutes />
    </>
  );
};

export default App;
