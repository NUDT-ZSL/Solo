import React, { lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from './components/Navbar';

const HomePage = lazy(() => import('./pages/HomePage'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const MyProjects = lazy(() => import('./pages/MyProjects'));

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
};

const pageTransition = {
  type: 'tween',
  ease: 'easeOut',
  duration: 0.3,
};

const App: React.FC = () => {
  const location = useLocation();

  return (
    <div className="app" style={{ minHeight: '100vh', backgroundColor: '#1a1a2e' }}>
      <Navbar />
      <main style={{ paddingTop: '60px', minHeight: 'calc(100vh - 60px)' }}>
        <Suspense
          fallback={
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '80vh',
                color: '#a0a0b0',
                fontSize: '18px',
              }}
            >
              加载中...
            </div>
          }
        >
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route
                path="/"
                element={
                  <motion.div
                    initial="initial"
                    animate="in"
                    exit="out"
                    variants={pageVariants}
                    transition={pageTransition}
                  >
                    <HomePage />
                  </motion.div>
                }
              />
              <Route
                path="/project/:id"
                element={
                  <motion.div
                    initial="initial"
                    animate="in"
                    exit="out"
                    variants={pageVariants}
                    transition={pageTransition}
                  >
                    <ProjectDetail />
                  </motion.div>
                }
              />
              <Route
                path="/my-projects"
                element={
                  <motion.div
                    initial="initial"
                    animate="in"
                    exit="out"
                    variants={pageVariants}
                    transition={pageTransition}
                  >
                    <MyProjects />
                  </motion.div>
                }
              />
            </Routes>
          </AnimatePresence>
        </Suspense>
      </main>
    </div>
  );
};

export default App;
