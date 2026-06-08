import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { Radio, Heart } from 'lucide-react'
import MysteryPlayer from './MysteryPlayer'
import ConnectionList from './ConnectionList'

function NavBar() {
  const location = useLocation()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-brown border-b-2 border-dark-gold shadow-lg"
      style={{
        backgroundImage: `linear-gradient(180deg, #5C3D2E 0%, #3E2723 40%, #2C1A12 100%)`,
        boxShadow: '0 4px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
      }}
    >
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-full bg-copper/20 flex items-center justify-center border border-dark-gold/50 group-hover:animate-glow">
            <Radio className="w-4 h-4 text-dark-gold" />
          </div>
          <span className="font-display text-xl font-bold text-cream tracking-wider"
            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8), 0 0 10px rgba(184,134,11,0.3)' }}
          >
            谜境电台
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <Link
            to="/"
            className={`px-3 py-1.5 rounded font-retro text-sm transition-all duration-200 ${
              location.pathname === '/'
                ? 'bg-dark-gold/30 text-cream border border-dark-gold/60'
                : 'text-cream/60 hover:text-cream hover:bg-warm-brown/40'
            }`}
          >
            收听
          </Link>
          <Link
            to="/connections"
            className={`px-3 py-1.5 rounded font-retro text-sm flex items-center gap-1 transition-all duration-200 ${
              location.pathname === '/connections'
                ? 'bg-dark-gold/30 text-cream border border-dark-gold/60'
                : 'text-cream/60 hover:text-cream hover:bg-warm-brown/40'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            共振
          </Link>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-transparent via-dark-gold/50 to-transparent" />
    </nav>
  )
}

function HomePage() {
  return <MysteryPlayer mode="browse" />
}

function ConnectionsPage() {
  return <ConnectionList />
}

export default function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <main className="pt-16 min-h-screen">
        <div className="fade-transition">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/connections" element={<ConnectionsPage />} />
          </Routes>
        </div>
      </main>
    </BrowserRouter>
  )
}
