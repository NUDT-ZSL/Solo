import { createRoot } from 'react-dom/client'
import App from './App'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

const appConfig = {
  baseFrequency: 5.0,
  sampleRate: 60,
}

createRoot(rootElement).render(<App config={appConfig} />)
