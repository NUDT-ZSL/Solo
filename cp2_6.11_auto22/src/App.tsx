import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import Login from "@/pages/Login"
import Gallery from "@/pages/Gallery"
import Detail from "@/pages/Detail"
import { useStore } from "@/store"

function App() {
  const token = useStore((s) => s.token)
  return (
    <Router>
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/" /> : <Login />} />
        <Route path="/" element={token ? <Gallery /> : <Navigate to="/login" />} />
        <Route path="/voiceprint/:id" element={token ? <Detail /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  )
}

export default App
