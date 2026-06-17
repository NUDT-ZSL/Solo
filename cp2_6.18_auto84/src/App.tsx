import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import MembersPage from './pages/MembersPage'
import RehearsalPage from './pages/RehearsalPage'
import MemberDetailPage from './pages/MemberDetailPage'
import type { Member, ScoreRecord, ScoreFormData } from './types'
import ScoringPanel from './components/ScoringPanel'

function NavBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems = [
    { path: '/members', label: '团员管理', icon: '👥' },
    { path: '/rehearsal', label: '排演记录', icon: '🎵' },
    { path: '/member', label: '个人详情', icon: '📊' }
  ]

  const isActive = (path: string) => {
    if (path === '/member') return location.pathname.startsWith('/member/')
    return location.pathname === path
  }

  return (
    <>
      <div className="hamburger" onClick={() => setMobileOpen(!mobileOpen)}>
        <span></span><span></span><span></span>
      </div>
      <nav className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">🎼</div>
          <div className="app-name">合唱团反馈</div>
        </div>
        <div className="nav-list">
          {navItems.map(item => (
            <button
              key={item.path}
              className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => {
                navigate(item.path === '/member' ? '/members' : item.path)
                setMobileOpen(false)
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </div>
        <div className="sidebar-footer">
          <div className="footer-text">社区合唱团</div>
        </div>
      </nav>
    </>
  )
}

export default function App() {
  const [members, setMembers] = useState<Member[]>([])
  const [allScores, setAllScores] = useState<ScoreRecord[]>([])
  const [scoringMember, setScoringMember] = useState<Member | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)

  const fetchMembers = () => {
    fetch('/api/members')
      .then(res => res.json())
      .then(data => setMembers(data.data || []))
  }

  const fetchAllScores = () => {
    fetch('/api/scores')
      .then(res => res.json())
      .then(data => setAllScores(data.data || []))
  }

  useEffect(() => {
    fetchMembers()
    fetchAllScores()
  }, [])

  const handleSelectForScoring = (member: Member) => {
    setScoringMember(member)
    setPanelOpen(true)
  }

  const handleSubmitScore = async (memberId: string, data: ScoreFormData) => {
    const res = await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, ...data })
    })
    if (res.ok) {
      fetchAllScores()
      setPanelOpen(false)
      setScoringMember(null)
    }
    return res.ok
  }

  return (
    <div className="app-layout">
      <NavBar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/members" replace />} />
          <Route
            path="/members"
            element={
              <MembersPage
                members={members}
                onSelectForScoring={handleSelectForScoring}
              />
            }
          />
          <Route
            path="/rehearsal"
            element={
              <RehearsalPage
                members={members}
                allScores={allScores}
                onSelectForScoring={handleSelectForScoring}
                refreshScores={fetchAllScores}
              />
            }
          />
          <Route path="/member/:id" element={<MemberDetailPage members={members} />} />
        </Routes>
      </main>
      <ScoringPanel
        open={panelOpen}
        member={scoringMember}
        onClose={() => { setPanelOpen(false); setScoringMember(null) }}
        onSubmit={handleSubmitScore}
      />
    </div>
  )
}
