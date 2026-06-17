import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import MapPage from './pages/MapPage';
import Header from './components/Header';
import type { Course, User } from './types';
import './App.css';

function App() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('course-1');

  useEffect(() => {
    fetch('/api/courses')
      .then(res => res.json())
      .then(data => setCourses(data))
      .catch(err => console.error('Failed to fetch courses:', err));

    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        const student = data.find((u: User) => u.role === 'student');
        setCurrentUser(student || data[0] || null);
      })
      .catch(err => console.error('Failed to fetch users:', err));
  }, []);

  const selectedCourse = courses.find(c => c.id === selectedCourseId);

  return (
    <div className="app">
      <Header
        course={selectedCourse}
        courses={courses}
        onCourseChange={setSelectedCourseId}
        user={currentUser}
      />
      <main className="main-content">
        <Routes>
          <Route
            path="/"
            element={
              selectedCourseId ? (
                <Navigate to={`/map/${selectedCourseId}`} replace />
              ) : (
                <div className="empty-state">请选择课程</div>
              )
            }
          />
          <Route
            path="/map/:courseId"
            element={
              <MapPage
                courseId={selectedCourseId}
                userId={currentUser?.id || 'student-1'}
                userRole={currentUser?.role || 'student'}
              />
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;
