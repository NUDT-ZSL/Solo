import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import SkillCard from '../components/SkillCard'
import InviteModal from '../components/InviteModal'
import {
  Skill,
  User,
  MatchSuggestion
} from '../utils/matching'

const Profile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()

  const [user, setUser] = useState<User | null>(null)
  const [learnSkills, setLearnSkills] = useState<Skill[]>([])
  const [teachSkills, setTeachSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)

  const [matchSuggestions, setMatchSuggestions] = useState<MatchSuggestion[]>([])
  const [showModal, setShowModal] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<MatchSuggestion | null>(null)

  useEffect(() => {
    if (!userId) return

    const loadProfile = async () => {
      try {
        const [userRes, skillsRes, matchesRes] = await Promise.all([
          axios.get(`/api/users/${userId}`),
          axios.get(`/api/users/${userId}/skills`),
          axios.get(`/api/matches/suggest/${userId}`).catch(() => ({ data: [] }))
        ])

        setUser(userRes.data)
        const skills: Skill[] = skillsRes.data
        setLearnSkills(skills.filter(s => s.type === 'learn'))
        setTeachSkills(skills.filter(s => s.type === 'teach'))
        setMatchSuggestions(matchesRes.data || [])

        if (matchesRes.data && matchesRes.data.length > 0) {
          setSelectedMatch(matchesRes.data[0])
          setShowModal(true)
        }
      } catch (err) {
        console.error('加载个人主页失败', err)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [userId])

  const handleAcceptMatch = async () => {
    if (!selectedMatch || !userId) return

    try {
      await axios.post('/api/matches', {
        userIdA: userId,
        userIdB: selectedMatch.partner.id,
        skillAId: selectedMatch.skillIWant.id,
        skillBId: selectedMatch.skillTeachThem.id
      })
      setShowModal(false)
    } catch (err) {
      console.error('接受匹配失败', err)
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#94a3b8'
      }}>
        加载中...
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#94a3b8'
      }}>
        用户不存在
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <header className="profile-header" style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'linear-gradient(to bottom, #f1f5f9, #ffffff)',
        padding: '20px 32px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '8px 16px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#64748b',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.95)'
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          ← 返回首页
        </button>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img
            src={user.avatar}
            alt={user.name}
            style={{ width: '56px', height: '56px', borderRadius: '50%', border: '3px solid #e0e7ff' }}
          />
          <div>
            <h1 style={{
              fontSize: '22px',
              fontWeight: 700,
              color: '#1e293b',
              margin: 0
            }}>
              {user.name}
            </h1>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
              SkillSwap 用户
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '24px' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '20px', fontWeight: 700, color: '#6366f1', margin: 0 }}>
              {learnSkills.length}
            </p>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0 0' }}>想学</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '20px', fontWeight: 700, color: '#16a34a', margin: 0 }}>
              {teachSkills.length}
            </p>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0 0' }}>能教</p>
          </div>
        </div>
      </header>

      {matchSuggestions.length > 0 && (
        <div style={{ padding: '24px 32px 0 32px' }}>
          <div style={{
            backgroundColor: '#e0e7ff',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px'
          }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#4f46e5', margin: '0 0 4px 0' }}>
                🎯 为你找到 {matchSuggestions.length} 个匹配伙伴
              </h3>
              <p style={{ fontSize: '13px', color: '#6366f1', margin: 0 }}>
                基于技能难度和发布时间智能匹配
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedMatch(matchSuggestions[0])
                setShowModal(true)
              }}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6366f1',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#4f46e5'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#6366f1'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.95)'
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
            >
              查看详情
            </button>
          </div>
        </div>
      )}

      <div className="profile-content" style={{
        display: 'flex',
        padding: '24px 32px 32px 32px',
        gap: '24px'
      }}>
        <div style={{ flex: 1, width: '50%' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px'
          }}>
            <div style={{
              width: '4px',
              height: '20px',
              backgroundColor: '#6366f1',
              borderRadius: '2px'
            }} />
            <h2 style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#1e293b',
              margin: 0
            }}>
              我想学
            </h2>
            <span style={{
              fontSize: '12px',
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: '#e0e7ff',
              color: '#6366f1',
              fontWeight: 500
            }}>
              {learnSkills.length}
            </span>
          </div>

          {learnSkills.length > 0 ? (
            <div className="skill-list" style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {learnSkills.map((skill, index) => (
                <SkillCard key={skill.id} skill={skill} delay={index * 50} />
              ))}
            </div>
          ) : (
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '40px 20px',
              textAlign: 'center',
              color: '#94a3b8',
              fontSize: '14px',
              border: '1px dashed #e2e8f0'
            }}>
              还没有想学的技能
              <br />
              <span style={{ fontSize: '12px' }}>去首页发布你的学习需求吧</span>
            </div>
          )}
        </div>

        <div style={{ flex: 1, width: '50%' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px'
          }}>
            <div style={{
              width: '4px',
              height: '20px',
              backgroundColor: '#22c55e',
              borderRadius: '2px'
            }} />
            <h2 style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#1e293b',
              margin: 0
            }}>
              我能教
            </h2>
            <span style={{
              fontSize: '12px',
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: '#dcfce7',
              color: '#16a34a',
              fontWeight: 500
            }}>
              {teachSkills.length}
            </span>
          </div>

          {teachSkills.length > 0 ? (
            <div className="skill-list" style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {teachSkills.map((skill, index) => (
                <SkillCard key={skill.id} skill={skill} delay={index * 50} />
              ))}
            </div>
          ) : (
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '40px 20px',
              textAlign: 'center',
              color: '#94a3b8',
              fontSize: '14px',
              border: '1px dashed #e2e8f0'
            }}>
              还没有能教的技能
              <br />
              <span style={{ fontSize: '12px' }}>分享你的技能，帮助更多人</span>
            </div>
          )}
        </div>
      </div>

      {selectedMatch && (
        <InviteModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onAccept={handleAcceptMatch}
          partner={selectedMatch.partner}
          skillTheyTeach={selectedMatch.skillTeachMe}
          skillTheyLearn={selectedMatch.skillIWant}
        />
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 768px) {
          .profile-content {
            flex-direction: column !important;
            padding: 16px !important;
          }
          .profile-content > div {
            width: 100% !important;
          }
          .profile-header {
            padding: 12px 16px !important;
            flex-wrap: wrap;
          }
          .skill-list {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
          }
          .skill-card {
            width: 100% !important;
            height: 180px !important;
          }
          h1 {
            font-size: 18px !important;
          }
          h2 {
            font-size: 16px !important;
          }
        }
      `}</style>
    </div>
  )
}

export default Profile
