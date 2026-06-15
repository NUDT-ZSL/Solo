import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { useStore } from "@/store/useStore";
import Home from "@/pages/Home";
import SnippetView from "@/pages/SnippetView";

export default function App() {
  const theme = useStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
  }, [theme]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/snippet/:id" element={<SnippetView />} />
      </Routes>
    </Router>
  );
}
