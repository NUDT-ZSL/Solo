import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import CalendarView from './components/CalendarView';
import NotificationPanel from './components/NotificationPanel';

const App: React.FC = () => {
  return (
    <div className="app">
      <NotificationPanel />
      <Routes>
        <Route path="/" element={<CalendarView />} />
        <Route path="/admin" element={<Dashboard />} />
      </Routes>
    </div>
  );
};

export default App;
