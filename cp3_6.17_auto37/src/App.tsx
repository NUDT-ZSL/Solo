import { Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import ExamPanel from './components/ExamPanel';
import ResultDashboard from './components/ResultDashboard';
import HistoryPage from './components/HistoryPage';
import AdminPanel from './components/AdminPanel';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/exam/:subjectId" element={<ExamPanel />} />
      <Route path="/result/:resultId" element={<ResultDashboard />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="/admin" element={<AdminPanel />} />
    </Routes>
  );
}
