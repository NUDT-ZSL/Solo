import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import GalleryPage from '@/pages/GalleryPage';
import FeaturedPage from '@/pages/FeaturedPage';
import Toast from '@/components/Toast';
import ShareDialog from '@/components/ShareDialog';
import { useGalleryStore } from '@/hooks/useGalleryStore';

export default function App() {
  const toast = useGalleryStore((s) => s.toast);
  const shareDialogOpen = useGalleryStore((s) => s.shareDialogOpen);
  const location = useLocation();

  useEffect(() => {
    const el = document.querySelector('.featured-page');
    if (el) (el as HTMLElement).scrollTop = 0;
  }, [location.pathname]);

  return (
    <div className="app-root">
      <Navbar />
      <Routes>
        <Route path="/" element={<GalleryPage />} />
        <Route path="/view" element={<GalleryPage />} />
        <Route path="/featured" element={<FeaturedPage />} />
      </Routes>
      <ShareDialog open={shareDialogOpen} />
      <Toast message={toast?.message} visible={toast?.visible || false} />
    </div>
  );
}
