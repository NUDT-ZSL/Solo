import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { GridCanvas, Leaderboard } from "./GridCanvas"
import { NavBar } from "./NavBar"

export default function App() {
  return (
    <Router>
      <div className="font-body">
        <Routes>
          <Route path="/" element={<GridCanvas />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
        </Routes>
        <NavBar />
      </div>
    </Router>
  )
}
