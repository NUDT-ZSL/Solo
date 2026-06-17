import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import TourDetailPage from './pages/TourDetailPage'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/tour/tour-001" replace />} />
        <Route path="/tour/:tourId" element={<TourDetailPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
