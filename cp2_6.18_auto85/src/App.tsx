import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import ActivityDetail from "./pages/ActivityDetail";
import Admin from "./pages/Admin";
import Checkin from "./pages/Checkin";
import "./App.css";

export default function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/activity/:id" element={<ActivityDetail />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/checkin/:id" element={<Checkin />} />
      </Routes>
    </Router>
  );
}
