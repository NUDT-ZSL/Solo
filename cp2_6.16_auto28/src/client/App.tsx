import { Routes, Route } from 'react-router-dom'
import StageListPage from './pages/StageListPage'
import StageDetailPage from './pages/StageDetailPage'
import { WebSocketProvider } from './context/WebSocketContext'
import { UserProvider } from './context/UserContext'

const App = () => {
  return (
    <UserProvider>
      <WebSocketProvider>
        <Routes>
          <Route path="/" element={<StageListPage />} />
          <Route path="/stage/:id" element={<StageDetailPage />} />
        </Routes>
      </WebSocketProvider>
    </UserProvider>
  )
}

export default App
