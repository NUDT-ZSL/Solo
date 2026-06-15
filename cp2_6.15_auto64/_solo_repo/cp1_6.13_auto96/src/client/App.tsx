import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import MarketplaceView from "./components/MarketplaceView";
import AssetDetailPage from "./components/AssetDetailPage";
import UploadPage from "./components/UploadPage";
import ManagePage from "./components/ManagePage";
import Toast from "./components/Toast";
import "./styles/index.css";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-900 text-slate-200">
        <Navbar />
        <Routes>
          <Route path="/" element={<MarketplaceView />} />
          <Route path="/asset/:id" element={<AssetDetailPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/manage" element={<ManagePage />} />
        </Routes>
        <Toast />
      </div>
    </Router>
  );
}
