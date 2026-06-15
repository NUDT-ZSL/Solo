import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/modules/auth/AuthContext';
import Login from '@/pages/Login';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'teacher' | 'student';
}

function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-200 skeleton" />
          <div className="h-4 w-32 rounded skeleton" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  return <>{children}</>;
}

function TeacherRoutes() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-primary-800 mb-6">教师控制台</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-md card-hover">
              <div className="h-4 w-24 rounded skeleton mb-4" />
              <div className="h-8 w-16 rounded skeleton mb-2" />
              <div className="h-3 w-full rounded skeleton mb-1" />
              <div className="h-3 w-3/4 rounded skeleton" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StudentRoutes() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-primary-800 mb-6">学生控制台</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-md card-hover">
              <div className="h-4 w-32 rounded skeleton mb-4" />
              <div className="h-6 w-48 rounded skeleton mb-2" />
              <div className="h-3 w-full rounded skeleton mb-1" />
              <div className="h-3 w-full rounded skeleton mb-1" />
              <div className="h-3 w-2/3 rounded skeleton" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/teacher/*"
          element={
            <ProtectedRoute requiredRole="teacher">
              <TeacherRoutes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/*"
          element={
            <ProtectedRoute requiredRole="student">
              <StudentRoutes />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}
