import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import MeetingList from './pages/MeetingList';
import MeetingDetail from './pages/MeetingDetail';
import Dashboard from './pages/Dashboard';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <BrowserRouter>
      <div className="app">
        <header className="topbar">
          <button className="menu-toggle" onClick={toggleSidebar}>
            ☰
          </button>
          <div className="topbar-title">
            <span className="topbar-logo">📋</span>
            <span>MeetingFlow</span>
          </div>
          <div className="topbar-right">
            <div className="user-avatar">U</div>
          </div>
        </header>

        <div className="app-body">
          <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
          
          <main className={`main-content ${sidebarOpen ? '' : 'sidebar-closed'}`}>
            <Routes>
              <Route path="/" element={<MeetingList />} />
              <Route path="/meeting/:id" element={<MeetingDetail />} />
              <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
