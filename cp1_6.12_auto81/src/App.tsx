import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import SkillGrid from './components/SkillGrid';
import RadarChartComponent from './components/RadarChart';
import type { Member, Skill, MatchResult } from './utils/skillMatch';
import { computeMatch, computeSimilarity, getSkillColor, getScoreLabel } from './utils/skillMatch';

const SKILL_NAMES = [
  'React', 'Vue', 'Angular', 'TypeScript', 'JavaScript', 'CSS', 'HTML', 'Sass', 'Webpack',
  'Node.js', 'Express', 'Django', 'Flask', 'Spring', 'Go', 'Rust', 'Python', 'Java',
  'Docker', 'Kubernetes', 'AWS', 'GCP', 'MongoDB', 'PostgreSQL', 'Redis', 'GraphQL',
  'Figma', 'Sketch', 'Photoshop', 'Illustrator', 'UI Design', 'UX Research',
  'C++', 'C#', '.NET', 'Swift', 'Kotlin', 'Flutter', 'React Native',
];

const ROLES = [
  '前端工程师', '后端工程师', '全栈工程师', 'UI设计师', 'UX研究员',
  'DevOps工程师', '数据工程师', '移动端开发', '架构师', '技术经理',
];

const CATEGORIES: Skill['category'][] = ['frontend', 'backend', 'design'];

function generateMembers(count: number): Member[] {
  return Array.from({ length: count }, (_, i) => {
    const skillCount = 5 + Math.floor(Math.random() * 16);
    const shuffled = [...SKILL_NAMES].sort(() => Math.random() - 0.5);
    const skills: Skill[] = shuffled.slice(0, skillCount).map((name) => ({
      name,
      score: 1 + Math.floor(Math.random() * 5),
      category: name.match(/React|Vue|Angular|TypeScript|JavaScript|CSS|HTML|Sass|Webpack|Flutter|React Native/)
        ? 'frontend'
        : name.match(/Figma|Sketch|Photoshop|Illustrator|UI Design|UX Research/)
        ? 'design'
        : 'backend',
    }));

    return {
      id: `member-${i}`,
      name: `成员${i + 1}`,
      role: ROLES[Math.floor(Math.random() * ROLES.length)],
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`,
      skills,
    };
  });
}

const initialMembers = generateMembers(50);

interface ToastItem {
  id: number;
  message: string;
}

const App: React.FC = () => {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [compareMember, setCompareMember] = useState<Member | null>(null);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [matchInput, setMatchInput] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillScore, setNewSkillScore] = useState(3);
  const [newSkillCategory, setNewSkillCategory] = useState<Skill['category']>('frontend');
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [previousOrder, setPreviousOrder] = useState<string[]>([]);
  const [similarity, setSimilarity] = useState<number | null>(null);
  const [showCompareSelect, setShowCompareSelect] = useState(false);

  const toastIdRef = useRef(0);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const addToast = useCallback((message: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  }, []);

  const handleCardClick = useCallback((member: Member) => {
    setSelectedMember(member);
    setCompareMember(null);
    setSimilarity(null);
    setShowCompareSelect(false);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedMember(null);
    setCompareMember(null);
    setSimilarity(null);
    setShowCompareSelect(false);
  }, []);

  const handleCompare = useCallback(
    (memberId: string) => {
      const found = members.find((m) => m.id === memberId);
      if (found && selectedMember) {
        setCompareMember(found);
        const sim = computeSimilarity(selectedMember.skills, found.skills);
        setSimilarity(sim);
      }
      setShowCompareSelect(false);
    },
    [members, selectedMember]
  );

  const handleMatch = useCallback(() => {
    const keywords = matchInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (keywords.length === 0) {
      setMatchResults([]);
      return;
    }

    setPreviousOrder(members.map((m) => m.id));
    const results = computeMatch(keywords, members);
    setMatchResults(results);

    const sorted = [...members].sort((a, b) => {
      const aMatch = results.find((r) => r.memberId === a.id)?.matchPercent ?? 0;
      const bMatch = results.find((r) => r.memberId === b.id)?.matchPercent ?? 0;
      return bMatch - aMatch;
    });
    setMembers(sorted);
  }, [matchInput, members]);

  const handleAddSkill = useCallback(() => {
    if (!selectedMember || !newSkillName.trim()) return;

    const newSkill: Skill = {
      name: newSkillName.trim(),
      score: newSkillScore,
      category: newSkillCategory,
    };

    setMembers((prev) =>
      prev.map((m) =>
        m.id === selectedMember.id
          ? { ...m, skills: [newSkill, ...m.skills] }
          : m
      )
    );

    setSelectedMember((prev) =>
      prev ? { ...prev, skills: [newSkill, ...prev.skills] } : prev
    );

    setShowModal(false);
    setNewSkillName('');
    setNewSkillScore(3);

    setTimeout(() => {
      addToast('更新成功');
    }, 300);
  }, [selectedMember, newSkillName, newSkillScore, newSkillCategory, addToast]);

  const otherMembers = useMemo(() => {
    if (!selectedMember) return [];
    return members.filter((m) => m.id !== selectedMember.id);
  }, [members, selectedMember]);

  const panelStyle = useMemo((): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'fixed',
      top: 0,
      right: 0,
      height: '100vh',
      background: '#16213e',
      zIndex: 1000,
      overflowY: 'auto',
      boxShadow: '-4px 0 30px rgba(0,0,0,0.5)',
      transition: 'transform 250ms ease-out',
    };

    if (isMobile) {
      return { ...base, width: '100vw' };
    }
    return { ...base, width: 350 };
  }, [isMobile]);

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: '#1a1a2e',
        color: '#e0e0e0',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: 'rgba(26, 26, 46, 0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(138, 43, 226, 0.2)',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <h1
          style={{
            fontSize: 20,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #4dabf7, #cc5de8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginRight: 16,
          }}
        >
          SkillRoster
        </h1>

        <div style={{ display: 'flex', gap: 8, flex: 1, minWidth: 200 }}>
          <input
            type="text"
            value={matchInput}
            onChange={(e) => setMatchInput(e.target.value)}
            placeholder="输入技能关键词（逗号分隔，如 React, Node.js, Docker）"
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(138, 43, 226, 0.3)',
              borderRadius: 8,
              padding: '8px 14px',
              color: '#e0e0e0',
              fontSize: 13,
              outline: 'none',
              minWidth: 180,
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleMatch()}
          />
          <button
            onClick={handleMatch}
            style={{
              background: 'linear-gradient(135deg, #4dabf7, #cc5de8)',
              border: 'none',
              borderRadius: 8,
              padding: '8px 20px',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'transform 0.15s ease',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
          >
            匹配
          </button>
          {matchResults.length > 0 && (
            <button
              onClick={() => {
                setMatchResults([]);
                setMatchInput('');
                setMembers(initialMembers);
              }}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8,
                padding: '8px 14px',
                color: '#e0e0e0',
                cursor: 'pointer',
                transition: 'transform 0.15s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
              }}
            >
              重置
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, paddingTop: 64, height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
        <SkillGrid
          members={members}
          matchResults={matchResults}
          onCardClick={handleCardClick}
          previousOrder={previousOrder}
        />
      </div>

      <AnimatePresence>
        {selectedMember && (
          <motion.div
            key="panel"
            initial={{ transform: 'translateX(100%)' }}
            animate={{ transform: 'translateX(0)' }}
            exit={{ transform: 'translateX(100%)' }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            style={panelStyle}
          >
            <div style={{ padding: 24 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 20,
                }}
              >
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e0e0e0' }}>
                  {selectedMember.name}
                </h2>
                <button
                  onClick={handleClosePanel}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: 8,
                    width: 32,
                    height: 32,
                    color: '#e0e0e0',
                    fontSize: 18,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                  }}
                >
                  ✕
                </button>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <img
                  src={selectedMember.avatar}
                  alt={selectedMember.name}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    border: '2px solid #ccc',
                  }}
                />
                <div>
                  <div style={{ fontSize: 14, color: '#a0a0c0' }}>{selectedMember.role}</div>
                  <div style={{ fontSize: 12, color: '#707090' }}>
                    {selectedMember.skills.length} 项技能
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600 }}>技能雷达图</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setShowCompareSelect(!showCompareSelect)}
                      style={{
                        background: compareMember
                          ? 'linear-gradient(135deg, #ff6b6b, #cc5de8)'
                          : 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(138, 43, 226, 0.3)',
                        borderRadius: 6,
                        padding: '4px 12px',
                        color: '#e0e0e0',
                        fontSize: 12,
                        cursor: 'pointer',
                        transition: 'transform 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                      }}
                    >
                      {compareMember ? '切换对比' : '对比'}
                    </button>
                    {compareMember && (
                      <button
                        onClick={() => {
                          setCompareMember(null);
                          setSimilarity(null);
                        }}
                        style={{
                          background: 'rgba(255,255,255,0.1)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: 6,
                          padding: '4px 12px',
                          color: '#e0e0e0',
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        取消
                      </button>
                    )}
                  </div>
                </div>

                {showCompareSelect && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ marginBottom: 8 }}
                  >
                    <select
                      onChange={(e) => {
                        if (e.target.value) handleCompare(e.target.value);
                      }}
                      defaultValue=""
                      style={{
                        width: '100%',
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(138, 43, 226, 0.3)',
                        borderRadius: 6,
                        padding: '8px 10px',
                        color: '#e0e0e0',
                        fontSize: 13,
                        outline: 'none',
                      }}
                    >
                      <option value="" disabled>
                        选择对比成员...
                      </option>
                      {otherMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} - {m.role}
                        </option>
                      ))}
                    </select>
                  </motion.div>
                )}

                <RadarChartComponent
                  skills={selectedMember.skills}
                  compareSkills={compareMember?.skills ?? null}
                  compareName={compareMember?.name}
                  memberName={selectedMember.name}
                />

                {similarity !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      textAlign: 'center',
                      padding: '8px 0',
                      fontSize: 14,
                      color: similarity >= 70 ? '#51cf66' : similarity >= 40 ? '#ff922b' : '#ff4757',
                      fontWeight: 600,
                    }}
                  >
                    匹配度: {similarity}%
                  </motion.div>
                )}
              </div>

              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600 }}>技能列表</span>
                  <button
                    onClick={() => setShowModal(true)}
                    style={{
                      background: 'linear-gradient(135deg, #4dabf7, #cc5de8)',
                      border: 'none',
                      borderRadius: 6,
                      padding: '4px 12px',
                      color: '#fff',
                      fontSize: 12,
                      cursor: 'pointer',
                      transition: 'transform 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                    }}
                  >
                    + 新增技能
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <AnimatePresence mode="popLayout">
                    {selectedMember.skills.slice(0, 20).map((skill, idx) => (
                      <motion.div
                        key={`${skill.name}-${idx}`}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.25, delay: idx === 0 ? 0.05 : 0 }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '6px 10px',
                          background: 'rgba(255,255,255,0.04)',
                          borderRadius: 6,
                          fontSize: 13,
                        }}
                      >
                        <span
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            background: getSkillColor(skill.category),
                            display: 'inline-block',
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ flex: 1 }}>{skill.name}</span>
                        <span
                          style={{
                            fontSize: 11,
                            color: '#a0a0c0',
                            background: 'rgba(255,255,255,0.08)',
                            padding: '2px 6px',
                            borderRadius: 4,
                          }}
                        >
                          {skill.score}/5 {getScoreLabel(skill.score)}
                        </span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && (
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(8px)',
              zIndex: 2000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <motion.div
              key="modal-content"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'rgba(22, 33, 62, 0.95)',
                backdropFilter: 'blur(16px)',
                borderRadius: 12,
                padding: 28,
                width: 360,
                maxWidth: '90vw',
                border: '1px solid rgba(138, 43, 226, 0.3)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              }}
            >
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  marginBottom: 20,
                  color: '#e0e0e0',
                }}
              >
                新增技能
              </h3>

              <div style={{ marginBottom: 16 }}>
                <label
                  style={{ fontSize: 12, color: '#a0a0c0', display: 'block', marginBottom: 6 }}
                >
                  技能名称
                </label>
                <input
                  type="text"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  placeholder="如 React, Python..."
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(138, 43, 226, 0.3)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    color: '#e0e0e0',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label
                  style={{ fontSize: 12, color: '#a0a0c0', display: 'block', marginBottom: 6 }}
                >
                  自评等级: {newSkillScore}/5
                </label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={newSkillScore}
                  onChange={(e) => setNewSkillScore(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#4dabf7' }}
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 11,
                    color: '#707090',
                    marginTop: 4,
                  }}
                >
                  <span>了解</span>
                  <span>熟练</span>
                  <span>精通</span>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label
                  style={{ fontSize: 12, color: '#a0a0c0', display: 'block', marginBottom: 6 }}
                >
                  技能类别
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['frontend', 'backend', 'design'] as const).map((cat) => {
                    const labels = { frontend: '前端', backend: '后端', design: '设计' };
                    const colors = { frontend: '#4dabf7', backend: '#51cf66', design: '#cc5de8' };
                    return (
                      <button
                        key={cat}
                        onClick={() => setNewSkillCategory(cat)}
                        style={{
                          flex: 1,
                          padding: '8px 0',
                          background:
                            newSkillCategory === cat
                              ? colors[cat]
                              : 'rgba(255,255,255,0.08)',
                          border:
                            newSkillCategory === cat
                              ? 'none'
                              : '1px solid rgba(255,255,255,0.15)',
                          borderRadius: 6,
                          color: '#fff',
                          fontSize: 12,
                          cursor: 'pointer',
                          fontWeight: newSkillCategory === cat ? 600 : 400,
                          transition: 'transform 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                        }}
                      >
                        {labels[cat]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 8,
                    color: '#e0e0e0',
                    cursor: 'pointer',
                    fontSize: 13,
                    transition: 'transform 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleAddSkill}
                  disabled={!newSkillName.trim()}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    background: newSkillName.trim()
                      ? 'linear-gradient(135deg, #4dabf7, #cc5de8)'
                      : 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: 8,
                    color: '#fff',
                    cursor: newSkillName.trim() ? 'pointer' : 'not-allowed',
                    fontWeight: 600,
                    fontSize: 13,
                    transition: 'transform 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (newSkillName.trim())
                      (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                  }}
                >
                  提交
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        style={{
          position: 'fixed',
          top: 60,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 3000,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              style={{
                background: '#51cf66',
                color: '#1a1a2e',
                padding: '10px 24px',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 14,
                boxShadow: '0 4px 20px rgba(81, 207, 102, 0.4)',
                pointerEvents: 'auto',
              }}
            >
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default App;
