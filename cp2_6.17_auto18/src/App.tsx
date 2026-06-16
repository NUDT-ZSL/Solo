import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useExhibitionStore } from '@/store';
import CanvasBoard from '@/components/CanvasBoard';
import Toolbar from '@/components/Toolbar';
import InfoPanel from '@/components/InfoPanel';
import Toast from '@/components/Toast';
import LoadModal from '@/components/LoadModal';
import MobileHeader from '@/components/MobileHeader';

function Editor() {
  const { selectedWallId, selectedExhibitId, deleteWall, deleteExhibit } = useExhibitionStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedWallId) {
          deleteWall(selectedWallId);
        } else if (selectedExhibitId) {
          deleteExhibit(selectedExhibitId);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedWallId, selectedExhibitId, deleteWall, deleteExhibit]);

  return (
    <div className="w-full h-full flex bg-[#0f172a]">
      <MobileHeader />
      <Toolbar />
      <main className="flex-1 relative lg:pt-0 pt-14">
        <CanvasBoard />
      </main>
      <InfoPanel />
      <Toast />
      <LoadModal />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Editor />} />
        <Route path="/exhibition/:id" element={<Editor />} />
      </Routes>
    </Router>
  );
}
