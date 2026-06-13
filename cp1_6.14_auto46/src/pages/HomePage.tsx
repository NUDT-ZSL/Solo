import GalleryModule from '../modules/gallery/GalleryModule'

const HomePage = () => {
  return (
    <div className="home-page">
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            发现<span className="highlight">独特</span>的数字艺术
          </h1>
          <p className="hero-subtitle">
            探索独立插画师的精选作品，每一幅都是独一无二的创意结晶
          </p>
        </div>
      </div>

      <div className="gallery-container">
        <GalleryModule />
      </div>

      <style>{`
        .home-page {
          min-height: calc(100vh - 72px);
        }

        .hero-section {
          padding: 60px 0 40px;
          text-align: center;
        }

        .hero-content {
          max-width: 800px;
          margin: 0 auto;
          padding: 0 40px;
        }

        .hero-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 48px;
          font-weight: 700;
          color: #e0e0e0;
          margin: 0 0 16px 0;
          line-height: 1.2;
        }

        .highlight {
          color: #c9a84c;
        }

        .hero-subtitle {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 18px;
          color: #888;
          margin: 0;
          line-height: 1.6;
        }

        .gallery-container {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 40px 80px;
        }

        @media (max-width: 1024px) {
          .hero-content {
            padding: 0 24px;
          }

          .hero-title {
            font-size: 36px;
          }

          .hero-subtitle {
            font-size: 16px;
          }

          .gallery-container {
            padding: 0 24px 60px;
          }
        }

        @media (max-width: 768px) {
          .hero-section {
            padding: 40px 0 30px;
          }

          .hero-content {
            padding: 0 16px;
          }

          .hero-title {
            font-size: 28px;
          }

          .hero-subtitle {
            font-size: 14px;
          }

          .gallery-container {
            padding: 0 16px 40px;
          }
        }
      `}</style>
    </div>
  )
}

export default HomePage
