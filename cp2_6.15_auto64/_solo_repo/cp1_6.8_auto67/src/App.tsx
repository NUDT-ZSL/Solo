import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Home from "@/pages/Home"
import MyCapsules from "@/pages/MyCapsules"

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/my-capsules" element={<MyCapsules />} />
      </Routes>
    </Router>
  )
}
