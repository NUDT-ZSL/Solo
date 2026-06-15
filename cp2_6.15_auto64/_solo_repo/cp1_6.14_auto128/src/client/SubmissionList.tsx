import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import http from './http';

interface Submission {
  id: string;
  userId: string;
  userNickname: string;
  classId: string;
  assignmentId: string;
  title: string;
  imageUrl: string;
  createdAt: string;
}

interface ReviewStat {
  submissionId: string;
  avgRating: number;
  reviewCount: number;
  rank: number;
}

interface Props {
  onSelectSubmission: (id: string) => void;
}

const SubmissionList: React.FC<Props> = ({ onSelectSubmission }) => {
  const { user, isTeacher } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState<ReviewStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subRes, statsRes] = await Promise.all([
          http.get('/submissions', {
            params: { classId: 'class-001', assignmentId: 'assign-001' },
          }),
          http.get('/reviews/aggregate/all'),
        ]);
        setSubmissions(subRes.data);
        setStats(statsRes.data);
      } catch (err) {
        console.error('Failed to load submissions:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getStat = (submissionId: string) =>
    stats.find((s) => s.submissionId === submissionId);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="submission-list fade-in">
      <div className="list-header">
        <h2>作业列表</h2>
        {user && (
          <span className="user-badge">
            {user.nickname}（{isTeacher ? '导师' : '学员'}）
          </span>
        )}
      </div>

      {isTeacher && (
        <div className="ranking-section">
          <h3>评分排名</h3>
          <div className="ranking-list">
            {stats
              .sort((a, b) => b.avgRating - a.avgRating)
              .map((stat) => {
                const sub = submissions.find(
                  (s) => s.id === stat.submissionId
                );
                return (
                  <div key={stat.submissionId} className="ranking-item">
                    <span className="rank-badge">
                      {stat.rank <= 3 && (
                        <span className="medal">
                          {stat.rank === 1
                            ? '🥇'
                            : stat.rank === 2
                              ? '🥈'
                              : '🥉'}
                        </span>
                      )}
                      <span className="rank-number">#{stat.rank}</span>
                    </span>
                    <span className="rank-name">
                      {sub?.userNickname || '未知'}
                    </span>
                    <span className="avg-score">{stat.avgRating}</span>
                    <span className="review-count">
                      {stat.reviewCount}人评分
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <div className="submission-grid">
        {submissions.map((sub) => {
          const stat = getStat(sub.id);
          return (
            <div
              key={sub.id}
              className="submission-card"
              onClick={() => onSelectSubmission(sub.id)}
            >
              <div className="card-thumbnail">
                <img src={sub.imageUrl} alt={sub.title} />
              </div>
              <div className="card-info">
                <div className="card-nickname">{sub.userNickname}</div>
                <div className="card-time">{formatDate(sub.createdAt)}</div>
                {stat && stat.reviewCount > 0 && (
                  <div className="card-stats">
                    <span className="card-avg">{stat.avgRating} 分</span>
                    <span className="card-count">
                      {stat.reviewCount}人评
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {submissions.length === 0 && (
        <div className="empty-state">暂无作业提交</div>
      )}
    </div>
  );
};

export default SubmissionList;
