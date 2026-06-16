import React, { useEffect, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Gallery from './pages/Gallery';
import Detail from './pages/Detail';

const App: React.FC = () => {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState('fadeIn');

  useEffect(() => {
    if (location !== displayLocation) {
      setTransitionStage('fadeOut');
    }
  }, [location, displayLocation]);

  const handleAnimationEnd = () => {
    if (transitionStage === 'fadeOut') {
      setDisplayLocation(location);
      setTransitionStage('fadeIn');
    }
  };

  return (
    <div className="app">
      <Navbar />
      <div
        className={`page-transition ${transitionStage}`}
        onAnimationEnd={handleAnimationEnd}
        style={{
          animation: transitionStage === 'fadeIn' 
            ? 'fadeInUp 0.3s ease forwards' 
            : 'fadeOut 0.3s ease forwards'
        }}
      >
        <Routes location={displayLocation}>
          <Route path="/" element={<Gallery />} />
          <Route path="/work/:id" element={<Detail />} />
        </Routes>
      </div>
    </div>
  );
};

export default App;
