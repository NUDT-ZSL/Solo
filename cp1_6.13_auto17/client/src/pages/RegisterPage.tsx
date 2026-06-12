import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import { useAppContext } from '@/context/AppContext';

export default function RegisterPage() {
  const { setCurrentUser, showToast } = useAppContext();
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (nickname.length < 2 || nickname.length > 12) {
      showToast('昵称长度必须在2-12个字符之间', 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast('请输入有效的邮箱地址', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, email }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || '注册失败', 'error');
        return;
      }

      localStorage.setItem('skillswap_user', data._id);
      setCurrentUser(data);
      showToast('注册成功！', 'success');
      navigate('/');
    } catch (err) {
      showToast('注册失败，请重试', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fafafa',
        padding: '24px',
      }}
    >
      <div
        className="animate-scaleIn"
        style={{
          width: '400px',
          maxWidth: '100%',
          backgroundColor: '#fff',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            className="flex items-center justify-center text-white font-bold"
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              backgroundColor: '#6366f1',
              fontSize: '24px',
              margin: '0 auto 16px',
            }}
          >
            S
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1f2937', margin: '0 0 8px' }}>
            加入 SkillSwap
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
            注册后即可发布技能和发起交换
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '6px',
              }}
            >
              昵称
            </label>
            <input
              className="input-focus"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="2-12个字符"
              maxLength={12}
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

          <div style={{ marginBottom: '28px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '6px',
              }}
            >
              邮箱
            </label>
            <input
              className="input-focus"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
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
            className="btn-hover flex items-center justify-center gap-2"
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: submitting ? '#a5b4fc' : '#6366f1',
              color: 'white',
              fontSize: '15px',
              fontWeight: 600,
              border: 'none',
              cursor: submitting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {submitting ? '注册中...' : '注册并开始'} <FaArrowRight />
          </button>
        </form>
      </div>
    </div>
  );
}
