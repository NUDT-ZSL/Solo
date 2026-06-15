import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { fpsMonitor } from './utils/fpsMonitor';

const Dashboard = lazy(() => import('./components/Dashboard'));
const FormEditor = lazy(() => import('./components/FormEditor'));
const FormFiller = lazy(() => import('./components/FormFiller'));
const DataViewer = lazy(() => import('./components/DataViewer'));

const LoadingFallback: React.FC = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: '#f1f5f9',
  }}>
    <div style={{
      width: '40px',
      height: '40px',
      border: '3px solid #e2e8f0',
      borderTopColor: '#8b5cf6',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
    <style>{`
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

const App: React.FC = () => {
  const location = useLocation();
  const [loadTime, setLoadTime] = useState<number | null>(null);
  const [fps, setFps] = useState(60);

  useEffect(() => {
    const perf = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (perf) {
      const loadTimeMs = perf.loadEventEnd - perf.startTime;
      setLoadTime(loadTimeMs);
      console.log(`[FormFlow] 页面加载时间: ${loadTimeMs.toFixed(0)}ms`);
    }

    fpsMonitor.start((currentFps) => {
      setFps(currentFps);
      if (currentFps < 55) {
        console.warn(`[FormFlow] FPS 低于 55: ${currentFps}`);
      }
    });

    return () => fpsMonitor.stop();
  }, []);

  useEffect(() => {
    const startTime = performance.now();
    return () => {
      const transitionTime = performance.now() - startTime;
      console.log(`[FormFlow] 路由切换 ${location.pathname} 耗时: ${transitionTime.toFixed(0)}ms`);
    };
  }, [location.pathname]);

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <div style={{
        position: 'fixed',
        top: '12px',
        right: '12px',
        background: 'rgba(30, 41, 59, 0.9)',
        color: '#fff',
        padding: '6px 12px',
        borderRadius: '8px',
        fontSize: '12px',
        fontFamily: 'Inter, monospace',
        zIndex: 9999,
        display: 'flex',
        gap: '16px',
        backdropFilter: 'blur(8px)',
      }}>
        <span>FPS: <b style={{ color: fps >= 55 ? '#14b8a6' : '#ef4444' }}>{fps}</b></span>
        {loadTime && <span>Load: <b style={{ color: loadTime <= 2000 ? '#14b8a6' : '#ef4444' }}>{loadTime.toFixed(0)}ms</b></span>}
      </div>

      <Suspense fallback={<LoadingFallback />}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/forms/new" element={<FormEditor />} />
          <Route path="/forms/:id/edit" element={<FormEditor />} />
          <Route path="/forms/:id/data" element={<DataViewer />} />
          <Route path="/fill/:shareId" element={<FormFiller />} />
        </Routes>
      </Suspense>
    </div>
  );
};

export default App;
