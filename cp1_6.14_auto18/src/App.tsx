import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Toast from '@/components/Toast';
import HomePage from '@/pages/HomePage';
import ProjectDetailPage from '@/pages/ProjectDetailPage';
import CreateProjectPage from '@/pages/CreateProjectPage';

const AnimatedRoutes = () => {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const [displayLocation, setDisplayLocation] = useState(location);

  useEffect(() => {
    setIsVisible(false);
    const timer = setTimeout(() => {
      setDisplayLocation(location);
      setIsVisible(true);
    }, 150);
    return () => clearTimeout(timer);
  }, [location]);

  return (
    <div
      className="transition-opacity duration-300 ease-in-out"
      style={{ opacity: isVisible ? 1 : 0 }}
    >
      <Routes location={displayLocation}>
        <Route path="/" element={<HomePage />} />
        <Route path="/project/:id" element={<ProjectDetailPage />} />
        <Route path="/create" element={<CreateProjectPage />} />
      </Routes>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#f8fafc]">
        <Navbar />
        <Toast />
        <main className="pt-16">
          <AnimatedRoutes />
        </main>
      </div>
    </Router>
  );
}
