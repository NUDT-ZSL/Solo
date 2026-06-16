import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LevelSelectPage from "@/pages/LevelSelectPage";
import GamePage from "@/pages/GamePage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LevelSelectPage />} />
        <Route path="/game/:id" element={<GamePage />} />
      </Routes>
    </Router>
  );
}
