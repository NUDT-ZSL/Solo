import React from 'react';
import { createBrowserRouter, Outlet } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Challenge from './pages/Challenge';
import Dashboard from './pages/Dashboard';
import './styles/app.css';

const Layout: React.FC = () => {
  return (
    <div className="app-root">
      <Navbar />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'challenge', element: <Challenge /> },
      { path: 'profile', element: <Dashboard /> },
    ],
  },
]);

const App: React.FC = () => {
  return <Outlet />;
};

export default App;
