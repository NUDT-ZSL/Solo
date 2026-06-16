import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { UserProvider } from './context/UserContext';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { BooksPage } from './pages/BooksPage';
import { BookDetailPage } from './pages/BookDetailPage';
import { ActivitiesPage } from './pages/ActivitiesPage';
import { BookshelfPage } from './pages/BookshelfPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

export default function App() {
  return (
    <BrowserRouter>
      <UserProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="*"
            element={
              <>
                <Navbar />
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/books" element={<BooksPage />} />
                  <Route path="/books/:id" element={<BookDetailPage />} />
                  <Route path="/activities" element={<ActivitiesPage />} />
                  <Route path="/bookshelf" element={<BookshelfPage />} />
                  <Route
                    path="*"
                    element={
                      <div
                        style={{
                          padding: '200px 20px',
                          textAlign: 'center',
                          color: '#6b7280'
                        }}
                      >
                        <h2 style={{ fontSize: '48px', marginBottom: '12px' }}>404</h2>
                        <p>页面不存在</p>
                      </div>
                    }
                  />
                </Routes>
              </>
            }
          />
        </Routes>
      </UserProvider>
    </BrowserRouter>
  );
}
