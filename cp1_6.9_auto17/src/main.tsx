import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

window.addEventListener('load', () => {
  const el = document.getElementById('loading')
  if (el) {
    setTimeout(() => el.classList.add('hide'), 400)
    setTimeout(() => el.remove(), 1100)
  }
})
