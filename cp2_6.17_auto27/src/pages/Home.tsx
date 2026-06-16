import React, { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Notation, ScoreNote, User } from '../types';
import { notations } from '../data/notations';
import { audioEngine } from '../utils/audioEngine';
import NotationCard from '../components/NotationCard';
import ScoreEditor from '../components/ScoreEditor';
import FingeringDemo from '../components/FingeringDemo';
import AuthModal from '../components/AuthModal';

interface HomeProps {
  user: User | null;
  onLogin: (username: string, password: string) => Promise<boolean>;
  onRegister: (username: string, password: string) => Promise<boolean>;
  onLogout: () => void;
}

const TOTAL_BARS = 8;
const NOTES_PER_BAR = 4;

const Home: React.FC<HomeProps> = ({ user, onLogin, onRegister, onLogout }) => {
  const [notes, setNotes] = useState<ScoreNote[]>([]);
  const [title, setTitle] = useState('未命名琴谱');
  const [selectedNotation, setSelectedNotation] = useState<Notation | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | '散音' | '按音' | '泛音'>('all');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>('');

  const filteredNotations = useMemo(() => {
    if (filterType === 'all') return notations;
    return notations.filter((n) => n.position === filterType);
  }, [filterType]);

  const sortedNotes = useMemo(() => {
    return [...notes].sort((a, b) => {
      if (a.bar !== b.bar) return a.bar - b.bar;
      return a.position - b.position;
    });
  }, [notes]);

  const handleDragStart = (e: React.DragEvent, notation: Notation) => {
    e.dataTransfer.setData('application/json', JSON.stringify(notation));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDropNotation = (notation: Notation, bar: number, position: number) => {
    setNotes((prev) => {
      const existing = prev.findIndex((n) => n.bar === bar && n.position === position);
      const newNote: ScoreNote = {
        id: uuidv4(),
        notationId: notation.id,
        notation,
        bar,
        position
      };

      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newNote;
        return updated;
      }

      return [...prev, newNote];
    });
  };

  const handleCardClick = (notation: Notation) => {
    setSelectedNotation(notation);
    audioEngine.resume();
    audioEngine.playNote(notation.frequency, `preview-${notation.id}`);
  };

  const handleNoteClick = (noteId: string) => {
    setSelectedNoteId(selectedNoteId === noteId ? null : noteId);
    const note = notes.find((n) => n.id === noteId);
    if (note) {
      audioEngine.resume();
      audioEngine.playNote(note.notation.frequency, noteId);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedNoteId) {
      setNotes((prev) => prev.filter((n) => n.id !== selectedNoteId));
      setSelectedNoteId(null);
    }
  };

  const handlePlay = () => {
    if (sortedNotes.length === 0 || isPlaying) return;
    audioEngine.resume();
    setIsPlaying(true);

    const freqList = sortedNotes.map((n) => ({ id: n.id, freq: n.notation.frequency }));

    audioEngine.playSequence(freqList, (id) => {
      setCurrentPlayingId(id);
    });

    const totalDuration = sortedNotes.length * 1250 + 200;
    setTimeout(() => {
      setIsPlaying(false);
      setCurrentPlayingId(null);
      audioEngine.stopAll();
    }, totalDuration);
  };

  const handleStop = () => {
    audioEngine.stopAll();
    setIsPlaying(false);
    setCurrentPlayingId(null);
  };

  const handleClearAll = () => {
    if (notes.length === 0) return;
    if (confirm('确定清空所有音符吗？')) {
      setNotes([]);
      setSelectedNoteId(null);
    }
  };

  const handleSaveScore = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    try {
      setSaveStatus('保存中...');
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          title,
          notes
        })
      });
      if (res.ok) {
        setSaveStatus('保存成功！');
        setTimeout(() => setSaveStatus(''), 2000);
      } else {
        setSaveStatus('保存失败');
        setTimeout(() => setSaveStatus(''), 2000);
      }
    } catch {
      setSaveStatus('网络错误');
      setTimeout(() => setSaveStatus(''), 2000);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#faf5ef',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <header
        style={{
          backgroundColor: 'linear-gradient(180deg, #fffdf8 0%, #faf5ef 100%)',
          background: '#fffdf8',
          padding: '14px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #e6dcd0',
          boxShadow: '0 2px 8px rgba(139,90,43,0.06)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #8b5a2b, #d4a373)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '22px',
              fontFamily: '"Ma Shan Zheng", serif',
              fontWeight: 'bold',
              boxShadow: '0 4px 12px rgba(139,90,43,0.3)'
            }}
          >
            琴
          </div>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: '22px',
                fontFamily: '"Ma Shan Zheng", serif',
                color: '#2c2a26',
                letterSpacing: '1px'
              }}
            >
              古琴减字谱
            </h1>
            <p
              style={{
                margin: '2px 0 0',
                fontSize: '11px',
                color: '#8b5a2b',
                fontFamily: '"ZCOOL XiaoWei", serif'
              }}
            >
              数字化识谱 · 乐谱生成
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {saveStatus && (
            <span
              style={{
                fontSize: '13px',
                color: saveStatus.includes('成功') ? '#27ae60' : saveStatus.includes('中') ? '#8b5a2b' : '#c0392b',
                fontFamily: '"ZCOOL XiaoWei", serif',
                marginRight: '8px'
              }}
            >
              {saveStatus}
            </span>
          )}

          {user ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  borderRadius: '20px',
                  border: '1px solid #e6dcd0',
                  backgroundColor: '#f5f0e8',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#d4a373';
                  e.currentTarget.style.filter = 'hue-rotate(-5deg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e6dcd0';
                  e.currentTarget.style.filter = 'hue-rotate(0)';
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #d4a373, #8b5a2b)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    fontFamily: '"ZCOOL XiaoWei", serif'
                  }}
                >
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span
                  style={{
                    fontSize: '13px',
                    color: '#2c2a26',
                    fontFamily: '"ZCOOL XiaoWei", serif'
                  }}
                >
                  {user.username}
                </span>
                <span style={{ fontSize: '10px', color: '#8b5a2b' }}>▼</span>
              </button>

              {showUserMenu && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    minWidth: '140px',
                    backgroundColor: '#fff',
                    borderRadius: '10px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    border: '1px solid #e6dcd0',
                    padding: '6px',
                    zIndex: 100,
                    animation: 'fadeInDown 0.2s ease'
                  }}
                >
                  <button
                    onClick={() => { setShowUserMenu(false); }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      textAlign: 'left',
                      border: 'none',
                      backgroundColor: 'transparent',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: '#2c2a26',
                      fontFamily: '"ZCOOL XiaoWei", serif',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f5f0e8'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    我的乐谱
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      textAlign: 'left',
                      border: 'none',
                      backgroundColor: 'transparent',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: '#c0392b',
                      fontFamily: '"ZCOOL XiaoWei", serif',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fdecea'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    退出登录
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button
                onClick={() => setShowAuthModal(true)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '20px',
                  border: '1px solid #8b5a2b',
                  backgroundColor: 'transparent',
                  color: '#8b5a2b',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontFamily: '"ZCOOL XiaoWei", serif',
                  fontWeight: 500,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(139,90,43,0.08)';
                  e.currentTarget.style.filter = 'hue-rotate(-10deg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.filter = 'hue-rotate(0)';
                }}
              >
                注册
              </button>
              <button
                onClick={() => setShowAuthModal(true)}
                style={{
                  padding: '8px 22px',
                  borderRadius: '20px',
                  border: 'none',
                  backgroundColor: '#8b5a2b',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontFamily: '"ZCOOL XiaoWei", serif',
                  fontWeight: 600,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#6d4520';
                  e.currentTarget.style.filter = 'hue-rotate(-10deg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#8b5a2b';
                  e.currentTarget.style.filter = 'hue-rotate(0)';
                }}
              >
                登录
              </button>
            </>
          )}
        </div>
      </header>

      <main
        className="guqin-main"
        style={{
          flex: 1,
          display: 'flex',
          gap: '20px',
          padding: '20px',
          maxWidth: '100%',
          overflow: 'hidden'
        }}
      >
        <style>{`
          .guqin-main { flex-direction: row; }
          .guqin-left-section {
            width: 40%;
            min-width: 380px;
            max-height: none;
          }
          @media (max-width: 1023px) {
            .guqin-main { flex-direction: column !important; }
            .guqin-left-section {
              width: 100% !important;
              min-width: unset !important;
              max-height: 42vh !important;
            }
          }
          @keyframes fadeInDown {
            from { opacity: 0; transform: translateY(-8px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        <section
          className="guqin-left-section"
          style={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#fffdf8',
            borderRadius: '14px',
            border: '1px solid #e6dcd0',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              padding: '16px 18px',
              borderBottom: '1px solid #f0e6d8',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: '17px',
                fontFamily: '"Ma Shan Zheng", serif',
                color: '#2c2a26'
              }}
            >
              减字谱库
              <span
                style={{
                  marginLeft: '8px',
                  fontSize: '12px',
                  color: '#8b5a2b',
                  fontFamily: '"ZCOOL XiaoWei", serif',
                  fontWeight: 'normal'
                }}
              >
                ({filteredNotations.length})
              </span>
            </h2>
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['all', '散音', '按音', '泛音'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  style={{
                    padding: '5px 10px',
                    fontSize: '11px',
                    borderRadius: '12px',
                    border: '1px solid ' + (filterType === t ? '#8b5a2b' : '#e6dcd0'),
                    backgroundColor: filterType === t ? '#8b5a2b' : '#faf5ef',
                    color: filterType === t ? '#fff' : '#5c4033',
                    cursor: 'pointer',
                    fontFamily: '"ZCOOL XiaoWei", serif',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {t === 'all' ? '全部' : t}
                </button>
              ))}
            </div>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '16px',
              alignContent: 'start'
            }}
          >
            {filteredNotations.map((notation) => (
              <NotationCard
                key={notation.id}
                notation={notation}
                onClick={handleCardClick}
                onDragStart={handleDragStart}
              />
            ))}
          </div>

          <div
            style={{
              padding: '12px 18px',
              borderTop: '1px solid #f0e6d8',
              fontSize: '11px',
              color: '#a0896b',
              fontFamily: '"ZCOOL XiaoWei", serif',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span style={{ fontSize: '14px' }}>💡</span>
            点击卡片试听并查看指法演示，拖拽卡片至右侧乐谱区进行编排
          </div>
        </section>

        <section
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            minWidth: 0
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '10px',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={isPlaying ? handleStop : handlePlay}
                disabled={sortedNotes.length === 0 && !isPlaying}
                style={{
                  padding: '9px 22px',
                  borderRadius: '20px',
                  border: 'none',
                  backgroundColor: isPlaying ? '#e74c3c' : '#8b5a2b',
                  color: '#fff',
                  cursor: sortedNotes.length === 0 && !isPlaying ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontFamily: '"ZCOOL XiaoWei", serif',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: sortedNotes.length === 0 && !isPlaying ? 0.5 : 1,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (!(sortedNotes.length === 0 && !isPlaying)) {
                    e.currentTarget.style.filter = 'hue-rotate(-10deg) brightness(0.95)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = 'hue-rotate(0) brightness(1)';
                }}
              >
                <span>{isPlaying ? '⏹' : '▶'}</span>
                {isPlaying ? '停止' : '播放'}
              </button>

              <button
                onClick={handleDeleteSelected}
                disabled={!selectedNoteId}
                style={{
                  padding: '9px 18px',
                  borderRadius: '20px',
                  border: '1px solid #d4c5a9',
                  backgroundColor: selectedNoteId ? '#faf5ef' : '#f8f6f2',
                  color: selectedNoteId ? '#c0392b' : '#b8a98f',
                  cursor: selectedNoteId ? 'pointer' : 'not-allowed',
                  fontSize: '13px',
                  fontFamily: '"ZCOOL XiaoWei", serif',
                  fontWeight: 500,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (selectedNoteId) {
                    e.currentTarget.style.backgroundColor = '#fdecea';
                    e.currentTarget.style.filter = 'hue-rotate(-5deg)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = selectedNoteId ? '#faf5ef' : '#f8f6f2';
                  e.currentTarget.style.filter = 'hue-rotate(0)';
                }}
              >
                删除选中
              </button>

              <button
                onClick={handleClearAll}
                disabled={notes.length === 0}
                style={{
                  padding: '9px 18px',
                  borderRadius: '20px',
                  border: '1px solid #d4c5a9',
                  backgroundColor: notes.length ? '#faf5ef' : '#f8f6f2',
                  color: notes.length ? '#5c4033' : '#b8a98f',
                  cursor: notes.length ? 'pointer' : 'not-allowed',
                  fontSize: '13px',
                  fontFamily: '"ZCOOL XiaoWei", serif',
                  fontWeight: 500,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (notes.length) {
                    e.currentTarget.style.backgroundColor = '#f0e6d8';
                    e.currentTarget.style.filter = 'hue-rotate(-5deg)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = notes.length ? '#faf5ef' : '#f8f6f2';
                  e.currentTarget.style.filter = 'hue-rotate(0)';
                }}
              >
                清空
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <div
                style={{
                  padding: '9px 16px',
                  borderRadius: '20px',
                  backgroundColor: 'rgba(139,90,43,0.08)',
                  fontSize: '13px',
                  color: '#8b5a2b',
                  fontFamily: '"ZCOOL XiaoWei", serif',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>🎵</span>
                {notes.length} 个音符
              </div>
              <button
                onClick={handleSaveScore}
                style={{
                  padding: '9px 22px',
                  borderRadius: '20px',
                  border: 'none',
                  backgroundColor: '#d4a373',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontFamily: '"ZCOOL XiaoWei", serif',
                  fontWeight: 600,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#b8860b';
                  e.currentTarget.style.filter = 'hue-rotate(-10deg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#d4a373';
                  e.currentTarget.style.filter = 'hue-rotate(0)';
                }}
              >
                💾 保存乐谱
              </button>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: '400px', minWidth: 0 }}>
            <ScoreEditor
              notes={notes}
              setNotes={setNotes}
              onDropNotation={handleDropNotation}
              isPlaying={isPlaying}
              currentPlayingId={currentPlayingId}
              onNoteClick={handleNoteClick}
              selectedNoteId={selectedNoteId}
              title={title}
              onTitleChange={setTitle}
            />
          </div>
        </section>
      </main>

      <FingeringDemo notation={selectedNotation} onClose={() => setSelectedNotation(null)} />
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={onLogin}
        onRegister={onRegister}
      />
    </div>
  );
};

export default Home;
