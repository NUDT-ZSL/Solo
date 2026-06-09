import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import StarryNight from './StarryNight'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StarryNight />
  </StrictMode>,
)
