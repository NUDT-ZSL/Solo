import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ReviewPage from './pages/ReviewPage'
import CreatePage from './pages/CreatePage'

const Navbar = () => {
  const navigate = useNavigate()
  return (
    <nav className="navbar">
      <div className="navbar-brand" onClick={() => navigate('/')}>
        📚 闪卡复习系统
      </div>
      <Link to="/create" className="navbar-btn">
        + 创建卡片组
      </Link>
    </nav>
  )
}

const App = () => {
  return (
    <div>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/review/:deckId" element={<ReviewPage />} />
        <Route path="/create" element={<CreatePage />} />
      </Routes>
    </div>
  )
}

export default App
