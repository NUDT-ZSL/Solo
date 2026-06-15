import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Home from "@/pages/Home";
import PlantDetail from "@/pages/PlantDetail";
import MyGarden from "@/pages/MyGarden";

export default function App() {
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
