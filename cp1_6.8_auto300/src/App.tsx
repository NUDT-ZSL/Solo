import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Home from '@/pages/Home';
import CreateRecord from '@/pages/CreateRecord';
import Detail from '@/pages/Detail';
import Profile from '@/pages/Profile';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<CreateRecord />} />
        <Route path="/detail/:id" element={<Detail />} />
        <Route path="/edit/:id" element={<CreateRecord />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen">
        <Navbar />
        <main className="pt-20 pb-10">
          <AnimatedRoutes />
        </main>
      </div>
    </Router>
  );
}
