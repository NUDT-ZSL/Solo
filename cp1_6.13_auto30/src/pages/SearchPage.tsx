import { useState, useEffect, useRef } from 'react'
import type { Book, Review } from '../types'
import { getBooks, getBookReviews } from '../api'
import BookCard from '../components/BookCard'

interface SearchPageProps {
  navigate: (path: string) => void
}

const categories = ['全部', '文学', '科普', '少儿', '历史', '其他']

export default function SearchPage({ navigate }: SearchPageProps) {
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('全部')
  const [books, setBooks] = useState<Book[]>([])
  const [reviewsMap, setReviewsMap] = useState<Record<string, Review[]>>({})
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const fetchBooks = async (kw?: string, cat?: string) => {
    setLoading(true)
    try {
      const result = await getBooks(kw, cat)
      setBooks(result)
      for (const book of result) {
        if (!reviewsMap[book._id]) {
          const reviews = await getBookReviews(book._id)
          setReviewsMap((prev) => ({ ...prev, [book._id]: reviews }))
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBooks()
  }, [])

  const handleSearch = () => {
    fetchBooks(keyword, category)
  }

  const handleKeywordChange = (val: string) => {
    setKeyword(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchBooks(val, category)
    }, 300)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const getAvgRating = (bookId: string) => {
    const reviews = reviewsMap[bookId] || []
    if (reviews.length === 0) return 0
    return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
  }

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#78350f', marginBottom: '24px' }}>
        图书检索
      </h1>

      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '32px',
          flexWrap: 'wrap',
        }}
      >
        <input
          type="text"
          placeholder="输入书名、作者或ISBN..."
          value={keyword}
          onChange={(e) => handleKeywordChange(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            minWidth: '200px',
            padding: '12px 16px',
            borderRadius: '12px',
            border: '1px solid #d6d3d1',
            fontSize: '15px',
            outline: 'none',
            backgroundColor: 'white',
          }}
        />
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value)
            fetchBooks(keyword, e.target.value)
          }}
          style={{
            padding: '12px 16px',
            borderRadius: '12px',
            border: '1px solid #d6d3d1',
            fontSize: '15px',
            outline: 'none',
            backgroundColor: 'white',
            cursor: 'pointer',
          }}
        >
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button
          onClick={handleSearch}
          style={{
            padding: '12px 24px',
            borderRadius: '12px',
            backgroundColor: '#c2410c',
            color: 'white',
            border: 'none',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#9a3412')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#c2410c')}
        >
          搜索
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#78716c' }}>加载中...</div>
      ) : books.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#78716c' }}>暂无图书数据</div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '24px',
            justifyContent: 'flex-start',
          }}
          className="book-grid"
        >
          {books.map((book) => (
            <BookCard
              key={book._id}
              book={book}
              averageRating={getAvgRating(book._id)}
              onClick={() => navigate(`/book/${book._id}`)}
            />
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .book-grid { justify-content: center !important; }
        }
      `}</style>
    </div>
  )
}
