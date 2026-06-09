import { Routes, Route, Link } from 'react-router-dom';
import NoteList from './pages/NoteList';
import NoteEditor from './pages/NoteEditor';
import Trash from './pages/Trash';
import './styles/App.css';

function App() {
  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <Link to="/" className="logo-link">
            <span className="logo-icon">📝</span>
            <h1 className="app-title">浮墨记</h1>
          </Link>
          <nav className="nav-links">
            <Link to="/" className="nav-link">
              <span>📋</span> 笔记
            </Link>
            <Link to="/trash" className="nav-link">
              <span>🗑️</span> 回收站
            </Link>
          </nav>
        </div>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<NoteList />} />
          <Route path="/note/new" element={<NoteEditor />} />
          <Route path="/note/:id" element={<NoteEditor />} />
          <Route path="/trash" element={<Trash />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
