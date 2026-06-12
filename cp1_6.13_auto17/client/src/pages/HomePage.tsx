import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaSearch, FaArrowRight } from 'react-icons/fa';
import { useAppContext } from '@/context/AppContext';
import { Skill, SkillsResponse } from '@/types';
import SkillCard from '@/components/SkillCard';
import Modal from '@/components/Modal';
import { formatRelativeTime, getAvatarColor } from '@/utils';

const PAGE_SIZE = 12;

export default function HomePage() {
  const { currentUser, showToast } = useAppContext();
  const navigate = useNavigate();

  const [skills, setSkills] = useState<Skill[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [showPublish, setShowPublish] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);

  const [publishName, setPublishName] = useState('');
  const [publishDesc, setPublishDesc] = useState('');
  const [publishTags, setPublishTags] = useState('');

  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchSkills = useCallback(async (pageNum: number) => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/skills?page=${pageNum}&limit=${PAGE_SIZE}`);
      const data: SkillsResponse = await res.json();
      if (pageNum === 1) {
        setSkills(data.skills);
      } else {
        setSkills((prev) => [...prev, ...data.skills]);
      }
      setTotal(data.total);
      setHasMore(pageNum * PAGE_SIZE < data.total);
    } catch (err) {
      console.error('Fetch skills error:', err);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    fetchSkills(1);
  }, []);

  useEffect(() => {
    if (!sentinelRef.current) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchSkills(nextPage);
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(sentinelRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loading, page, fetchSkills]);

  const handlePublish = async () => {
    if (!currentUser) {
      showToast('请先注册登录', 'error');
      return;
    }
    if (!publishName.trim() || !publishDesc.trim() || !publishTags.trim()) {
      showToast('请填写完整的技能信息', 'error');
      return;
    }

    const tags = publishTags
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 3);

    if (tags.length === 0) {
      showToast('请至少输入一个标签', 'error');
      return;
    }

    try {
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser._id,
          name: publishName.trim(),
          description: publishDesc.trim(),
          tags,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || '发布失败', 'error');
        return;
      }

      const newSkill = await res.json();
      setSkills((prev) => [newSkill, ...prev]);
      setShowPublish(false);
      setPublishName('');
      setPublishDesc('');
      setPublishTags('');
      showToast('技能发布成功！', 'success');
    } catch (err) {
      showToast('发布失败，请重试', 'error');
    }
  };

  const handleExchange = async () => {
    if (!currentUser || !selectedSkill) return;
    if (currentUser._id === selectedSkill.userId) {
      showToast('不能和自己交换技能哦', 'error');
      return;
    }

    try {
      const res = await fetch('/api/exchanges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromUserId: currentUser._id,
          toUserId: selectedSkill.userId,
          skillId: selectedSkill._id,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || '请求失败', 'error');
        return;
      }

      setShowDetail(false);
      showToast('交换请求已发送', 'success');
    } catch (err) {
      showToast('请求失败，请重试', 'error');
    }
  };

  const handleCardClick = (skill: Skill) => {
    setSelectedSkill(skill);
    setShowDetail(true);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div style={{ paddingTop: '80px', minHeight: '100vh' }}>
      <section
        className="page-container"
        style={{
          textAlign: 'center',
          padding: '60px 24px',
          marginBottom: '20px',
        }}
      >
        <h1
          style={{
            fontSize: '36px',
            fontWeight: 800,
            marginBottom: '12px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #f472b6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          以技易技，互助成长
        </h1>
        <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '32px' }}>
          发布你擅长的技能，发现他人的才华，开启一段技能交换之旅
        </p>
        <div className="flex items-center justify-center gap-4" style={{ flexWrap: 'wrap' }}>
          <button
            className="btn-hover flex items-center gap-2"
            onClick={() => {
              document.getElementById('skills-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{
              padding: '12px 28px',
              borderRadius: '8px',
              backgroundColor: '#6366f1',
              color: 'white',
              fontSize: '15px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <FaSearch /> 浏览技能
          </button>
          {currentUser && (
            <button
              className="btn-hover flex items-center gap-2"
              onClick={() => setShowPublish(true)}
              style={{
                padding: '12px 28px',
                borderRadius: '8px',
                backgroundColor: '#8b5cf6',
                color: 'white',
                fontSize: '15px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <FaPlus /> 发布技能
            </button>
          )}
        </div>
      </section>

      <section id="skills-section" className="page-container" style={{ paddingBottom: '40px' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1f2937' }}>
            技能广场
          </h2>
          {currentUser && (
            <button
              className="btn-hover flex items-center gap-2"
              onClick={() => setShowPublish(true)}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                backgroundColor: '#6366f1',
                color: 'white',
                fontSize: '14px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <FaPlus /> 发布技能
            </button>
          )}
        </div>

        {skills.length > 0 ? (
          <div className="masonry-grid">
            {skills.map((skill, index) => (
              <div
                key={skill._id}
                className="masonry-item"
                style={{
                  animationDelay: `${(index % PAGE_SIZE) * 0.05}s`,
                  opacity: 0,
                  animation: `fadeIn 0.4s ease ${((index % PAGE_SIZE) * 0.05)}s forwards`,
                }}
              >
                <SkillCard skill={skill} onClick={handleCardClick} />
              </div>
            ))}
          </div>
        ) : !loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
            <p style={{ fontSize: '16px' }}>暂无技能，快来发布第一个吧！</p>
          </div>
        ) : null}

        <div ref={sentinelRef} style={{ height: '1px' }} />

        {loading && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div
              className="animate-pulse"
              style={{ color: '#6366f1', fontSize: '14px' }}
            >
              加载中...
            </div>
          </div>
        )}

        {!hasMore && skills.length > 0 && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#9ca3af', fontSize: '14px' }}>
            已加载全部 {total} 条技能
          </div>
        )}
      </section>

      <Modal isOpen={showPublish} onClose={() => setShowPublish(false)} width={480}>
        <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px', color: '#1f2937' }}>
          发布新技能
        </h3>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
            技能名称
          </label>
          <input
            className="input-focus"
            type="text"
            value={publishName}
            onChange={(e) => setPublishName(e.target.value)}
            placeholder="例如：Python编程"
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '14px',
              outline: 'none',
              transition: 'all 0.2s',
            }}
          />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
            技能描述
          </label>
          <textarea
            className="input-focus"
            value={publishDesc}
            onChange={(e) => setPublishDesc(e.target.value)}
            placeholder="详细描述你的技能和教学方式..."
            rows={4}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '14px',
              outline: 'none',
              resize: 'vertical',
              transition: 'all 0.2s',
            }}
          />
        </div>
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
            标签（用逗号分隔，最多3个）
          </label>
          <input
            className="input-focus"
            type="text"
            value={publishTags}
            onChange={(e) => setPublishTags(e.target.value)}
            placeholder="例如：编程,数据,后端"
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '14px',
              outline: 'none',
              transition: 'all 0.2s',
            }}
          />
        </div>
        <button
          className="btn-hover"
          onClick={handlePublish}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: '#6366f1',
            color: 'white',
            fontSize: '15px',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          发布技能
        </button>
      </Modal>

      <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} width={520}>
        {selectedSkill && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div
                className="flex items-center justify-center text-white font-semibold"
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: getAvatarColor(selectedSkill.userNickname),
                  fontSize: '20px',
                }}
              >
                {selectedSkill.userNickname.charAt(0)}
              </div>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1f2937', margin: 0 }}>
                  {selectedSkill.name}
                </h3>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                  {selectedSkill.userNickname} · {formatRelativeTime(selectedSkill.createdAt)}
                </p>
              </div>
            </div>

            <p
              style={{
                fontSize: '15px',
                lineHeight: '1.7',
                color: '#374151',
                marginBottom: '16px',
              }}
            >
              {selectedSkill.description}
            </p>

            <div className="flex flex-wrap gap-2 mb-6">
              {selectedSkill.tags.map((tag, i) => (
                <span key={i} className="skill-tag">
                  {tag}
                </span>
              ))}
            </div>

            {currentUser && currentUser._id !== selectedSkill.userId ? (
              <button
                className="btn-hover flex items-center justify-center gap-2"
                onClick={handleExchange}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '20px',
                  backgroundColor: '#6366f1',
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                发起交换 <FaArrowRight />
              </button>
            ) : currentUser && currentUser._id === selectedSkill.userId ? (
              <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                这是你自己发布的技能
              </p>
            ) : null}
          </div>
        )}
      </Modal>
    </div>
  );
}
