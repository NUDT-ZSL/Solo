import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import SkillCard from '../components/SkillCard'
import InviteModal from '../components/InviteModal'
import {
  Skill,
  SkillCategory,
  SkillLevel,
  SkillType,
  User,
  MatchSuggestion,
  skillCategories,
  skillLevels,
  generateMatchSuggestions
} from '../utils/matching'

const Home: React.FC = () => {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [userName, setUserName] = useState('')
  const [showRegister, setShowRegister] = useState(true)

  const [skillName, setSkillName] = useState('')
  const [skillCategory, setSkillCategory] = useState<SkillCategory>('tech')
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('beginner')
  const [skillDescription, setSkillDescription] = useState('')
  const [skillType, setSkillType] = useState<SkillType>('learn')

  const [allSkills, setAllSkills] = useState<Skill[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  const [matchModalOpen, setMatchModalOpen] = useState(false)
  const [latestMatch, setLatestMatch] = useState<MatchSuggestion | null>(null)

  const loadData = useCallback(async () => {
    try {
      const [skillsRes, usersRes] = await Promise.all([
        axios.get('/api/skills'),
        axios.get('/api/users')
      ])
      setAllSkills(skillsRes.data)
      setAllUsers(usersRes.data || [])
    } catch (err) {
      console.error('加载数据失败', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const savedUser = localStorage.getItem('skillswap_user')
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser)
        setCurrentUser(user)
        setShowRegister(false)
      } catch {}
    }
    loadData()
  }, [loadData])

  const handleRegister = async () => {
    if (!userName.trim()) return
    try {
      const res = await axios.post('/api/users/register', { name: userName.trim() })
      const user = res.data
      setCurrentUser(user)
      localStorage.setItem('skillswap_user', JSON.stringify(user))
      setShowRegister(false)
      loadData()
    } catch (err) {
      console.error('注册失败', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser || !skillName.trim()) return

    setSubmitting(true)
    const startTime = performance.now()

    try {
      await axios.post('/api/skills', {
        userId: currentUser.id,
        name: skillName.trim(),
        category: skillCategory,
        level: skillLevel,
        description: skillDescription.trim(),
        type: skillType
      })

      setSkillName('')
      setSkillDescription('')

      await loadData()

      const elapsed = performance.now() - startTime
      const waitTime = Math.max(0, 300 - elapsed)
      setTimeout(async () => {
        const { data: suggestions } = await axios.get(`/api/matches/suggest/${currentUser.id}`)
        if (suggestions && suggestions.length > 0) {
          setLatestMatch(suggestions[0])
          setMatchModalOpen(true)
        }
        setSubmitting(false)
      }, waitTime)
    } catch (err) {
      console.error('发布失败', err)
      setSubmitting(false)
    }
  }

  const handleAcceptMatch = () => {
    setMatchModalOpen(false)
    if (latestMatch) {
      navigate(`/profile/${currentUser?.id}`)
    }
  }

  const skillsToShow = allSkills.slice(0, 20)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <header style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 700,
          color: '#6366f1',
          margin: 0,
          cursor: 'pointer'
        }}>
          ✨ SkillSwap
        </h1>
        {currentUser && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
            onClick={() => navigate(`/profile/${currentUser.id}`)}
          >
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              style={{ width: '36px', height: '36px', borderRadius: '50%' }}
            />
            <span style={{ fontSize: '14px', color: '#334155', fontWeight: 500 }}>
              {currentUser.name}
            </span>
          </div>
        )}
      </header>

      {showRegister && (
        <div style={{
          maxWidth: '400px',
          margin: '60px auto',
          padding: '32px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '22px', color: '#1e293b', margin: '0 0 8px 0' }}>欢迎来到 SkillSwap</h2>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 24px 0' }}>
            技能互换，免费学习新东西
          </p>
          <input
            type="text"
            placeholder="请输入你的昵称"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '14px',
              marginBottom: '16px',
              boxSizing: 'border-box',
              outline: 'none'
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
          />
          <button
            onClick={handleRegister}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#6366f1',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
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
            开始探索
          </button>
        </div>
      )}

      {!showRegister && (
        <div style={{ display: 'flex', minHeight: 'calc(100vh - 65px)' }}>
          <div style={{
            width: '380px',
            padding: '32px 24px',
            backgroundColor: '#ffffff',
            borderRight: '1px solid #e2e8f0',
            flexShrink: 0,
            overflowY: 'auto'
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#1e293b',
              margin: '0 0 8px 0'
            }}>
              发布技能
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 24px 0' }}>
              发布你想学或能教的技能，找到志同道合的伙伴
            </p>

            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '20px',
              padding: '4px',
              backgroundColor: '#f1f5f9',
              borderRadius: '8px'
            }}>
              {[{ value: 'learn', label: '我想学' }, { value: 'teach', label: '我能教' }].map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setSkillType(tab.value as SkillType)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    backgroundColor: skillType === tab.value ? '#ffffff' : 'transparent',
                    color: skillType === tab.value ? '#6366f1' : '#64748b',
                    boxShadow: skillType === tab.value ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = 'scale(0.95)'
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = 'scale(1)'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#334155',
                  marginBottom: '6px'
                }}>
                  技能名称
                </label>
                <input
                  type="text"
                  placeholder="例如：弹吉他、做PPT、Python"
                  value={skillName}
                  onChange={(e) => setSkillName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    outline: 'none',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#6366f1'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#334155',
                  marginBottom: '6px'
                }}>
                  所属类别
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {skillCategories.map(cat => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setSkillCategory(cat.value)}
                      style={{
                        padding: '6px 12px',
                        border: `1px solid ${skillCategory === cat.value ? cat.color : '#e2e8f0'}`,
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        backgroundColor: skillCategory === cat.value ? `${cat.color}10` : '#ffffff',
                        color: skillCategory === cat.value ? cat.color : '#64748b'
                      }}
                      onMouseDown={(e) => {
                        e.currentTarget.style.transform = 'scale(0.95)'
                      }}
                      onMouseUp={(e) => {
                        e.currentTarget.style.transform = 'scale(1)'
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#334155',
                  marginBottom: '6px'
                }}>
                  难度级别
                </label>
                <select
                  value={skillLevel}
                  onChange={(e) => setSkillLevel(e.target.value as SkillLevel)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    outline: 'none',
                    backgroundColor: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  {skillLevels.map(level => (
                    <option key={level.value} value={level.value}>{level.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#334155',
                  marginBottom: '6px'
                }}>
                  描述
                  <span style={{
                    fontSize: '11px',
                    color: '#94a3b8',
                    marginLeft: '4px',
                    fontWeight: 400
                  }}>
                    ({skillDescription.length}/100)
                  </span>
                </label>
                <textarea
                  placeholder="简要描述你的技能或学习需求..."
                  value={skillDescription}
                  onChange={(e) => {
                    if (e.target.value.length <= 100) {
                      setSkillDescription(e.target.value)
                    }
                  }}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    outline: 'none',
                    resize: 'none',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#6366f1'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !skillName.trim()}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#6366f1',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: 500,
                  cursor: submitting || !skillName.trim() ? 'not-allowed' : 'pointer',
                  opacity: submitting || !skillName.trim() ? 0.6 : 1,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (!submitting && skillName.trim()) {
                    e.currentTarget.style.backgroundColor = '#4f46e5'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#6366f1'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
                onMouseDown={(e) => {
                  if (!submitting && skillName.trim()) {
                    e.currentTarget.style.transform = 'scale(0.95)'
                  }
                }}
                onMouseUp={(e) => {
                  if (!submitting && skillName.trim()) {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }
                }}
              >
                {submitting ? '发布中...' : '发布技能'}
              </button>
            </form>
          </div>

          <div style={{
            flex: 1,
            padding: '32px',
            overflowY: 'auto'
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#1e293b',
              margin: '0 0 8px 0'
            }}>
              匹配池
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 24px 0' }}>
              浏览大家发布的技能，找到你的互学伙伴
            </p>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                加载中...
              </div>
            ) : (
              <div className="skill-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, 280px)',
                gap: '20px',
                justifyContent: 'start'
              }}>
                {skillsToShow.map((skill, index) => (
                  <SkillCard
                    key={skill.id}
                    skill={skill}
                    delay={index * 50}
                    onClick={() => {}}
                  />
                ))}
              </div>
            )}

            {!loading && skillsToShow.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '60px 0',
                color: '#94a3b8',
                fontSize: '14px'
              }}>
                还没有人发布技能，快来第一个发布吧！
              </div>
            )}
          </div>
        </div>
      )}

      {latestMatch && (
        <InviteModal
          isOpen={matchModalOpen}
          onClose={() => setMatchModalOpen(false)}
          onAccept={handleAcceptMatch}
          partner={latestMatch.partner}
          skillTheyTeach={latestMatch.skillTeachMe}
          skillTheyLearn={latestMatch.skillIWant}
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
          .skill-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
          }
          .skill-card {
            width: 100% !important;
          }
          h1 {
            font-size: 18px !important;
          }
          h2 {
            font-size: 18px !important;
          }
        }
      `}</style>
    </div>
  )
}

export default Home
