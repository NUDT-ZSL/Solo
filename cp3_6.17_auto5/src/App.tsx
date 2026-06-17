import { useEffect, useState } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import MapPage from './pages/MapPage'
import UserPage from './pages/UserPage'
import Header from './components/Header'
import { api } from './services/api'
import type { User, KnowledgePoint } from './types'

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([])
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [course, setCourse] = useState<{ title: string }>({ title: 'React 前端开发入门到精通' })
  const location = useLocation()

  useEffect(() => {
    api.getUsers().then(list => {
      setUsers(list)
      if (!currentUser && list.length > 0) {
        setCurrentUser(list.find(u => u.role === 'student') || list[0])
      }
    })
    api.getKnowledgePoints('course-1').then(setKnowledgePoints)
    api.getCourse('course-1').then(setCourse).catch(() => {})
  }, [])

  const navItems = [
    { path: '/', label: '🗺️ 知识图谱' },
    { path: '/users', label: '👥 用户中心' }
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa' }}>
      <Header
        courseTitle={course.title}
        knowledgePoints={knowledgePoints}
        selectedTag={selectedTag}
        onTagChange={setSelectedTag}
        currentUser={currentUser}
        onUserChange={setCurrentUser}
        users={users}
      />

      <div
        style={{
          background: '#fff',
          borderBottom: '1px solid #e0e0e0',
          padding: '0 24px',
          display: 'flex',
          gap: 4
        }}
      >
        {navItems.map(item => {
          const active =
            location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path))
          return (
            <Link
              key={item.path}
              to={item.path}
              style={{
                padding: '12px 16px',
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                color: active ? '#1a237e' : '#757575',
                textDecoration: 'none',
                borderBottom: active ? '2px solid #00bcd4' : '2px solid transparent',
                transition: 'all 0.2s'
              }}
            >
              {item.label}
            </Link>
          )
        })}
      </div>

      <Routes>
        <Route path="/" element={<MapPage currentUser={currentUser} />} />
        <Route
          path="/users"
          element={<UserPage currentUser={currentUser} onUserChange={setCurrentUser} />}
        />
      </Routes>
    </div>
  )
}
