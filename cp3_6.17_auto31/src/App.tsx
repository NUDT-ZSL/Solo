import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { MapPage } from './pages/MapPage';
import { UserPage } from './pages/UserPage';
import type { User } from './types';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then((users: User[]) => {
        if (users.length > 0) {
          setCurrentUser(users.find(u => u.role === 'student') ?? users[0]);
        }
      });
  }, []);

  return (
    <Routes>
      <Route
        path="/"
        element={
          <MapPage
            isTeacher={currentUser?.role === 'teacher'}
            currentUserId={currentUser?.id}
          />
        }
      />
      <Route path="/users" element={<UserPage />} />
    </Routes>
  );
};

export default App;
