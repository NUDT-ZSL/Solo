import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CreateRecordPage from './pages/CreateRecordPage';
import RecordDetailPage from './pages/RecordDetailPage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create" element={<CreateRecordPage />} />
        <Route path="/record/:id" element={<RecordDetailPage />} />
      </Routes>
    </Router>
  );
}
