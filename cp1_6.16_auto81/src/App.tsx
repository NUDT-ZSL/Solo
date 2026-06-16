import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from '@/components/Navbar'
import ConflictDialog from '@/components/ConflictDialog'
import TeacherDashboard from '@/pages/TeacherDashboard'
import StudentDashboard from '@/pages/StudentDashboard'
import ParentDashboard from '@/pages/ParentDashboard'

export default function App() {
  return (
    <Router>
      <Navbar />
      <ConflictDialog />
      <main style={{ paddingTop: '64px', minHeight: '100vh' }}>
        <div style={{ maxWidth: '80%', margin: '0 auto', padding: '24px 0' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/teacher" replace />} />
            <Route path="/teacher" element={<TeacherDashboard />} />
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/parent" element={<ParentDashboard />} />
          </Routes>
        </div>
      </main>
    </Router>
  )
}
