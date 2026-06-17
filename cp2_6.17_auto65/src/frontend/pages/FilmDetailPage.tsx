import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime.js';
import type { FilmWithStats, Rating } from '../../types.js';
import RatingWidget from '../components/RatingWidget.js';

dayjs.extend(relativeTime);

const API_BASE = 'http://localhost:3001';

interface FilmDetailResponse extends FilmWithStats {
  recentComments: Rating[];
}

const MOCK_USERNAMES = ['影迷小王', '电影爱好者', '影评人小李', '资深观众', '文艺青年', '爆米花爱好者', '深夜观影人', '导演系学生', '电影收藏家', '豆瓣用户'];

const FilmDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [film, setFilm] = useState<FilmDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const getMockUsername = (index: number) => MOCK_USERNAMES[index % MOCK_USERNAMES.length];

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchFilmDetail = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/films/${id}`);
      if (!response.ok) {
        throw new Error('获取影片详情失败');
      }
      const data: FilmDetailResponse = await response.json();
      setFilm(data);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    fetchFilmDetail();
  }, [fetchFilmDetail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    if (score < 1 || score > 5) {
      showToast('请选择评分（1-5星）');
      return;
    }

    if (comment.length > 200) {
      showToast('评论不能超过200字');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`${API_BASE}/api/ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filmId: id,
          score,
          comment: comment.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '提交评分失败');
      }

      setScore(0);
      setComment('');
      fetchFilmDetail();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="empty-state">
        <div className="spinner"></div>
        <span>加载中...</span>
      </div>
    );
  }

  if (!film) {
    return <div className="empty-state">影片不存在</div>;
  }

  return (
    <div className="film-detail">
      {toast && <div className="toast">{toast}</div>}

      <div className="film-detail-header">
        <img src={film.posterUrl} alt={film.title} className="film-detail-poster" />
        <div className="film-detail-info">
          <h1 className="film-detail-title">{film.title}</h1>
          <div className="film-detail-director">导演：{film.director}</div>
          <p className="film-detail-description">{film.description}</p>
          <div className="film-detail-stats">
            <div>
              <RatingWidget value={Math.round(film.averageScore)} readOnly size="normal" />
              <span style={{ marginLeft: '8px', fontSize: '20px', fontWeight: 'bold', color: '#ffb300' }}>
                {film.averageScore.toFixed(1)}
              </span>
            </div>
            <span className="vote-count">{film.voteCount} 人评分</span>
          </div>
        </div>
      </div>

      <div className="rating-section">
        <h2 className="rating-section-title">发表评价</h2>
        <form onSubmit={handleSubmit}>
          <div className="rating-widget">
            <span className="rating-label">评分：</span>
            <RatingWidget value={score} onChange={setScore} size="normal" />
            {score > 0 && <span style={{ color: '#ffb300', marginLeft: '8px' }}>{score} 星</span>}
          </div>
          <textarea
            className="comment-input"
            placeholder="写下你的评论（限200字）"
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 200))}
            maxLength={200}
          />
          <div className="comment-count">{comment.length}/200</div>
          <button type="submit" className="submit-btn" disabled={submitting || score < 1}>
            {submitting ? <div className="spinner"></div> : '提交'}
          </button>
        </form>
      </div>

      <div className="comments-section">
        <h2 className="comments-title">最新评论 ({film.recentComments.length})</h2>
        {film.recentComments.length === 0 ? (
          <div className="empty-state">暂无评论，快来抢沙发吧！</div>
        ) : (
          <div className="comments-list">
            {film.recentComments.map((rating, index) => (
              <div key={rating.id} className="comment-item">
                <div className="comment-header">
                  <span className="comment-username">{getMockUsername(index)}</span>
                  <RatingWidget value={rating.score} readOnly size="small" />
                  <span className="comment-time">{dayjs(rating.createdAt).fromNow()}</span>
                </div>
                {rating.comment && <p className="comment-text">{rating.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FilmDetailPage;
