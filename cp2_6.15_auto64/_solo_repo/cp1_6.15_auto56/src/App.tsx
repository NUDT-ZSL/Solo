import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import ActivityList from './components/ActivityList';
import ActivityDetail from './components/ActivityDetail';
import Sidebar from './components/Sidebar';
import ToastContainer from './components/ToastContainer';
import Header from './components/Header';

const App: React.FC = () => {
  return (
    <AppProvider>
      <Router>
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          <Sidebar />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Header />
            <main style={{ flex: 1, padding: '24px' }}>
              <Routes>
                <Route path="/" element={<ActivityList />} />
                <Route path="/activity/:id" element={<ActivityDetail />} />
              </Routes>
            </main>
          </div>
          <ToastContainer />
        </div>
      </Router>
    </AppProvider>
  );
};

export default App;
