import { useState, useEffect, useRef } from 'react';
import BookList from './components/BookList';
import ReviewWall from './components/ReviewWall';
import { getBooks, getReviews, Book, Review, ReviewFilter } from './api';
import './styles/App.css';

const globalLikedReviews = new Map<string, boolean>();
const globalLikesDelta = new Map<string, number>();

function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState<'latest' | 'hottest'>('latest');
  const [likedReviews, setLikedReviews] = useState<Map<string, boolean>>(new Map(globalLikedReviews));

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const booksData = await getBooks();
        setBooks(booksData);
        if (booksData.length > 0) {
          setSelectedBookId(booksData[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch books:', error);
      }
    };
    fetchBooks();
  }, []);

  useEffect(() => {
    const fetchReviews = async () => {
      setReviewsLoading(true);
      try {
        const filter: ReviewFilter = {
          bookId: selectedBookId || undefined,
          ratings: selectedRatings.length > 0 ? selectedRatings : undefined,
          sortBy
        };
        const reviewsData = await getReviews(filter);
        
        const adjustedReviews = reviewsData.map(r => {
          const delta = globalLikesDelta.get(r.id) || 0;
          return { ...r, likes: Math.max(0, r.likes + delta) };
        });
        
        setReviews(adjustedReviews);
      } catch (error) {
        console.error('Failed to fetch reviews:', error);
      } finally {
        setLoading(false);
        setReviewsLoading(false);
      }
    };

    if (selectedBookId) {
      fetchReviews();
    }
  }, [selectedBookId, selectedRatings, sortBy]);

  const handleBookSelect = (bookId: string) => {
    setSelectedBookId(bookId);
  };

  const handleLike = (reviewId: string) => {
    const currentlyLiked = globalLikedReviews.get(reviewId) || false;
    const newLiked = !currentlyLiked;
    
    globalLikedReviews.set(reviewId, newLiked);
    
    const currentDelta = globalLikesDelta.get(reviewId) || 0;
    globalLikesDelta.set(reviewId, newLiked ? currentDelta + 1 : currentDelta - 1);
    
    setLikedReviews(new Map(globalLikedReviews));
    
    setReviews(prev => prev.map(r => 
      r.id === reviewId 
        ? { ...r, likes: Math.max(0, r.likes + (newLiked ? 1 : -1)) }
        : r
    ));
  };

  const handleRatingFilterChange = (rating: number) => {
    setSelectedRatings(prev => {
      if (prev.includes(rating)) {
        return prev.filter(r => r !== rating);
      } else {
        return [...prev, rating].sort((a, b) => b - a);
      }
    });
  };

  const handleSortChange = (sort: 'latest' | 'hottest') => {
    setSortBy(sort);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>📚 读书会书评墙</h1>
        <p className="subtitle">分享你的阅读感悟，聆听他人的声音</p>
      </header>
      
      <div className="app-main">
        <aside className="sidebar">
          <h2 className="sidebar-title">热门书籍</h2>
          <BookList 
            books={books} 
            selectedBookId={selectedBookId} 
            onSelect={handleBookSelect} 
          />
        </aside>
        
        <main className="content">
          <ReviewWall 
            reviews={reviews}
            loading={loading || reviewsLoading}
            selectedRatings={selectedRatings}
            sortBy={sortBy}
            likedReviews={likedReviews}
            onRatingFilterChange={handleRatingFilterChange}
            onSortChange={handleSortChange}
            onLike={handleLike}
            selectedBook={books.find(b => b.id === selectedBookId)}
          />
        </main>
      </div>
    </div>
  );
}

export default App;
