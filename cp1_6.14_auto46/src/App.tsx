import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import HomePage from './pages/HomePage'
import DetailModule from './modules/detail/DetailModule'
import CheckoutPage from './pages/CheckoutPage'
import ProfilePage from './pages/ProfilePage'
import { AuthProvider } from './context/AuthContext'

function App() {
  return (
    <AuthProvider>
      <div className="app">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/artwork/:id" element={<DetailModule />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </main>
      </div>

      <style>{`
        .app {
          min-height: 100vh;
          background: #1a1a2e;
          color: #e0e0e0;
        }

        .main-content {
          min-height: calc(100vh - 72px);
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          padding: 0;
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI',
            Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          background: #1a1a2e;
        }

        #root {
          min-height: 100vh;
        }

        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: #1a1a2e;
        }

        ::-webkit-scrollbar-thumb {
          background: #3d3d5c;
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #4a4a6a;
        }
      `}</style>
    </AuthProvider>
  )
}

export default App
