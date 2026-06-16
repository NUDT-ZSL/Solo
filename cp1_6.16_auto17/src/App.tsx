import { useState, useEffect } from 'react'
import GalleryPage from './components/GalleryPage'
import BookingPage from './components/BookingPage'
import { Photo, Package, Booking as BookingType, getMonthlyBookingsCount, getPendingBookingsCount, getCompletedBookingsCount } from './business/portfolio'

type Page = 'gallery' | 'booking' | 'about'

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('gallery')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [bookings, setBookings] = useState<BookingType[]>([])
  const [showAdmin, setShowAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [photosRes, packagesRes, bookingsRes] = await Promise.all([
          fetch('/api/photos'),
          fetch('/api/packages'),
          fetch('/api/bookings')
        ])
        const [photosData, packagesData, bookingsData] = await Promise.all([
          photosRes.json(),
          packagesRes.json(),
          bookingsRes.json()
        ])
        setPhotos(photosData)
        setPackages(packagesData)
        setBookings(bookingsData)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleBookingAdded = (newBooking: BookingType) => {
    setBookings(prev => [...prev, newBooking])
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ fontSize: '1.2rem', color: '#5A4A3A' }}>加载中...</div>
      </div>
    )
  }

  return (
    <div className="app">
      <nav className="navbar">
        <div className="logo">PhotoStudio</div>
        <ul className="nav-links">
          <li>
            <span
              className={`nav-link ${currentPage === 'gallery' ? 'active' : ''}`}
              onClick={() => setCurrentPage('gallery')}
            >
              作品集
            </span>
          </li>
          <li>
            <span
              className={`nav-link ${currentPage === 'booking' ? 'active' : ''}`}
              onClick={() => setCurrentPage('booking')}
            >
              套餐与预约
            </span>
          </li>
          <li>
            <span
              className={`nav-link ${currentPage === 'about' ? 'active' : ''}`}
              onClick={() => setCurrentPage('about')}
            >
              关于我们
            </span>
          </li>
        </ul>
      </nav>

      <main className="main-content">
        {currentPage === 'gallery' && <GalleryPage photos={photos} />}
        {currentPage === 'booking' && (
          <BookingPage
            packages={packages}
            bookings={bookings}
            onBookingAdded={handleBookingAdded}
          />
        )}
        {currentPage === 'about' && <AboutPage />}
      </main>

      <div
        className="admin-trigger"
        onClick={() => setShowAdmin(!showAdmin)}
      />

      {showAdmin && (
        <div className="admin-panel">
          <h3 className="admin-title">预约管理面板</h3>
          <div className="admin-cards">
            <div className="admin-card">
              <div className="admin-card-icon blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <div className="admin-card-value">{getMonthlyBookingsCount(bookings)}</div>
              <div className="admin-card-label">本月新增预约</div>
            </div>
            <div className="admin-card">
              <div className="admin-card-icon orange">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div className="admin-card-value">{getPendingBookingsCount(bookings)}</div>
              <div className="admin-card-label">待确认预约</div>
            </div>
            <div className="admin-card">
              <div className="admin-card-icon green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div className="admin-card-value">{getCompletedBookingsCount(bookings)}</div>
              <div className="admin-card-label">已完成拍摄</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AboutPage() {
  const [photographer, setPhotographer] = useState<{
    name: string
    title: string
    experience: string
    specialty: string
    bio: string
  } | null>(null)

  useEffect(() => {
    fetch('/api/photographer')
      .then(res => res.json())
      .then(data => setPhotographer(data))
  }, [])

  if (!photographer) return null

  return (
    <div className="container">
      <h1 className="page-title">关于我们</h1>
      <div className="about-section">
        <div className="photographer-info">
          <div className="photographer-avatar">
            {photographer.name.charAt(0)}
          </div>
          <div className="photographer-details">
            <h2>{photographer.name}</h2>
            <p className="photographer-title">{photographer.title}</p>
            <div className="photographer-meta">
              <div className="meta-item">
                <strong>从业经验：</strong>{photographer.experience}
              </div>
              <div className="meta-item">
                <strong>专长领域：</strong>{photographer.specialty}
              </div>
            </div>
            <p className="photographer-bio">{photographer.bio}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
