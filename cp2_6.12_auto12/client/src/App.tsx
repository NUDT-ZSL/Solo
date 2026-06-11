import { Routes, Route } from 'react-router-dom'
import ItemListPage from './pages/ItemListPage'
import ItemDetailPage from './pages/ItemDetailPage'
import MyItemsPage from './pages/MyItemsPage'
import Navbar from './components/Navbar'

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<ItemListPage />} />
          <Route path="/items/:id" element={<ItemDetailPage />} />
          <Route path="/me" element={<MyItemsPage />} />
        </Routes>
      </main>
    </div>
  )
}
