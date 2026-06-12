import { useState, useEffect } from 'react'
import type { Book, Review } from '../types'
import { getBookById, getBookReviews, addReview, borrowBook, returnBook } from '../api'
import StarRating from '../components/StarRating'

interface BookDetailProps {
  bookId: string
  navigate: (path: string) => void
}

export default function BookDetail({ bookId, navigate }: BookDetailProps) {
  const [book, setBook] = useState<Book | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [newRating, setNewRating] = useState(0)
  const [newComment, setNewComment] = useState('')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')

  const fetchData = async () => {
    try {
      const [bookData, reviewsData] = await Promise.all([
        getBookById(bookId),
        getBookReviews(bookId),
      ])
      setBook(bookData)
      setReviews(reviewsData)
    } catch (err: any) {
      setMessage(err.message)
      setMessageType('error')
    }
  }

  useEffect(() => {
    if (bookId) fetchData()
  }, [bookId])

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0

  const showMsg = (msg: string, type: 'success' | 'error' = 'success') => {
    setMessage(msg)
    setMessageType(type)
    setTimeout(() => setMessage(''), 3000)
  }

  const handleBorrow = async () => {
    try {
      const res = await borrowBook(bookId)
      setBook(res.book)
      showMsg('借阅成功！')
    } catch (err: any) {
      showMsg(err.message, 'error')
    }
  }

  const handleReturn = async () => {
    try {
      const res = await returnBook(bookId)
      setBook(res.book)
      showMsg('归还成功！')
    } catch (err: any) {
      showMsg(err.message, 'error')
    }
  }

  const handleSubmitReview = async () => {
    if (newRating === 0) {
      showMsg('请选择评分', 'error')
      return
    }
    if (newComment.length > 200) {
      showMsg('评论不能超过200字', 'error')
      return
    }
    try {
      await addReview(bookId, newRating, newComment)
      setNewRating(0)
      setNewComment('')
      showMsg('书评提交成功！')
      const updatedReviews = await getBookReviews(bookId)
      setReviews(updatedReviews)
    } catch (err: any) {
      showMsg(err.message, 'error')
    }
  }

  if (!book) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>加载中...</div>
  }

  const statusColor = book.status === '在馆' ? '#10b981' : '#ef4444'

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <button
        onClick={() => navigate('/search')}
        style={{
          background: 'none',
          border: 'none',
          color: '#78350f',
          fontSize: '14px',
          cursor: 'pointer',
          marginBottom: '16px',
        }}
      >
        ← 返回列表
      </button>

      {message && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '12px',
            marginBottom: '16px',
            backgroundColor: messageType === 'success' ? '#dcfce7' : '#fee2e2',
            color: messageType === 'success' ? '#166534' : '#991b1b',
          }}
        >
          {message}
        </div>
      )}

      <div className="detail-layout" style={{ display: 'flex', gap: '32px' }}>
        <div style={{ width: '300px', flexShrink: 0 }}>
          <div
            style={{
              width: '200px',
              height: '280px',
              backgroundColor: '#e5e7eb',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="80" height="80" viewBox="0 0 24 24" fill="#9ca3af">
              <path d="M4 5h6a3 3 0 013 3v12a2 2 0 00-2-2H4V5z" />
              <path d="M20 5h-6a3 3 0 00-3 3v12a2 2 0 012-2h7V5z" />
            </svg>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#78350f' }}>{book.title}</h1>
          <div style={{ fontSize: '16px', color: '#44403c' }}>作者：{book.author}</div>
          <div style={{ fontSize: '14px', color: '#78716c' }}>ISBN：{book.isbn}</div>
          <div style={{ fontSize: '14px', color: '#78716c' }}>分类：{book.category}</div>
          <div style={{ fontSize: '14px', color: '#78716c' }}>捐赠人：{book.donor}</div>
          <div style={{ fontSize: '14px', color: '#78716c' }}>入库日期：{book.入库Date}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#78716c' }}>状态：</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill={statusColor}>
              <circle cx="12" cy="12" r="10" />
            </svg>
            <span style={{ color: statusColor, fontWeight: '600' }}>{book.status}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#78716c' }}>平均评分：</span>
            <StarRating rating={avgRating} size={20} />
            <span style={{ color: '#78716c' }}>({avgRating.toFixed(1)})</span>
          </div>
          <div style={{ fontSize: '14px', color: '#78716c' }}>借阅次数：{book.borrowCount} 次</div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            {book.status === '在馆' && (
              <button
                onClick={handleBorrow}
                style={btnStyle}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#9a3412')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#c2410c')}
              >
                借阅
              </button>
            )}
            {book.status === '已借出' && (
              <button
                onClick={handleReturn}
                style={btnStyle}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#9a3412')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#c2410c')}
              >
                归还
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '40px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#78350f', marginBottom: '16px' }}>
          读者书评 ({reviews.length})
        </h2>

        {reviews.length === 0 ? (
          <div style={{ color: '#78716c', padding: '20px 0' }}>暂无书评，成为第一个评论者吧！</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {reviews.map((review) => (
              <div
                key={review._id}
                style={{
                  backgroundColor: 'white',
                  padding: '16px',
                  borderRadius: '12px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <StarRating rating={review.rating} size={16} />
                  <span style={{ fontSize: '12px', color: '#a8a29e' }}>
                    {new Date(review.createdAt).toLocaleString('zh-CN')}
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: '#44403c' }}>{review.comment}</div>
                <div style={{ fontSize: '12px', color: '#a8a29e', marginTop: '8px' }}>
                  —— {review.reviewer}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: '32px', backgroundColor: 'white', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#78350f', marginBottom: '12px' }}>
            提交书评
          </h3>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#44403c' }}>
              评分：
            </label>
            <StarRating rating={newRating} size={24} interactive onChange={setNewRating} />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#44403c' }}>
              评论（最多200字）：
            </label>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              maxLength={200}
              rows={4}
              placeholder="分享你的阅读感受..."
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #d6d3d1',
                fontSize: '14px',
                resize: 'vertical',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            <div style={{ textAlign: 'right', fontSize: '12px', color: '#a8a29e', marginTop: '4px' }}>
              {newComment.length}/200
            </div>
          </div>
          <button
            onClick={handleSubmitReview}
            style={{
              ...btnStyle,
              width: 'auto',
              height: '40px',
              fontSize: '14px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#9a3412')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#c2410c')}
          >
            提交书评
          </button>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .detail-layout { flex-direction: column !important; }
        }
      `}</style>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  width: '160px',
  height: '48px',
  borderRadius: '12px',
  backgroundColor: '#c2410c',
  color: 'white',
  border: 'none',
  fontSize: '16px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
}
