import { BrowserRouter, Routes, Route } from 'react-router-dom';
import GalleryList from './pages/GalleryList';
import GalleryDetail from './pages/GalleryDetail';
import Profile from './pages/Profile';

function App() {
  return (
    <Routes>
      <Route path="/" element={<GalleryList />} />
      <Route path="/gallery/:id" element={<GalleryDetail />} />
      <Route path="/profile" element={<Profile />} />
    </Routes>
  );
}

export default App;
