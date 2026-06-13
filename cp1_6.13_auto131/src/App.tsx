import { Routes, Route } from 'react-router-dom';
import Layout from './pages/Layout';
import HomePage from './pages/HomePage';
import AddSnippetPage from './pages/AddSnippetPage';
import SnippetDetailPage from './pages/SnippetDetailPage';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/add" element={<AddSnippetPage />} />
        <Route path="/edit/:id" element={<AddSnippetPage />} />
        <Route path="/snippet/:id" element={<SnippetDetailPage />} />
      </Route>
    </Routes>
  );
}

export default App;
