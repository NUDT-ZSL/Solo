import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Home from "@/pages/Home";
import PlantDetail from "@/pages/PlantDetail";
import MyGarden from "@/pages/MyGarden";
import { useRipple } from "@/hooks/useRipple";

export default function App() {
  useRipple();

  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/plant/:id" element={<PlantDetail />} />
            <Route path="/garden" element={<MyGarden />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
