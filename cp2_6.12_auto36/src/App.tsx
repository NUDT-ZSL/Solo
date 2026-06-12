import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Home from '@/pages/Home';
import KnowledgeBasePage from '@/pages/KnowledgeBasePage';
import DocumentEditorPage from '@/pages/DocumentEditorPage';
import TopNav from '@/components/TopNav';
import Sidebar from '@/components/Sidebar';
import Toast from '@/components/Toast';
import { useKnowledgeStore } from '@/stores/knowledgeStore';
import { cn } from '@/lib/utils';

function Layout() {
  const sidebarCollapsed = useKnowledgeStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useKnowledgeStore((s) => s.setSidebarCollapsed);
  const fetchKnowledgeBases = useKnowledgeStore((s) => s.fetchKnowledgeBases);
  const location = useLocation();

  useEffect(() => {
    fetchKnowledgeBases();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setSidebarCollapsed]);

  const showSidebar = location.pathname !== '/';

  return (
    <div className="h-screen flex flex-col bg-bg overflow-hidden">
      <TopNav />
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {showSidebar && <Sidebar />}
        <main
          className={cn(
            'flex-1 min-w-0 overflow-hidden',
            'bg-gradient-to-br from-white via-slate-50 to-slate-100'
          )}
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/kb/:kbId" element={<KnowledgeBasePage />} />
            <Route path="/doc/:docId" element={<DocumentEditorPage />} />
          </Routes>
        </main>
      </div>
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Layout />
    </Router>
  );
}
