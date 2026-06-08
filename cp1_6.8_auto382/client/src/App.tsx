import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import GalleryPage from "@/pages/GalleryPage";
import DetailPage from "@/pages/DetailPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<GalleryPage />} />
        <Route path="/detail/:id" element={<DetailPage />} />
      </Routes>
    </Router>
  );
}
