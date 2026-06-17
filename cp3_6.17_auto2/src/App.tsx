import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider } from './context/UserContext';
import Navbar from './components/Navbar';
import Overview from './pages/Overview';
import DeviceDetail from './pages/DeviceDetail';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import './styles/globals.css';

function App() {
  return (
    <Router>
      <UserProvider>
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
          <Navbar />
          <main className="main-container">
            <Routes>
              <Route path="/" element={<Navigate to="/overview" replace />} />
              <Route path="/overview" element={<Overview />} />
              <Route path="/device/:id" element={<DeviceDetail />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<Navigate to="/overview" replace />} />
            </Routes>
          </main>
        </div>
      </UserProvider>
    </Router>
  );
}

export default App;
