import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Calendar, MapPin, Users, Check, Loader2 } from 'lucide-react';
import axios from 'axios';
import type { BookClub, Review, ReviewsResponse } from '../types';
import { useStore } from '../store/useStore';
import { formatRelativeTime } from '../utils/date';
import ReviewForm from './ReviewForm';
import VotePanel from './VotePanel';

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <span
          key={i}
          className="text-lg"
          style={{ color: i <= rating ? '#FFD700' : '#D1D5DB' }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export default function BookClubDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useStore();

  const [bookClub, setBookClub] = useState<BookClub | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registerCount, setRegisterCount] = useState(0);
  const [countScale, setCountScale] = useState(false);
  const [showVotePanel, setShowVotePanel] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    axios.get(`/api/bookclubs/${id}`)
      .then(res => {
        setBookClub(res.data);
        setRegisterCount(res.data.registeredCount);
      })
      .catch(err => console.error('获取书会详情失败:', err));
  }, [id]);

  const fetchReviews = useCallback((pageNum: number) => {
    if (!id || isLoading) return;
    setIsLoading(true);
    axios.get<ReviewsResponse>(`/api/bookclubs/${id}/reviews?page=${pageNum}&limit=10`)
      .then(res => {
        const data = res.data;
        if (pageNum === 1) {
          setReviews(data.reviews);
        } else {
          setReviews(prev => [...prev, ...data.reviews]);
        }
        setHasMore(data.hasMore);
        setPage(pageNum);
      })
      .catch(err => console.error('获取书评失败:', err))
      .finally(() => setIsLoading(false));
  }, [id, isLoading]);

  useEffect(() => {
    fetchReviews(1);
  }, [id]);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          fetchReviews(page + 1);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoading, page, fetchReviews]);

  const handleRegister = () => {
    if (!id || isRegistered || registering) return;
    setRegistering(true);
    axios.post(`/api/bookclubs/${id}/register`, { userId: currentUser.id })
      .then(() => {
        setIsRegistered(true);
        setRegisterCount(prev => prev + 1);
        setCountScale(true);
        setTimeout(() => setCountScale(false), 300);
      })
      .catch(err => {
        if (err.response?.status === 400) {
          setIsRegistered(true);
        }
      })
      .finally(() => setRegistering(false));
  };

  const handleReviewSubmitted = (newReview: Review) => {
    setReviews(prev => [newReview, ...prev]);
  };

  if (!bookClub) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-violet-theme border-t-transparent rounded-full loader" />
      </div>
    );
  }

  const displayedUsers = bookClub.registeredUsers.slice(0, 8);
  const extraCount = bookClub.registeredCount - 8;

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 pt-6 pb-12">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-coffee/70 hover:text-coffee transition-colors mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>返回书会列表</span>
      </button>

      <div className="bg-white rounded-xl overflow-hidden mb-8" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <div
          className="h-48 md:h-56 flex items-center justify-center text-7xl"
          style={{ background: bookClub.coverBg }}
        >
          {bookClub.coverIcon}
        </div>
        <div className="p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-bold text-coffee mb-4">{bookClub.name}</h1>
          <div className="flex flex-wrap gap-4 mb-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-violet-theme" />
              <span>{bookClub.date} {bookClub.time}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-violet-theme" />
              <span>{bookClub.location}</span>
            </div>
          </div>
          <p className="text-gray-700 leading-relaxed mb-6">{bookClub.description}</p>

          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-violet-theme" />
              <span className="text-sm text-gray-500">已报名：</span>
              <div className="flex items-center">
                {displayedUsers.map(user => (
                  <div
                    key={user.id}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm -ml-1 first:ml-0 border-2 bg-white relative"
                    style={{ borderColor: user.avatarBorder, zIndex: 1 }}
                    title={user.name}
                  >
                    {user.avatar}
                  </div>
                ))}
                {extraCount > 0 && (
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium -ml-1 border-2 border-violet-theme bg-violet-theme text-white">
                    +{extraCount}
                  </div>
                )}
              </div>
              <motion.span
                animate={{ scale: countScale ? 1.3 : 1 }}
                transition={{ duration: 0.3 }}
                className="text-sm font-semibold text-violet-theme ml-1"
              >
                {registerCount}人
              </motion.span>
            </div>

            <div className="flex gap-3">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleRegister}
                disabled={isRegistered || registering}
                className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-300 flex items-center gap-2 ${
                  isRegistered
                    ? 'bg-green-500 text-white cursor-not-allowed'
                    : 'bg-violet-theme text-white hover:bg-violet-600'
                }`}
              >
                {isRegistered ? (
                  <>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                    >
                      <Check className="w-4 h-4" />
                    </motion.div>
                    已报名
                  </>
                ) : registering ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    报名中...
                  </>
                ) : (
                  '报名参加'
                )}
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowVotePanel(true)}
                className="px-6 py-2.5 rounded-lg font-medium text-sm bg-white text-violet-theme border-2 border-violet-theme hover:bg-violet-50 transition-colors duration-200"
              >
                投票选书
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <ReviewForm bookClubId={id!} onReviewSubmitted={handleReviewSubmitted} />
      </div>

      <div>
        <h2 className="text-xl font-bold text-coffee mb-6">读者书评</h2>
        <div className="space-y-4">
          <AnimatePresence>
            {reviews.map(review => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-xl p-5 md:p-6 w-full"
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 flex-shrink-0"
                    style={{
                      borderColor: '#8B5CF6',
                      backgroundColor: '#FFF8E7'
                    }}
                  >
                    {review.userAvatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-coffee">{review.userName}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {formatRelativeTime(review.createdAt)}
                      </span>
                    </div>
                    <StarRating rating={review.rating} />
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed pl-[52px]">{review.content}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-3 border-violet-theme border-t-transparent rounded-full loader" />
          </div>
        )}

        <div ref={sentinelRef} className="h-4" />

        {!hasMore && reviews.length > 0 && (
          <p className="text-center text-gray-400 text-sm py-4">已加载全部评论</p>
        )}
      </div>

      <AnimatePresence>
        {showVotePanel && (
          <VotePanel
            bookClubId={id!}
            onClose={() => setShowVotePanel(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
