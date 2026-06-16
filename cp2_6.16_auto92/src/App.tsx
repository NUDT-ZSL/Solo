import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from '@/pages/HomePage'
import SchedulePage from '@/pages/SchedulePage'
import VotePage from '@/pages/VotePage'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/schedule/:id" element={<SchedulePage />} />
        <Route path="/vote/:id" element={<VotePage />} />
      </Routes>
    </Router>
  )
}
