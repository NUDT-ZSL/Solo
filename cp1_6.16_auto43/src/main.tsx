import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('game-root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
