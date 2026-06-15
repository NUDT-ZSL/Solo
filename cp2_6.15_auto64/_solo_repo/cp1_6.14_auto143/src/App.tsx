import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from '@/pages/Home'
import Publish from '@/pages/Publish'
import Fridge from '@/pages/Fridge'
import RecipeDetail from '@/pages/RecipeDetail'
import Profile from '@/pages/Profile'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/publish" element={<Publish />} />
        <Route path="/fridge" element={<Fridge />} />
        <Route path="/recipe/:id" element={<RecipeDetail />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </Router>
  )
}
