import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ExamPanel from './components/ExamPanel';
import ResultDashboard from './components/ResultDashboard';
import HistoryPage from './pages/HistoryPage';
import AdminPanel from './pages/AdminPanel';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/exam/:subjectId" element={<ExamPanel />} />
        <Route path="/result/:examId" element={<ResultDashboard />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </Router>
  );
}
