import React from 'react';
import { HashRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { FileText, PlusCircle, BarChart3, LayoutList } from 'lucide-react';
import Editor from './components/Editor';
import Preview from './components/Preview';
import Dashboard from './components/Dashboard';
import SurveyList from './components/SurveyList';

const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="app-container">
        <aside className="sidebar">
          <div className="sidebar-title">问卷平台</div>
          <nav className="sidebar-nav">
            <NavLink
              to="/"
              end
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <LayoutList size={18} />
              我的问卷
            </NavLink>
            <NavLink
              to="/editor"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <PlusCircle size={18} />
              创建问卷
            </NavLink>
            <NavLink
              to="/dashboard"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <BarChart3 size={18} />
              数据面板
            </NavLink>
          </nav>
          <div style={{ padding: '0 20px', marginTop: 'auto' }}>
            <div style={{ fontSize: '12px', color: '#94A3B8', textAlign: 'center' }}>
              v1.0.0
            </div>
          </div>
        </aside>

        <main className="main-content">
          <div className="content-header">
            <div className="content-title">
              <Routes>
                <Route path="/" element={<span>我的问卷</span>} />
                <Route path="/editor" element={<span>问卷编辑器</span>} />
                <Route path="/preview" element={<span>问卷预览</span>} />
                <Route path="/dashboard" element={<span>数据面板</span>} />
                <Route path="*" element={<span>问卷平台</span>} />
              </Routes>
            </div>
          </div>
          <div className="content-body">
            <Routes>
              <Route path="/" element={<SurveyList />} />
              <Route path="/editor" element={<Editor />} />
              <Route path="/preview" element={<Preview />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </HashRouter>
  );
};

export default App;
