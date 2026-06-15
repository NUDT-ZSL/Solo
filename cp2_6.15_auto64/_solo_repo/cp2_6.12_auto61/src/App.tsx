import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import DetailPage from './pages/DetailPage';

const globalStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #1e1e2e;
    color: #cdd6f4;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    min-height: 100vh;
  }
  ::-webkit-scrollbar { width: 8px; }
  ::-webkit-scrollbar-track { background: #1e1e2e; }
  ::-webkit-scrollbar-thumb { background: #45475a; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: #585b70; }
  a { color: #89b4fa; text-decoration: none; }
  a:hover { text-decoration: underline; }
`;

function NotFound() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 72, color: '#89b4fa', marginBottom: 16 }}>404</h1>
      <p style={{ fontSize: 18, color: '#a6adc8' }}>页面不存在</p>
      <a href="/" style={{ marginTop: 24, color: '#89b4fa' }}>返回首页</a>
    </div>
  );
}

export default function App() {
  return (
    <>
      <style>{globalStyles}</style>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/snippet/:id" element={<DetailPage />} />
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}
