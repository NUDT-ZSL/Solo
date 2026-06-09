import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRecipeById, toggleFavorite, isFavorited, addReview, getAverageRating, getSimilarRecipes, getCurrentUser } from '../data';
import { Recipe, CATEGORY_COLORS } from '../types';
import FavoriteButton from '../components/FavoriteButton';
import StarRating from '../components/StarRating';
import RecipeCard from '../components/RecipeCard';

const RecipeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | undefined>();
  const [favorited, setFavorited] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [similarRecipes, setSimilarRecipes] = useState<Recipe[]>([]);
  const [scrollContainerRef, setScrollContainerRef] = useState<HTMLDivElement | null>(null);
  const [visibleSteps, setVisibleSteps] = useState<Set<number>>(new Set());
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  const currentUser = getCurrentUser();

  useEffect(() => {
    if (id) {
      const found = getRecipeById(id);
      if (found) {
        setRecipe(found);
        setFavorited(isFavorited(id, currentUser.id));
        const userReview = found.reviews.find(r => r.userId === currentUser.id);
        if (userReview) {
          setUserRating(userReview.rating);
          setReviewText(userReview.comment || '');
        }
        setSimilarRecipes(getSimilarRecipes(id, 4));
      }
    }
  }, [id, currentUser.id]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const index = Number((entry.target as HTMLElement).dataset.stepIndex);
          if (entry.isIntersecting) {
            setVisibleSteps(prev => new Set(prev).add(index));
          }
        });
      },
      { threshold: 0.2, rootMargin: '0px 0px -50px 0px' }
    );

    stepRefs.current.forEach(ref => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [recipe?.steps.length]);

  const handleToggleFavorite = () => {
    if (!id) return;
    const newState = toggleFavorite(id, currentUser.id);
    setFavorited(newState);
    const updated = getRecipeById(id);
    if (updated) setRecipe(updated);
  };

  const handleRate = (rating: number) => {
    if (!id) return;
    setUserRating(rating);
    addReview(id, currentUser.id, rating, reviewText || undefined);
    const updated = getRecipeById(id);
    if (updated) setRecipe(updated);
  };

  const handleSubmitReview = () => {
    if (!id || userRating === 0) return;
    addReview(id, currentUser.id, userRating, reviewText || undefined);
    const updated = getRecipeById(id);
    if (updated) setRecipe(updated);
    setReviewText('');
  };

  const images = recipe
    ? [recipe.coverImage, ...(recipe.stepImages || [])]
    : [];

  const scrollRecommendations = (direction: 'left' | 'right') => {
    if (!scrollContainerRef) return;
    const scrollAmount = direction === 'left' ? -320 : 320;
    scrollContainerRef.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  const isAtStart = scrollContainerRef ? scrollContainerRef.scrollLeft <= 0 : true;
  const isAtEnd = scrollContainerRef
    ? scrollContainerRef.scrollLeft + scrollContainerRef.clientWidth >= scrollContainerRef.scrollWidth - 5
    : true;

  if (!recipe) {
    return (
      <div className="not-found">
        <div className="not-found-card">
          <span className="not-found-icon">🍳</span>
          <h2>食谱不存在</h2>
          <p>这个食谱可能已经被删除或不存在</p>
          <button className="back-btn" onClick={() => navigate('/')}>
            返回首页
          </button>
        </div>
        <style>{`
          .not-found {
            max-width: 1280px;
            margin: 0 auto;
            padding: 80px 24px;
            display: flex;
            justify-content: center;
          }
          .not-found-card {
            text-align: center;
            padding: 48px;
            background: white;
            border-radius: 16px;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
          }
          .not-found-icon {
            font-size: 64px;
            display: block;
            margin-bottom: 16px;
          }
          .not-found h2 {
            color: #2c3e50;
            margin: 0 0 8px;
          }
          .not-found p {
            color: #7f8c8d;
            margin: 0 0 24px;
          }
          .back-btn {
            padding: 12px 32px;
            background: linear-gradient(135deg, #E67E22 0%, #F39C12 100%);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s ease;
          }
          .back-btn:active {
            transform: scale(0.95);
          }
        `}</style>
      </div>
    );
  }

  const avgRating = getAverageRating(recipe);

  return (
    <div className="recipe-detail">
      <div className="detail-container">
        <div className="carousel-section">
          <div className="carousel">
            <div className="carousel-track" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
              {images.map((img, index) => (
                <div key={index} className="carousel-slide">
                  <img src={img} alt={`${recipe.name} ${index + 1}`} />
                </div>
              ))}
            </div>
            {images.length > 1 && (
              <>
                <button
                  className="carousel-btn prev"
                  onClick={() => setCurrentSlide(prev => (prev === 0 ? images.length - 1 : prev - 1))}
                  aria-label="上一张"
                >
                  ‹
                </button>
                <button
                  className="carousel-btn next"
                  onClick={() => setCurrentSlide(prev => (prev === images.length - 1 ? 0 : prev + 1))}
                  aria-label="下一张"
                >
                  ›
                </button>
                <div className="carousel-dots">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      className={`dot ${index === currentSlide ? 'active' : ''}`}
                      onClick={() => setCurrentSlide(index)}
                      aria-label={`第${index + 1}张`}
                    />
                  ))}
                </div>
              </>
            )}
            <div className="carousel-favorite">
              <FavoriteButton
                isFavorited={favorited}
                onToggle={handleToggleFavorite}
                size="large"
              />
            </div>
            <span
              className="carousel-category"
              style={{ backgroundColor: CATEGORY_COLORS[recipe.category] }}
            >
              {recipe.category}
            </span>
          </div>
        </div>

        <div className="content-wrapper">
          <div className="main-content">
            <header className="recipe-header">
              <h1 className="recipe-title">{recipe.name}</h1>
              <div className="recipe-meta">
                <div className="author-info">
                  <div className="author-avatar">👨‍🍳</div>
                  <div>
                    <span className="author-name">{recipe.authorName}</span>
                    <span className="author-label">作者</span>
                  </div>
                </div>
                <div className="recipe-stats">
                  <div className="stat">
                    <StarRating rating={Math.round(avgRating)} size="small" />
                    <span className="stat-text">{avgRating > 0 ? avgRating : '暂无评分'}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-icon">❤️</span>
                    <span className="stat-text">{recipe.favoritedBy.length} 收藏</span>
                  </div>
                </div>
              </div>
            </header>

            <section className="ingredients-section">
              <h2 className="section-title">
                <span className="title-icon">🥗</span>
                食材清单
              </h2>
              <div className="ingredients-grid">
                {recipe.ingredients.map(ing => (
                  <div key={ing.id} className="ingredient-item">
                    <span className="ingredient-amount">
                      {ing.quantity}{ing.unit}
                    </span>
                    <span className="ingredient-name">{ing.name}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="steps-section">
              <h2 className="section-title">
                <span className="title-icon">👨‍🍳</span>
                烹饪步骤
              </h2>
              <div className="steps-timeline">
                {recipe.steps.map((step, index) => (
                  <div
                    key={step.id}
                    ref={el => { stepRefs.current[index] = el; }}
                    data-step-index={index}
                    className={`step-item ${visibleSteps.has(index) ? 'visible' : ''}`}
                  >
                    <div className="step-marker">
                      <span className="step-number">{index + 1}</span>
                      {index < recipe.steps.length - 1 && <div className="step-connector" />}
                    </div>
                    <div className="step-content">
                      {step.title && <h3 className="step-title">{step.title}</h3>}
                      <p className="step-description">{step.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="review-section">
              <h2 className="section-title">
                <span className="title-icon">⭐</span>
                评价
              </h2>
              <div className="review-input-card">
                <div className="rating-row">
                  <span className="rating-label">你的评分：</span>
                  <StarRating rating={userRating} onRate={handleRate} interactive size="large" />
                  {userRating > 0 && <span className="rating-text">{userRating} 分</span>}
                </div>
                <textarea
                  className="review-textarea"
                  placeholder="分享你的烹饪心得或对这个食谱的评价..."
                  value={reviewText}
                  onChange={e => setReviewText(e.target.value)}
                  rows={3}
                />
                <button
                  className="submit-review-btn"
                  onClick={handleSubmitReview}
                  disabled={userRating === 0}
                >
                  提交评价
                </button>
              </div>
              {recipe.reviews.length > 0 && (
                <div className="reviews-list">
                  {recipe.reviews.slice().reverse().map(review => (
                    <div key={review.id} className="review-item">
                      <div className="review-avatar">👤</div>
                      <div className="review-body">
                        <div className="review-header">
                          <span className="reviewer-name">用户</span>
                          <StarRating rating={review.rating} size="small" />
                        </div>
                        {review.comment && <p className="review-comment">{review.comment}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>

        <section className="similar-section">
          <div className="similar-header">
            <h2 className="section-title">
              <span className="title-icon">✨</span>
              相似推荐
            </h2>
            <div className="similar-controls">
              <button
                className={`scroll-btn ${isAtStart ? 'disabled' : ''}`}
                onClick={() => scrollRecommendations('left')}
                disabled={isAtStart}
                aria-label="向左滚动"
              >
                ‹
              </button>
              <button
                className={`scroll-btn ${isAtEnd ? 'disabled' : ''}`}
                onClick={() => scrollRecommendations('right')}
                disabled={isAtEnd}
                aria-label="向右滚动"
              >
                ›
              </button>
            </div>
          </div>
          <div
            className="similar-scroll"
            ref={setScrollContainerRef}
          >
            {similarRecipes.map(r => (
              <div key={r.id} className="similar-card-wrapper">
                <RecipeCard recipe={r} />
              </div>
            ))}
          </div>
        </section>
      </div>

      <style>{`
        .recipe-detail {
          min-height: 100vh;
        }
        .detail-container {
          max-width: 900px;
          margin: 0 auto;
          padding: 0 24px 48px;
        }
        .carousel-section {
          margin: 0 -24px;
        }
        .carousel {
          position: relative;
          width: 100%;
          padding-top: 50%;
          overflow: hidden;
          background: #2c3e50;
        }
        .carousel-track {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          transition: transform 0.5s ease-in-out;
        }
        .carousel-slide {
          flex-shrink: 0;
          width: 100%;
          height: 100%;
        }
        .carousel-slide img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .carousel-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.9);
          border: none;
          font-size: 28px;
          color: #2c3e50;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .carousel-btn:hover {
          background: white;
          transform: translateY(-50%) scale(1.1);
        }
        .carousel-btn:active {
          transform: translateY(-50%) scale(0.95);
        }
        .carousel-btn.prev { left: 16px; }
        .carousel-btn.next { right: 16px; }
        .carousel-dots {
          position: absolute;
          bottom: 16px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 8px;
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.5);
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          padding: 0;
        }
        .dot.active {
          width: 24px;
          border-radius: 4px;
          background: white;
        }
        .carousel-favorite {
          position: absolute;
          top: 16px;
          right: 16px;
        }
        .carousel-category {
          position: absolute;
          bottom: 16px;
          left: 16px;
          padding: 6px 16px;
          border-radius: 20px;
          color: white;
          font-size: 13px;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }
        .content-wrapper {
          margin-top: -40px;
          position: relative;
          z-index: 1;
        }
        .main-content {
          background: white;
          border-radius: 16px 16px 0 0;
          padding: 32px;
          box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.06);
        }
        .recipe-header {
          margin-bottom: 32px;
        }
        .recipe-title {
          font-size: 32px;
          font-weight: 800;
          color: #2c3e50;
          margin: 0 0 16px;
          line-height: 1.3;
        }
        .recipe-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          padding-bottom: 20px;
          border-bottom: 1px solid #F0E6D8;
        }
        .author-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .author-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, #FFF8EE 0%, #FFECCC 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
        }
        .author-info > div {
          display: flex;
          flex-direction: column;
        }
        .author-name {
          font-weight: 600;
          color: #2c3e50;
          font-size: 14px;
        }
        .author-label {
          font-size: 12px;
          color: #95a5a6;
        }
        .recipe-stats {
          display: flex;
          gap: 20px;
        }
        .stat {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #7f8c8d;
          font-size: 14px;
        }
        .stat-icon {
          font-size: 16px;
        }
        .stat-text {
          font-weight: 500;
        }
        .section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 20px;
          font-weight: 700;
          color: #2c3e50;
          margin: 0 0 20px;
        }
        .title-icon {
          font-size: 22px;
        }
        .ingredients-section,
        .steps-section,
        .review-section {
          margin-bottom: 36px;
        }
        .ingredients-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        .ingredient-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: #FFF8EE;
          border-radius: 10px;
          border-left: 3px solid transparent;
          transition: all 0.2s ease;
        }
        .ingredient-item:hover {
          border-left-color: #E67E22;
          background: #FFF0DC;
          transform: translateX(4px);
        }
        .ingredient-amount {
          color: #E67E22;
          font-weight: 600;
          font-size: 14px;
          min-width: 60px;
        }
        .ingredient-name {
          color: #2c3e50;
          font-size: 14px;
        }
        .steps-timeline {
          padding-left: 16px;
        }
        .step-item {
          display: flex;
          gap: 20px;
          margin-bottom: 0;
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .step-item.visible {
          opacity: 1;
          transform: translateY(0);
        }
        .step-marker {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .step-number {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #E67E22 0%, #F39C12 100%);
          color: white;
          font-weight: 700;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(230, 126, 34, 0.3);
        }
        .step-connector {
          position: absolute;
          top: 40px;
          width: 3px;
          height: calc(100% + 8px);
          background: linear-gradient(to bottom, #F39C12, #FCE4BC);
          border-radius: 2px;
        }
        .step-content {
          flex: 1;
          padding: 8px 0 40px;
        }
        .step-title {
          font-size: 17px;
          font-weight: 600;
          color: #2c3e50;
          margin: 0 0 8px;
        }
        .step-description {
          color: #5D6D7E;
          line-height: 1.8;
          margin: 0;
          font-size: 15px;
        }
        .review-input-card {
          background: #FFF8EE;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
        }
        .rating-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .rating-label {
          color: #2c3e50;
          font-weight: 500;
          font-size: 14px;
        }
        .rating-text {
          color: #E67E22;
          font-weight: 600;
          font-size: 14px;
        }
        .review-textarea {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #F0E6D8;
          border-radius: 10px;
          background: white;
          font-size: 14px;
          color: #2c3e50;
          resize: vertical;
          font-family: inherit;
          transition: border-color 0.2s ease;
          box-sizing: border-box;
        }
        .review-textarea:focus {
          outline: none;
          border-color: #E67E22;
        }
        .submit-review-btn {
          margin-top: 12px;
          padding: 10px 28px;
          background: linear-gradient(135deg, #E67E22 0%, #F39C12 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(230, 126, 34, 0.3);
        }
        .submit-review-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(230, 126, 34, 0.4);
        }
        .submit-review-btn:active:not(:disabled) {
          transform: scale(0.95);
        }
        .submit-review-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          box-shadow: none;
        }
        .reviews-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .review-item {
          display: flex;
          gap: 12px;
          padding: 16px;
          background: white;
          border-radius: 12px;
          border: 1px solid #F0E6D8;
          border-left: 3px solid transparent;
          transition: all 0.2s ease;
        }
        .review-item:hover {
          border-left-color: #E67E22;
          transform: translateX(4px);
        }
        .review-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #FFF8EE 0%, #FFECCC 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
        }
        .review-body {
          flex: 1;
        }
        .review-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 6px;
        }
        .reviewer-name {
          font-weight: 600;
          color: #2c3e50;
          font-size: 14px;
        }
        .review-comment {
          color: #5D6D7E;
          font-size: 14px;
          line-height: 1.6;
          margin: 0;
        }
        .similar-section {
          margin-top: 48px;
        }
        .similar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .similar-header .section-title {
          margin: 0;
        }
        .similar-controls {
          display: flex;
          gap: 8px;
        }
        .scroll-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: white;
          border: 2px solid #F0E6D8;
          font-size: 20px;
          color: #2c3e50;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .scroll-btn:hover:not(:disabled) {
          background: #FFF8EE;
          border-color: #E67E22;
          color: #E67E22;
        }
        .scroll-btn:active:not(:disabled) {
          transform: scale(0.95);
        }
        .scroll-btn.disabled,
        .scroll-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          color: #BDC3C7;
        }
        .similar-scroll {
          display: flex;
          gap: 16px;
          overflow-x: auto;
          padding: 4px 4px 16px;
          scroll-behavior: smooth;
          scrollbar-width: none;
          transition: scroll-left 0.4s ease-in-out;
        }
        .similar-scroll::-webkit-scrollbar {
          display: none;
        }
        .similar-card-wrapper {
          flex-shrink: 0;
          width: 260px;
          transition: transform 0.4s ease-in-out;
        }
        @media (max-width: 768px) {
          .detail-container {
            padding: 0 16px 32px;
          }
          .carousel-section {
            margin: 0 -16px;
          }
          .carousel {
            padding-top: 65%;
          }
          .main-content {
            padding: 24px 16px;
          }
          .recipe-title {
            font-size: 24px;
          }
          .recipe-meta {
            flex-direction: column;
            align-items: flex-start;
          }
          .recipe-stats {
            gap: 16px;
          }
          .ingredients-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }
          .ingredient-item {
            padding: 10px 12px;
          }
          .step-number {
            width: 32px;
            height: 32px;
            font-size: 14px;
          }
          .step-item {
            gap: 12px;
          }
          .step-content {
            padding-bottom: 28px;
          }
          .carousel-btn {
            width: 36px;
            height: 36px;
            font-size: 20px;
          }
          .similar-card-wrapper {
            width: 220px;
          }
          .section-title {
            font-size: 18px;
          }
        }
      `}</style>
    </div>
  );
};

export default RecipeDetailPage;
