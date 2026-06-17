import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Header from './components/Header';
import MapPage from './pages/MapPage';
import UserPage from './pages/UserPage';
import type { Course, KnowledgePoint, User } from './types';

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [filterTag, setFilterTag] = useState<string>('all');
  const [users, setUsers] = useState<User[]>([]);

  const currentPage = location.pathname === '/users' ? 'users' : 'map';

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [coursesRes, usersRes] = await Promise.all([
        fetch('/api/courses').then((r) => r.json()),
        fetch('/api/users').then((r) => r.json()),
      ]);
      setCourses(coursesRes || []);
      setUsers(usersRes || []);
      if (coursesRes && coursesRes.length > 0) {
        setSelectedCourse(coursesRes[0]);
        const kps = await fetch(`/api/courses/${coursesRes[0].id}/knowledge-points`).then((r) => r.json());
        setKnowledgePoints(kps || []);
      }
      if (usersRes && usersRes.length > 0) {
        setCurrentUser(usersRes[0]);
      }
    } catch (err) {
      console.error('初始化数据加载失败:', err);
    }
  };

  const handleSwitchUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${userId}`);
      const user = await res.json();
      setCurrentUser(user);
      setUsers((prev) => prev.map((u) => (u.id === userId ? user : u)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNavigate = (page: 'map' | 'users') => {
    navigate(page === 'map' ? '/' : '/users');
  };

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    knowledgePoints.forEach((kp) => {
      kp.tags.forEach((t) => tagSet.add(t));
    });
    return Array.from(tagSet);
  }, [knowledgePoints]);

  return (
    <div className="app-container">
      <Header
        courseTitle={selectedCourse?.title || '未选择课程'}
        knowledgePoints={knowledgePoints}
        allTags={allTags}
        filterTag={filterTag}
        onFilterChange={setFilterTag}
        currentPage={currentPage}
        onNavigate={handleNavigate}
      />

      <main className="main-content">
        <Routes>
          <Route
            path="/"
            element={
              <MapPage
                course={selectedCourse}
                currentUser={currentUser}
                filterTag={filterTag}
              />
            }
          />
          <Route
            path="/users"
            element={
              <UserPage
                currentUser={currentUser}
                onSwitchUser={handleSwitchUser}
                courses={courses}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
