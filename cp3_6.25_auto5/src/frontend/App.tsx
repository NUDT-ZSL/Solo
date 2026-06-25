import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import WaveformPlayer from './components/WaveformPlayer';
import TranscriptViewer from './components/TranscriptViewer';
import CommentModal from './components/CommentModal';
import CreateProgramModal from './components/CreateProgramModal';
import * as api from './utils/api';

interface Chapter {
  id: string;
  startTime: number;
  endTime: number;
  title: string;
  description: string;
  colorIndex: number;
}

interface Comment {
  id: string;
  chapterId: string;
  text: string;
  emoji: string;
  timestamp: string;
}

interface Program {
  id: string;
  title: string;
  coverUrl: string;
  audioUrl: string;
  duration: number;
  chapters: Chapter[];
  comments: Comment[];
  playCount: number;
  createdAt: string;
  transcript: string;
  transcriptTimestamps: { time: number; text: string }[];
}

function getChapterColor(index: number): string {
  const hue = (index * 47 + 200) % 360;
  return `hsl(${hue}, 70%, 55%)`;
}

function Toast({ message }: { message: string }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        height: 40,
        borderRadius: 8,
        background: '#4caf50',
        color: '#fff',
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
        zIndex: 9999,
        whiteSpace: 'nowrap',
        animation: 'toastFade 2s ease forwards',
      }}
    >
      {message}
      <style>{`
        @keyframes toastFade {
          0% { opacity: 1; }
          70% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

const Home: React.FC = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get<Program[]>('/programs').then(setPrograms).catch(console.error);
  }, []);

  const handleCreate = (program: Program) => {
    setPrograms((prev) => [...prev, program]);
    setShowCreateModal(false);
    navigate(`/program/${program.id}`);
  };

  return (
    <div style={{ padding: 32 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <h1 style={{ color: '#e0e0e0', fontSize: 24, fontWeight: 600 }}>
          播客节目管理
        </h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: 'none',
              background: '#42a5f5',
              color: '#fff',
              fontSize: 14,
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
            }}
          >
            + 创建节目
          </button>
          <Link
            to="/dashboard"
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: '1px solid #42a5f5',
              background: 'transparent',
              color: '#42a5f5',
              fontSize: 14,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            统计看板
          </Link>
        </div>
      </div>
      {programs.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: 60,
            color: '#888',
          }}
        >
          <p style={{ fontSize: 48, marginBottom: 16 }}>🎙️</p>
          <p>还没有播客节目，点击上方按钮创建你的第一个节目</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {programs.map((p) => (
            <div
              key={p.id}
              onClick={() => navigate(`/program/${p.id}`)}
              style={{
                background: '#1e1e1e',
                borderRadius: 12,
                padding: 16,
                border: '1px solid #333',
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform =
                  'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform =
                  'translateY(0)';
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: 160,
                  borderRadius: 16,
                  border: '2px solid #333',
                  background: '#2a2a2a',
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {p.coverUrl ? (
                  <img
                    src={p.coverUrl}
                    alt={p.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <span style={{ fontSize: 48 }}>🎙️</span>
                )}
              </div>
              <h3
                style={{
                  color: '#e0e0e0',
                  marginBottom: 4,
                  fontSize: 16,
                }}
              >
                {p.title}
              </h3>
              <div style={{ color: '#888', fontSize: 12 }}>
                {p.chapters.length} 章节 · {p.comments?.length || 0} 评论 ·{' '}
                {p.playCount || 0} 播放
              </div>
            </div>
          ))}
        </div>
      )}
      <CreateProgramModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleCreate}
      />
    </div>
  );
};

const ProgramDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [program, setProgram] = useState<Program | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [highlightedSegment, setHighlightedSegment] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [commentModal, setCommentModal] = useState<{
    visible: boolean;
    chapterId: string;
    chapterTitle: string;
  }>({ visible: false, chapterId: '', chapterTitle: '' });
  const [toast, setToast] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const loadProgram = useCallback(() => {
    if (!id) return;
    api
      .get<Program>(`/programs/${id}`)
      .then(setProgram)
      .catch(console.error);
  }, [id]);

  useEffect(() => {
    loadProgram();
  }, [loadProgram]);

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handleSeek = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handleChapterClick = useCallback(
    (chapter: Chapter) => {
      setHighlightedSegment({
        start: chapter.startTime,
        end: chapter.endTime,
      });
      setCommentModal({
        visible: true,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
      });
    },
    []
  );

  const handleAddChapter = useCallback(
    async (startTime: number, endTime: number) => {
      if (!id) return;
      const title = prompt('请输入章节标题:');
      if (!title) return;
      const description = prompt('请输入章节描述（可选）:') || '';
      await api.post(`/programs/${id}/chapters`, {
        startTime,
        endTime,
        title,
        description,
      });
      loadProgram();
    },
    [id, loadProgram]
  );

  const handleTranscriptTimeClick = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handleTranscriptChange = useCallback(
    async (text: string) => {
      if (!id || !program) return;
      await api.put(`/programs/${id}/transcript`, {
        transcript: text,
        transcriptTimestamps: program.transcriptTimestamps,
      });
    },
    [id, program]
  );

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  const handleCommentSubmit = () => {
    setCommentModal({ visible: false, chapterId: '', chapterTitle: '' });
    loadProgram();
    showToast('评论提交成功');
  };

  if (!program) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
        加载中...
      </div>
    );
  }

  const chapterList = (
    <div>
      <div
        style={{
          width: 200,
          height: 200,
          borderRadius: 16,
          border: '2px solid #333',
          background: '#2a2a2a',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {program.coverUrl ? (
          <img
            src={program.coverUrl}
            alt={program.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ fontSize: 64 }}>🎙️</span>
        )}
      </div>
      <h2
        style={{
          color: '#e0e0e0',
          fontSize: 18,
          fontWeight: 600,
          marginBottom: 16,
        }}
      >
        {program.title}
      </h2>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {(program.chapters || []).slice(0, 300).map((ch, i) => (
          <div
            key={ch.id}
            onClick={() => handleChapterClick(ch)}
            style={{
              width: '100%',
              height: 60,
              borderRadius: 12,
              background: '#1e1e1e',
              borderLeft: `4px solid ${getChapterColor(i)}`,
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform =
                'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform =
                'translateY(0)';
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: getChapterColor(i),
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div
                style={{
                  color: '#e0e0e0',
                  fontSize: 14,
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {ch.title}
              </div>
              <div style={{ color: '#888', fontSize: 12 }}>
                {formatTime(ch.startTime)} - {formatTime(ch.endTime)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div
        className="mobile-header"
        style={{
          display: 'none',
          height: 56,
          background: '#1e1e1e',
          alignItems: 'center',
          padding: '0 16px',
          borderBottom: '1px solid #333',
        }}
      >
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          style={{
            background: 'none',
            border: 'none',
            color: '#e0e0e0',
            fontSize: 24,
            cursor: 'pointer',
          }}
        >
          ☰
        </button>
        <span
          style={{
            marginLeft: 16,
            color: '#e0e0e0',
            fontSize: 16,
            fontWeight: 500,
          }}
        >
          {program.title}
        </span>
      </div>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div
          className="sidebar"
          style={{
            width: 280,
            flexShrink: 0,
            background: '#1a1a1a',
            padding: 24,
            overflowY: 'auto',
            borderRight: '1px solid #333',
          }}
        >
          {chapterList}
        </div>
        <div
          className="main-content"
          style={{
            flex: 1,
            padding: 24,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          <WaveformPlayer
            audioUrl={program.audioUrl}
            duration={program.duration || 300}
            chapters={program.chapters || []}
            onTimeUpdate={handleTimeUpdate}
            onSeek={handleSeek}
            onChapterClick={handleChapterClick}
            onAddChapter={handleAddChapter}
            highlightedSegment={highlightedSegment}
          />
          <div>
            <h3
              style={{
                color: '#e0e0e0',
                marginBottom: 12,
                fontSize: 16,
              }}
            >
              转录稿
            </h3>
            <TranscriptViewer
              transcript={program.transcript || ''}
              timestamps={program.transcriptTimestamps || []}
              currentTime={currentTime}
              onTimeClick={handleTranscriptTimeClick}
              onTranscriptChange={handleTranscriptChange}
            />
          </div>
        </div>
      </div>
      <CommentModal
        visible={commentModal.visible}
        programId={id || ''}
        chapterId={commentModal.chapterId}
        chapterTitle={commentModal.chapterTitle}
        onClose={() =>
          setCommentModal({ visible: false, chapterId: '', chapterTitle: '' })
        }
        onSubmit={handleCommentSubmit}
      />
      {toast && <Toast message={toast} />}
      {isMobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 999,
          }}
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            style={{
              width: 280,
              height: '100%',
              background: '#1a1a1a',
              padding: 24,
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {chapterList}
          </div>
        </div>
      )}
      <style>{`
        @media (max-width: 768px) {
          .mobile-header {
            display: flex !important;
          }
          .sidebar {
            display: none !important;
          }
          .main-content {
            padding: 16px !important;
          }
        }
      `}</style>
    </div>
  );
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export { Home, ProgramDetail };
