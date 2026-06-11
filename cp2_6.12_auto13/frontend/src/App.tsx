import { useState, useEffect } from 'react'

function App() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="navbar-logo">Portfolio</div>
        <div className="navbar-nav">
          <a href="#home" className="link-underline">首页</a>
          <a href="#works" className="link-underline">作品</a>
          <a href="#about" className="link-underline">关于</a>
        </div>
      </nav>

      <main className="main-content">
        <div className="container">
          <section style={{ padding: '80px 0', textAlign: 'center' }}>
            <h1 style={{ fontSize: '48px', fontWeight: 700, marginBottom: '16px' }}>
              欢迎来到作品集
            </h1>
            <p style={{ fontSize: '18px', color: 'var(--text-secondary)', marginBottom: '32px' }}>
              探索精选设计与开发作品
            </p>
            <button className="btn btn-primary">查看作品</button>
          </section>
        </div>
      </main>

      <footer className="footer">
        <div className="footer-content">
          © 2024 Portfolio. All rights reserved.
        </div>
      </footer>
    </>
  )
}

export default App
