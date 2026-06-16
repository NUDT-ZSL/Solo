import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from '@/components/Navbar'
import Login from '@/pages/Login'
import GardenDashboard from '@/pages/GardenDashboard'
import RegionDetail from '@/pages/RegionDetail'
import Profile from '@/pages/Profile'

export default function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<GardenDashboard />} />
        <Route path="/region/:regionId" element={<RegionDetail />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </Router>
  )
}
