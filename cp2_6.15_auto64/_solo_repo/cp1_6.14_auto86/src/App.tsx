import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "@/pages/Dashboard";
import NoteEditor from "@/pages/NoteEditor";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/course/:id" element={<NoteEditor />} />
      </Routes>
    </Router>
  );
}
