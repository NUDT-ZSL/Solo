import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { User, Skill, ExchangeRequest } from '@/types';
import { formatDate, getAvatarColor, getStatusColor, getStatusText } from '@/utils';
import SkillCard from '@/components/SkillCard';

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [exchanges, setExchanges] = useState<ExchangeRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'skills' | 'exchanges'>('skills');
  const [loading, setLoading] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      try {
        const [userRes, skillsRes, exchangesRes] = await Promise.all([
          fetch(`/api/users/${userId}`),
          fetch(`/api/skills/user/${userId}`),
          fetch(`/api/exchanges?userId=${userId}`),
        ]);

        const userData = await userRes.json();
        const skillsData = await skillsRes.json();
        const exchangesData = await exchangesRes.json();

        if (userData._id) setUser(userData);
        setSkills(skillsData);
        setExchanges(exchangesData);
      } catch (err) {
        console.error('Fetch profile error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  const handleTabChange = (tab: 'skills' | 'exchanges') => {
    if (tab === activeTab) return;
    setTabVisible(false);
    setTimeout(() => {
      setActiveTab(tab);
      setTabVisible(true);
    }, 200);
  };

  if (loading) {
    return (
      <div style={{ paddingTop: '100px', textAlign: 'center', color: '#9ca3af' }}>
        加载中...
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ paddingTop: '100px', textAlign: 'center', color: '#6b7280' }}>
        用户不存在
      </div>
    );
  }

  const avatarColor = getAvatarColor(user.nickname);
  const receivedExchanges = exchanges.filter((e) => e.toUserId === userId);

  return (
    <div className="page-container" style={{ paddingTop: '100px', paddingBottom: '40px' }}>
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          marginBottom: '24px',
          textAlign: 'center',
        }}
      >
        <div
          className="flex items-center justify-center text-white font-bold"
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: avatarColor,
            fontSize: '32px',
            margin: '0 auto 16px',
          }}
        >
          {user.nickname.charAt(0)}
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1f2937', margin: '0 0 4px' }}>
          {user.nickname}
        </h2>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
          注册于 {formatDate(user.createdAt)}
        </p>
      </div>

      <div
        className="flex"
        style={{
          borderBottom: '2px solid #e5e7eb',
          marginBottom: '24px',
        }}
      >
        <button
          onClick={() => handleTabChange('skills')}
          style={{
            padding: '12px 24px',
            fontSize: '15px',
            fontWeight: activeTab === 'skills' ? 700 : 500,
            color: activeTab === 'skills' ? '#6366f1' : '#6b7280',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'skills' ? '2px solid #6366f1' : '2px solid transparent',
            cursor: 'pointer',
            marginBottom: '-2px',
            transition: 'all 0.2s',
          }}
        >
          已发布技能 ({skills.length})
        </button>
        <button
          onClick={() => handleTabChange('exchanges')}
          style={{
            padding: '12px 24px',
            fontSize: '15px',
            fontWeight: activeTab === 'exchanges' ? 700 : 500,
            color: activeTab === 'exchanges' ? '#6366f1' : '#6b7280',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'exchanges' ? '2px solid #6366f1' : '2px solid transparent',
            cursor: 'pointer',
            marginBottom: '-2px',
            transition: 'all 0.2s',
          }}
        >
          已接收交换请求 ({receivedExchanges.length})
        </button>
      </div>

      <div
        style={{
          opacity: tabVisible ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }}
      >
        {activeTab === 'skills' ? (
          skills.length > 0 ? (
            <div className="flex flex-col gap-4">
              {skills.map((skill) => (
                <SkillCard
                  key={skill._id}
                  skill={skill}
                  onClick={() => {}}
                  style={{ width: '100%' }}
                />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
              暂无已发布的技能
            </div>
          )
        ) : receivedExchanges.length > 0 ? (
          <div className="flex flex-col gap-3">
            {receivedExchanges.map((exchange) => (
              <div
                key={exchange._id}
                className="bg-white"
                style={{
                  borderRadius: '12px',
                  padding: '16px 20px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937', margin: '0 0 4px' }}>
                    {exchange.fromUser?.nickname || '用户'} 请求交换 "{exchange.skillName}"
                  </p>
                  <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
                    {formatDate(exchange.createdAt)}
                  </p>
                </div>
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#fff',
                    backgroundColor: getStatusColor(exchange.status),
                  }}
                >
                  {getStatusText(exchange.status)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
            暂无已接收的交换请求
          </div>
        )}
      </div>
    </div>
  );
}
