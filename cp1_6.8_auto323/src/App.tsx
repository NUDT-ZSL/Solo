import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import HomePage from "@/pages/HomePage"
import PublishPage from "@/pages/PublishPage"
import HotWallPage from "@/pages/HotWallPage"
import ProfilePage from "@/pages/ProfilePage"

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-forest">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/publish" element={<PublishPage />} />
          <Route path="/hot" element={<HotWallPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </div>
    </Router>
  )
}
