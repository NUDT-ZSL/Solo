import { useState, useRef, useEffect } from 'react';
import type { Recommendation, Book } from '../types';
import { searchBookByISBN } from '../api/bookApi';
import './ReaderRecommend.css';

interface ReaderRecommendProps {
  recommendations: Recommendation[];
  onSubmitRecommendation: (data: {
    bookTitle: string;
    recommenderName: string;
    reason: string;
  }) => Promise<void>;
}

const ReaderRecommend = ({ recommendations, onSubmitRecommendation }: ReaderRecommendProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [bookTitle, setBookTitle] = useState('');
  const [recommenderName, setRecommenderName] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setBookTitle(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.trim().length >= 2) {
      searchTimeoutRef.current = window.setTimeout(async () => {
        try {
          const results = await searchBookByISBN(value);
          setSearchResults(results);
          setShowSuggestions(true);
        } catch (err) {
          console.error('搜索失败:', err);
        }
      }, 200);
    } else {
      setSearchResults([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectBook = (book: Book) => {
    setBookTitle(book.title);
    setSearchQuery(book.title);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookTitle.trim() || !recommenderName.trim() || !reason.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitRecommendation({
        bookTitle: bookTitle.trim(),
        recommenderName: recommenderName.trim(),
        reason: reason.trim()
      });
      setSubmitSuccess(true);
      setBookTitle('');
      setSearchQuery('');
      setRecommenderName('');
      setReason('');
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (err) {
      console.error('提交失败:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="reader-recommend">
      <h2 className="section-title">📝 读者推荐</h2>

      <form className="recommend-form" onSubmit={handleSubmit}>
        <div className="form-group search-wrapper" ref={suggestionsRef}>
          <label htmlFor="bookSearch">搜索书籍</label>
          <input
            id="bookSearch"
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="输入书名、作者或ISBN..."
            className="search-input"
            autoComplete="off"
          />
          {showSuggestions && searchResults.length > 0 && (
            <div className="search-suggestions">
              {searchResults.map((book) => (
                <div
                  key={book.id}
                  className="suggestion-item"
                  onClick={() => handleSelectBook(book)}
                >
                  <div className="suggestion-title">{book.title}</div>
                  <div className="suggestion-author">{book.author}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="bookTitle">书籍名称 *</label>
          <input
            id="bookTitle"
            type="text"
            value={bookTitle}
            onChange={(e) => setBookTitle(e.target.value)}
            placeholder="请输入推荐的书名"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="recommenderName">您的昵称 *</label>
          <input
            id="recommenderName"
            type="text"
            value={recommenderName}
            onChange={(e) => setRecommenderName(e.target.value)}
            placeholder="请输入您的昵称"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="reason">推荐理由 *</label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="分享你推荐这本书的理由..."
            rows={4}
            required
          />
        </div>

        <button type="submit" className="submit-btn" disabled={isSubmitting}>
          {isSubmitting ? '提交中...' : '提交推荐'}
        </button>

        {submitSuccess && (
          <div className="success-message">✓ 推荐提交成功！感谢您的分享~</div>
        )}
      </form>

      <div className="recommendations-list">
        <h3 className="list-title">推荐书单</h3>
        {recommendations.length === 0 ? (
          <div className="empty-recommendations">暂无推荐，快来成为第一个推荐的人吧~</div>
        ) : (
          recommendations.map((rec, index) => (
            <RecommendationItem key={rec.id} recommendation={rec} delay={index * 0.05} />
          ))
        )}
      </div>
    </div>
  );
};

interface RecommendationItemProps {
  recommendation: Recommendation;
  delay: number;
}

const RecommendationItem = ({ recommendation, delay }: RecommendationItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay * 1000);
    return () => clearTimeout(timer);
  }, [delay]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric'
    });
  };

  const summary = recommendation.reason.length > 50
    ? recommendation.reason.slice(0, 50) + '...'
    : recommendation.reason;

  return (
    <div
      className={`recommendation-card ${isVisible ? 'visible' : ''}`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="rec-header">
        <h4 className="rec-book-title">{recommendation.bookTitle}</h4>
        <span className="rec-date">{formatDate(recommendation.submittedAt)}</span>
      </div>
      <div className="rec-recommender">— {recommendation.recommenderName}</div>
      <div className={`rec-reason ${isExpanded ? 'expanded' : ''}`}>
        {isExpanded ? recommendation.reason : summary}
      </div>
      {recommendation.reason.length > 50 && (
        <div className="rec-toggle">
          {isExpanded ? '收起 ▲' : '展开 ▼'}
        </div>
      )}
    </div>
  );
};

export default ReaderRecommend;
