import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';

const HomePage = lazy(() => import('./pages/HomePage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const StoryDetailPage = lazy(() => import('./pages/StoryDetailPage'));

export default function App() {
  return (
    <div style={{ minHeight: '100vh' }}>
      <Header />
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
        <Suspense fallback={<div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>加载中...</div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/story/:id" element={<StoryDetailPage />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
