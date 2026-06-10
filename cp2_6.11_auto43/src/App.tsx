import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Profile from "@/pages/Profile";
import SharePage from "@/pages/SharePage";
import { EmotionProvider } from "@/store/emotionReducer";

export default function App() {
  return (
    <EmotionProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/share/:shareId" element={<SharePage />} />
        </Routes>
      </Router>
    </EmotionProvider>
  );
}
