import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CalendarView from './components/CalendarView';
import PhotoDetail from './components/PhotoDetail';
import TimelinePlayer from './components/TimelinePlayer';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<CalendarView />} />
        <Route path="/photo/:date" element={<PhotoDetail />} />
        <Route path="/timeline" element={<TimelinePlayer />} />
      </Routes>
    </Router>
  );
}
