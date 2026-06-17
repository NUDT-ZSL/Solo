import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Overview } from './pages/Overview';
import { DeviceDetail } from './pages/DeviceDetail';
import { Profile } from './pages/Profile';
import { Admin } from './pages/Admin';

function Layout() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
    }}>
      <Navbar />
      <Outlet />
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/overview" replace />} />
        <Route path="overview" element={<Overview />} />
        <Route path="device/:id" element={<DeviceDetail />} />
        <Route path="profile" element={<Profile />} />
        <Route path="admin" element={<Admin />} />
      </Route>
    </Routes>
  );
}

export default App;
