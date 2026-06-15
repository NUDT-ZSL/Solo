import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import CreateDream from "@/pages/CreateDream";
import DreamDetail from "@/pages/DreamDetail";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<CreateDream />} />
        <Route path="/dream/:id" element={<DreamDetail />} />
      </Routes>
    </Router>
  );
}
