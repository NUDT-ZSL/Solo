import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Heart, MessageCircle, Send, Calendar, TrendingUp, Users } from 'lucide-react';
import {
  fetchProjectById,
  submitSupport,
  fetchComments,
  postComment,
  fetchThankYouLetter,
  createUser,
} from '@/api/projectApi';
import type { Project, Comment, ThankYouLetter } from '../../server/models';
import type { CommentWithUser } from '@/api/projectApi';
import ProgressBar from '@/components/ProgressBar';
import Avatar from '@/components/Avatar';
import ParticleExplosion from '@/components/ParticleExplosion';
import { useAppStore } from '@/store/useAppStore';
import {
  formatRelativeTime,
  getDaysRemaining,
  formatCurrency,
} from '@/utils/helpers';

const ProjectDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast, currentUser, setCurrentUser } = useAppStore();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showThankYouBanner, setShowThankYouBanner] = useState(true);
  const [thankYouLetter, setThankYouLetter] = useState<ThankYouLetter | null>(null);

  const [supporterName, setSupporterName] = useState('');
  const [supportAmount, setSupportAmount] = useState(100);
  const [supportMessage, setSupportMessage] = useState('');
  const [submittingSupport, setSubmittingSupport] = useState(false);

  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentsPage, setCommentsPage] = useState(1);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [newCommentId, setNewCommentId] = useState<string | null>(null);

  const [particleTrigger, setParticleTrigger] = useState(0);
  const [particlePosition, setParticlePosition] = useState({ x: 0, y: 0 });

  const commentsContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const supportButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!id) return;

    const loadProject = async () => {
      try {
        const data = await fetchProjectById(id);
        setProject(data);

        if (data.status === 'completed') {
          try {
            const letter = await fetchThankYouLetter(id);
            setThankYouLetter(letter);
          } catch {
            // Ignore if thank you letter not available
          }
        }
      } catch (error) {
        console.error('Failed to fetch project:', error);
        addToast('加载项目失败', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadProject();
    loadComments(1);
  }, [id, addToast]);

  const loadComments = async (page: number) => {
    if (!id || loadingComments) return;

    setLoadingComments(true);
    try {
      const result = await fetchComments(id, page, 20);
      if (page === 1) {
        setComments(result.comments);
      } else {
        setComments((prev) => [...prev, ...result.comments]);
      }
      setHasMoreComments(result.pagination.hasMore);
      setCommentsPage(page);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    if (!loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && hasMoreComments && !loadingComments) {
            loadComments(commentsPage + 1);
          }
        });
      },
      {
        root: commentsContainerRef.current,
        rootMargin: '100px',
        threshold: 0.1,
      }
    );

    const sentinel = loadMoreRef.current;
    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMoreComments, loadingComments, commentsPage]);

  const handleScrollFallback = useCallback(() => {
    const container = commentsContainerRef.current;
    if (!container || loadingComments || !hasMoreComments) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollTop + clientHeight >= scrollHeight - 150) {
      loadComments(commentsPage + 1);
    }
  }, [loadingComments, hasMoreComments, commentsPage]);

  useEffect(() => {
    const container = commentsContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScrollFallback, { passive: true });
      return () => container.removeEventListener('scroll', handleScrollFallback);
    }
  }, [handleScrollFallback]);

  const handleSupportClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!project || project.status === 'completed') return;

    const rect = e.currentTarget.getBoundingClientRect();
    setParticlePosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
    setParticleTrigger((prev) => prev + 1);

    setShowSupportModal(true);
  };

  const handleSubmitSupport = async () => {
    if (!project || !supporterName.trim() || supportAmount <= 0) return;

    setSubmittingSupport(true);
    try {
      const result = await submitSupport({
        projectId: project.id,
        supporterName: supporterName.trim(),
        amount: supportAmount,
        message: supportMessage.trim(),
      });

      setProject(result.project);
      setShowSupportModal(false);
      setSupporterName('');
      setSupportAmount(100);
      setSupportMessage('');
      addToast(`支持成功！感谢您的 ¥${supportAmount} 支持 🎉`);

      if (result.project.status === 'completed') {
        const letter = await fetchThankYouLetter(project.id);
        setThankYouLetter(letter);
        setShowThankYouBanner(true);
      }
    } catch (error) {
      console.error('Failed to submit support:', error);
      addToast('支持失败，请重试', 'error');
    } finally {
      setSubmittingSupport(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!project || !commentText.trim()) return;

    let user = currentUser;
    if (!user) {
      const tempName = '访客用户' + Math.floor(Math.random() * 10000);
      user = await createUser({ name: tempName });
      setCurrentUser(user);
    }

    setSubmittingComment(true);
    try {
      const newComment = await postComment({
        projectId: project.id,
        userId: user.id,
        text: commentText.trim(),
      });

      const commentWithUser: CommentWithUser = {
        ...newComment,
        user,
      };

      setComments((prev) => [commentWithUser, ...prev]);
      setNewCommentId(newComment.id);
      setCommentText('');

      setTimeout(() => setNewCommentId(null), 500);

      addToast('留言成功！');
    } catch (error) {
      console.error('Failed to post comment:', error);
      addToast('留言失败，请重试', 'error');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <div className="text-6xl mb-4">😕</div>
        <h2 className="text-2xl font-bold text-[#1f2937] mb-4">项目不存在</h2>
        <button
          onClick={() => navigate('/')}
          className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-6 py-2 rounded-lg transition-colors h-10"
        >
          返回首页
        </button>
      </div>
    );
  }

  const daysRemaining = project.endDate ? getDaysRemaining(project.endDate) : 0;
  const progressPercent = Math.min(100, (project.currentAmount / project.goalAmount) * 100);

  return (
    <div className="pb-12">
      <ParticleExplosion
        trigger={particleTrigger}
        x={particlePosition.x}
        y={particlePosition.y}
      />

      {project.status === 'completed' && showThankYouBanner && thankYouLetter && (
        <div className="bg-[#22c55e] text-white py-3 px-6 relative">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎉</span>
              <span className="font-semibold">
                众筹成功！共筹得 {formatCurrency(thankYouLetter.totalAmount)}，感谢 {thankYouLetter.supporterCount} 位支持者！
              </span>
            </div>
            <button
              onClick={() => setShowThankYouBanner(false)}
              className="hover:bg-[#dc2626] w-8 h-8 rounded flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <div className="w-full h-90 bg-gray-200 overflow-hidden" style={{ height: '360px' }}>
        {project.coverImage ? (
          <img
            src={project.coverImage}
            alt={project.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white text-5xl font-bold">{project.title.charAt(0)}</span>
          </div>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-[2rem] font-bold text-[#1f2937] mb-4">{project.title}</h1>
        <p className="text-[1rem] text-[#4b5563] mb-6 leading-relaxed">{project.description}</p>

        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-[#64748b] mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">已筹金额</span>
            </div>
            <div className="text-2xl font-bold text-[#1f2937]">
              {formatCurrency(project.currentAmount)}
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-[#64748b] mb-1">
              <Users className="w-4 h-4" />
              <span className="text-sm">完成进度</span>
            </div>
            <div className="text-2xl font-bold text-[#1f2937]">
              {progressPercent.toFixed(1)}%
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-[#64748b] mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">剩余天数</span>
            </div>
            <div className="text-2xl font-bold text-[#1f2937]">
              {daysRemaining} 天
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
          <div className="mb-6">
            <ProgressBar
              current={project.currentAmount}
              goal={project.goalAmount}
              height={24}
              showText={true}
              animate={true}
            />
          </div>

          <button
            ref={supportButtonRef}
            onClick={handleSupportClick}
            disabled={project.status === 'completed'}
            className={`w-full h-10 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
              project.status === 'completed'
                ? 'bg-[#94a3b8] cursor-not-allowed text-white'
                : 'bg-[#3b82f6] hover:bg-[#2563eb] active:bg-[#1d4ed8] text-white'
            }`}
          >
            <Heart className="w-5 h-5" />
            {project.status === 'completed' ? '众筹已结束' : '立即支持'}
          </button>
        </div>

        {thankYouLetter && (
          <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
            <h3 className="text-xl font-bold text-[#1f2937] mb-4 flex items-center gap-2">
              <span>📜</span> 感谢信
            </h3>
            <p className="text-[#4b5563] mb-4">
              感谢所有 {thankYouLetter.supporterCount} 位支持者的鼎力相助！项目已成功筹得 {formatCurrency(thankYouLetter.totalAmount)}。
            </p>
            <div className="mb-4">
              <h4 className="font-semibold text-[#1f2937] mb-2">🏆 支持者排行榜</h4>
              <div className="space-y-2">
                {thankYouLetter.ranking.slice(0, 5).map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        item.rank === 1 ? 'bg-yellow-500' :
                        item.rank === 2 ? 'bg-gray-400' :
                        item.rank === 3 ? 'bg-amber-600' : 'bg-gray-300'
                      }`}>
                        {item.rank}
                      </span>
                      <span className="text-[#1f2937]">{item.name}</span>
                    </div>
                    <span className="font-semibold text-[#3b82f6]">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-xl font-bold text-[#1f2937] flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-[#3b82f6]" />
              留言讨论 ({comments.length})
            </h3>
          </div>

          <div className="p-6 border-b border-gray-100">
            <div className="flex gap-4">
              <Avatar name={currentUser?.name || ''} size={40} />
              <div className="flex-1">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="说点什么..."
                  className="w-full border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent"
                  rows={3}
                  maxLength={500}
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-[#64748b]">{commentText.length}/500</span>
                  <button
                    onClick={handleSubmitComment}
                    disabled={!commentText.trim() || submittingComment}
                    className={`flex items-center gap-2 px-4 h-10 rounded-lg transition-colors ${
                      !commentText.trim() || submittingComment
                        ? 'bg-[#94a3b8] cursor-not-allowed text-white'
                        : 'bg-[#3b82f6] hover:bg-[#2563eb] text-white'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    {submittingComment ? '发送中...' : '发送'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div
            ref={commentsContainerRef}
            className="max-h-[500px] overflow-y-auto"
          >
            {comments.map((comment) => (
              <div
                key={comment.id}
                className={`p-6 border-b border-gray-100 last:border-b-0 ${
                  newCommentId === comment.id ? 'comment-slide-up' : ''
                }`}
              >
                <div className="flex gap-4">
                  <Avatar
                    name={comment.user?.name || '用户'}
                    avatar={comment.user?.avatar}
                    size={40}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-[#111827]">
                        {comment.user?.name || '匿名用户'}
                      </span>
                      <span className="text-sm text-[#64748b]">
                        {formatRelativeTime(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-[#374151]">{comment.text}</p>
                  </div>
                </div>
              </div>
            ))}

            {loadingComments && (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto"></div>
              </div>
            )}

            {hasMoreComments && !loadingComments && (
              <div ref={loadMoreRef} className="p-4 text-center text-[#64748b]">
                滚动加载更多...
              </div>
            )}

            {!hasMoreComments && comments.length > 0 && (
              <div className="p-4 text-center text-[#64748b] text-sm">
                没有更多留言了
              </div>
            )}

            {comments.length === 0 && !loadingComments && (
              <div className="p-12 text-center">
                <div className="text-4xl mb-2">💬</div>
                <p className="text-[#64748b]">还没有留言，来发表第一条评论吧！</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showSupportModal && (
        <div
          className="fixed inset-0 bg-[#00000080] flex items-center justify-center z-50"
          onClick={() => setShowSupportModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-[400px] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-[#1f2937]">支持项目</h3>
              <button
                onClick={() => setShowSupportModal(false)}
                className="text-[#64748b] hover:text-[#1f2937] transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2">
                  您的昵称
                </label>
                <input
                  type="text"
                  value={supporterName}
                  onChange={(e) => setSupporterName(e.target.value)}
                  placeholder="请输入您的昵称"
                  className="w-full h-10 px-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent"
                  maxLength={20}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2">
                  支持金额: <span className="text-[#3b82f6] font-bold">¥{supportAmount}</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="1000"
                  step="10"
                  value={supportAmount}
                  onChange={(e) => setSupportAmount(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#6366f1]"
                />
                <div className="flex justify-between text-xs text-[#64748b] mt-1">
                  <span>¥1</span>
                  <span>¥1000</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2">
                  留言 (可选)
                </label>
                <textarea
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  placeholder="想对发起人说的话..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent"
                  rows={3}
                  maxLength={200}
                />
                <div className="text-right text-xs text-[#64748b] mt-1">
                  {supportMessage.length}/200
                </div>
              </div>

              <button
                onClick={handleSubmitSupport}
                disabled={!supporterName.trim() || supportAmount <= 0 || submittingSupport}
                className={`w-full h-10 rounded-lg font-semibold transition-colors ${
                  !supporterName.trim() || supportAmount <= 0 || submittingSupport
                    ? 'bg-[#94a3b8] cursor-not-allowed text-white'
                    : 'bg-[#3b82f6] hover:bg-[#2563eb] active:bg-[#1d4ed8] text-white'
                }`}
              >
                {submittingSupport ? '提交中...' : `确认支持 ¥${supportAmount}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetailPage;
