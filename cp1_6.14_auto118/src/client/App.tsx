import { BrowserRouter as Router, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import Navbar from './components/Navbar';
import CodeGallery from './components/CodeGallery';
import CodeReviewPanel from './components/CodeReviewPanel';
import HeatmapView from './components/HeatmapView';
import UploadModal from './components/UploadModal';
import useStore from './store';

function GalleryPage() {
  const navigate = useNavigate();
  const setShowUploadModal = useStore((s) => s.setShowUploadModal);

  useEffect(() => {
    setShowUploadModal(false);
  }, [setShowUploadModal]);

  return (
    <CodeGallery
      onSelectSnippet={(id) => navigate(`/snippet/${id}`)}
    />
  );
}

function SnippetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentSnippet = useStore((s) => s.currentSnippet);
  const fetchSnippetById = useStore((s) => s.fetchSnippetById);
  const setCurrentSnippet = useStore((s) => s.setCurrentSnippet);

  useEffect(() => {
    if (id) {
      fetchSnippetById(id);
    }
    return () => setCurrentSnippet(null);
  }, [id, fetchSnippetById, setCurrentSnippet]);

  if (!currentSnippet) {
    return <div className="loading-spinner">加载中...</div>;
  }

  return (
    <>
      <button className="back-button" onClick={() => navigate('/')}>
        <ArrowLeft size={16} /> 返回画廊
      </button>
      <CodeReviewPanel
        snippet={currentSnippet}
        onSnippetUpdate={(updated) => setCurrentSnippet(updated)}
      />
    </>
  );
}

function HeatmapPage() {
  return <HeatmapView />;
}

function AppContent() {
  const navigate = useNavigate();
  const showUploadModal = useStore((s) => s.showUploadModal);

  const getActivePage = (): 'gallery' | 'heatmap' => {
    const path = window.location.pathname;
    if (path === '/heatmap') return 'heatmap';
    return 'gallery';
  };

  return (
    <>
      <Navbar
        activePage={getActivePage()}
        onNavigate={(page) => {
          if (page === 'gallery') navigate('/');
          else navigate('/heatmap');
        }}
      />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<GalleryPage />} />
          <Route path="/snippet/:id" element={<SnippetDetailPage />} />
          <Route path="/heatmap" element={<HeatmapPage />} />
        </Routes>
      </main>
      {showUploadModal && <UploadModal />}
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
