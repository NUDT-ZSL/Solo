import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import BookClubList from './components/BookClubList';
import BookClubDetail from './components/BookClubDetail';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-cream">
        <Navbar />
        <main className="pt-16">
          <Routes>
            <Route path="/" element={<BookClubList />} />
            <Route path="/bookclub/:id" element={<BookClubDetail />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
