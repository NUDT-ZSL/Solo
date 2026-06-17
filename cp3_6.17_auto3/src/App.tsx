import { Routes, Route, useParams } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ExamPanel from './components/ExamPanel';
import ResultDashboard from './components/ResultDashboard';
import HistoryPage from './pages/HistoryPage';
import AdminPage from './pages/AdminPage';

const ExamPage = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  return <ExamPanel subjectId={subjectId || ''} />;
};

const ResultPage = () => {
  const { recordId } = useParams<{ recordId: string }>();
  return <ResultDashboard recordId={recordId || ''} />;
};

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/exam/:subjectId" element={<ExamPage />} />
      <Route path="/result/:recordId" element={<ResultPage />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  );
};

export default App;
