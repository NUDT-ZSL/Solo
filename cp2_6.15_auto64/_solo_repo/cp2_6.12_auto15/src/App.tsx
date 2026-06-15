import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Toast from "@/components/Toast";
import MapPage from "@/pages/MapPage";
import ExplorePage from "@/pages/ExplorePage";
import TrailDetailPage from "@/pages/TrailDetailPage";
import ProfilePage from "@/pages/ProfilePage";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-sand-50">
        <Navbar />
        <Routes>
          <Route path="/" element={<MapPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/trail/:id" element={<TrailDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
        <Toast />
      </div>
    </Router>
  );
}
