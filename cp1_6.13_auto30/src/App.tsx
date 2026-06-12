import { useState, useEffect } from 'react'
import SearchPage from './pages/SearchPage'
import BookDetail from './pages/BookDetail'
import Dashboard from './pages/Dashboard'
import AdminPage from './pages/AdminPage'
import Navbar from './components/Navbar'

type Route = 'home' | 'search' | 'detail' | 'dashboard' | 'admin'

function parseHash(): { route: Route; id?: string } {
  const hash = window.location.hash.replace('#', '') || '/'
  if (hash === '/' || hash === '/home') return { route: 'home' }
  if (hash === '/search') return { route: 'search' }
  if (hash === '/dashboard') return { route: 'dashboard' }
  if (hash === '/admin') return { route: 'admin' }
  const match = hash.match(/^\/book\/(.+)$/)
  if (match) return { route: 'detail', id: match[1] }
  return { route: 'home' }
}

export default function App() {
  const [hashState, setHashState] = useState(parseHash())

  useEffect(() => {
    const onHashChange = () => setHashState(parseHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = (path: string) => {
    window.location.hash = path
  }

  let content
  switch (hashState.route) {
    case 'home':
    case 'search':
      content = <SearchPage navigate={navigate} />
      break
    case 'detail':
      content = <BookDetail bookId={hashState.id || ''} navigate={navigate} />
      break
    case 'dashboard':
      content = <Dashboard />
      break
    case 'admin':
      content = <AdminPage />
      break
    default:
      content = <SearchPage navigate={navigate} />
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar navigate={navigate} currentRoute={hashState.route} />
      <main style={{ flex: 1, padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        {content}
      </main>
    </div>
  )
}
