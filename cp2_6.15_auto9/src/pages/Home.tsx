import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, X, Users, BookOpen, Sparkles, Inbox } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import type { Group } from '../types';

export default function Home() {
  const navigate = useNavigate();
  const { currentUser } = useAppStore();
  const [groups, setGroups] = useState<Group[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      const url = searchQuery.trim()
        ? `/api/groups?search=${encodeURIComponent(searchQuery.trim())}`
        : '/api/groups';
      const res = await fetch(url);
      const data: Group[] = await res.json();
      setGroups(data);
    } catch (e) {
      console.error('Failed to fetch groups:', e);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(fetchGroups, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchGroups]);

  const filteredGroups = groups;

  const handleCreateGroup = async () => {
    if (!currentUser || !createName.trim()) return;
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName.trim(),
          description: createDesc.trim(),
          userId: currentUser.id
        })
      });
      if (res.ok) {
        const data = await res.json();
        setShowCreateModal(false);
        setCreateName('');
        setCreateDesc('');
        navigate(`/group/${data.id}`);
      }
    } catch (e) {
      console.error('Failed to create group:', e);
    }
  };

  const handleJoinGroup = async (groupId: number) => {
    if (!currentUser) return;
    try {
      await fetch(`/api/groups/${groupId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });
      navigate(`/group/${groupId}`);
    } catch (e) {
      console.error('Failed to join group:', e);
      navigate(`/group/${groupId}`);
    }
  };

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1100px', margin: '0 auto' }}>
      <div
        style={{
          textAlign: 'center',
          marginBottom: '40px'
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1
            style={{
              margin: '0 0 12px 0',
              fontFamily: "'Playfair Display', serif",
              fontSize: '42px',
              color: '#3e2723',
              lineHeight: 1.2
            }}
          >
            发现你的书友圈子
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: '17px',
              color: '#6d4c41',
              maxWidth: '600px',
              marginLeft: 'auto',
              marginRight: 'auto',
              lineHeight: 1.6
            }}
          >
            加入志同道合的读书小组，围绕章节深度讨论，获取专属荐书
          </p>
        </motion.div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '12px',
          maxWidth: '700px',
          margin: '0 auto 40px',
          alignItems: 'center',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: '260px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '16px',
              color: '#999',
              pointerEvents: 'none'
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索小组名称或简介..."
            style={{
              width: '100%',
              padding: '14px 16px 14px 46px',
              borderRadius: '14px',
              border: '1.5px solid #e0e0e0',
              fontSize: '15px',
              outline: 'none',
              backgroundColor: 'white',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#ff7043';
              e.target.style.boxShadow = '0 0 0 3px rgba(255,112,67,0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e0e0e0';
              e.target.style.boxShadow = 'none';
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '12px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: '#999',
                display: 'flex'
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: '14px 22px',
            backgroundColor: '#ff7043',
            color: 'white',
            border: 'none',
            borderRadius: '14px',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(255,112,67,0.35)',
            whiteSpace: 'nowrap'
          }}
        >
          <Plus size={18} />
          创建小组
        </motion.button>
      </div>

      {searchQuery && (
        <div
          style={{
            textAlign: 'center',
            marginBottom: '20px',
            color: '#888',
            fontSize: '14px'
          }}
        >
          找到 <strong style={{ color: '#ff7043' }}>{filteredGroups.length}</strong> 个匹配「
          <span style={{ color: '#3e2723' }}>{searchQuery}</span>」的小组
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px', color: '#888' }}>加载中...</div>
      )}

      {!loading && filteredGroups.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            textAlign: 'center',
            padding: '60px 20px'
          }}
        >
          <div
            style={{
              width: '140px',
              height: '140px',
              margin: '0 auto 24px',
              borderRadius: '50%',
              backgroundColor: '#fff3e0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Inbox size={60} style={{ color: '#ffab91' }} />
          </div>
          <h3
            style={{
              margin: '0 0 10px 0',
              fontSize: '20px',
              color: '#5d4037',
              fontFamily: "'Playfair Display', serif"
            }}
          >
            {searchQuery ? '没有找到匹配的小组' : '还没有小组'}
          </h3>
          <p style={{ margin: 0, color: '#888', fontSize: '14px', lineHeight: 1.6 }}>
            {searchQuery
              ? '试试换个关键词搜索，或者创建一个新的小组吧'
              : '创建第一个小组，邀请书友加入吧'}
          </p>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowCreateModal(true)}
            style={{
              marginTop: '24px',
              padding: '12px 28px',
              backgroundColor: '#ff7043',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Plus size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
            创建小组
          </motion.button>
        </motion.div>
      )}

      {!loading && filteredGroups.length > 0 && (
        <div
          className="groups-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '24px',
            justifyContent: 'center'
          }}
        >
          <AnimatePresence>
            {filteredGroups.map((group, idx) => (
              <motion.div
                key={group.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                style={{
                  width: '100%',
                  maxWidth: '360px',
                  justifySelf: 'center'
                }}
              >
                <GroupCard group={group} onJoin={() => handleJoinGroup(group.id)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.45)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
            onClick={(e) => e.target === e.currentTarget && setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ duration: 0.25 }}
              style={{
                backgroundColor: 'white',
                borderRadius: '18px',
                padding: '32px',
                width: '100%',
                maxWidth: '480px',
                boxShadow: '0 16px 48px rgba(0,0,0,0.18)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '24px'
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: '24px',
                    fontFamily: "'Playfair Display', serif",
                    color: '#3e2723'
                  }}
                >
                  创建读书小组
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    color: '#666'
                  }}
                >
                  <X size={22} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                  <label
                    style={{
                      fontSize: '13px',
                      color: '#666',
                      display: 'block',
                      marginBottom: '6px',
                      fontWeight: 500
                    }}
                  >
                    小组名称 <span style={{ color: '#e53935' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="例如：科幻迷基地"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '1.5px solid #e0e0e0',
                      fontSize: '15px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#ff7043')}
                    onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')}
                  />
                </div>

                <div>
                  <label
                    style={{
                      fontSize: '13px',
                      color: '#666',
                      display: 'block',
                      marginBottom: '6px',
                      fontWeight: 500
                    }}
                  >
                    小组简介
                  </label>
                  <textarea
                    value={createDesc}
                    onChange={(e) => setCreateDesc(e.target.value)}
                    placeholder="简单介绍一下这个小组的主题和规则..."
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '1.5px solid #e0e0e0',
                      fontSize: '14px',
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#ff7043')}
                    onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '10px',
                    marginTop: '6px'
                  }}
                >
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowCreateModal(false)}
                    style={{
                      padding: '11px 22px',
                      backgroundColor: '#f5f5f5',
                      color: '#555',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    取消
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCreateGroup}
                    disabled={!createName.trim()}
                    style={{
                      padding: '11px 28px',
                      backgroundColor: createName.trim() ? '#ff7043' : '#ccc',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: createName.trim() ? 'pointer' : 'not-allowed'
                    }}
                  >
                    <Sparkles size={15} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                    创建
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 768px) {
          .groups-grid {
            grid-template-columns: 1fr !important;
          }
          h1 {
            font-size: 28px !important;
          }
        }
      `}</style>
    </div>
  );
}

function GroupCard({ group, onJoin }: { group: Group; onJoin: () => void }) {
  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        cursor: 'pointer',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        transition: 'box-shadow 0.25s, transform 0.25s'
      }}
      className="group-card"
      onClick={onJoin}
    >
      <div
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, #ff7043, #ff8a65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          marginBottom: '16px'
        }}
      >
        <BookOpen size={26} />
      </div>

      <h3
        style={{
          margin: '0 0 8px 0',
          fontSize: '19px',
          fontWeight: 600,
          color: '#3e2723',
          fontFamily: "'Playfair Display', serif"
        }}
      >
        {group.name}
      </h3>

      <p
        style={{
          margin: '0 0 20px 0',
          fontSize: '14px',
          color: '#6d4c41',
          lineHeight: 1.6,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          flex: 1
        }}
      >
        {group.description || '暂无简介'}
      </p>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '16px',
          borderTop: '1px solid #f0f0f0'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            color: '#888'
          }}
        >
          <Users size={15} />
          <span>{group.memberCount} 成员</span>
        </div>

        <motion.span
          whileHover={{ x: 3 }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#ff7043'
          }}
        >
          进入小组 →
        </motion.span>
      </div>
    </div>
  );
}
