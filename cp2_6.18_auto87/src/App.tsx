import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import DetailPage from './pages/DetailPage';
import NewRecordPage from './pages/NewRecordPage';

const globalStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background: #0d1b2a;
    color: #e0e0e0;
    min-height: 100vh;
  }
  button {
    cursor: pointer;
    font-family: inherit;
  }
  input, select, textarea {
    font-family: inherit;
  }
`;

export default function App() {
  return (
    <>
      <style>{globalStyles}</style>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/detail/:id" element={<DetailPage />} />
        <Route path="/new" element={<NewRecordPage />} />
      </Routes>
    </>
  );
}
