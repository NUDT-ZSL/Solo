import { useEffect, useState, useRef, useCallback } from 'react';
import { useEmotion } from '@/store/emotionReducer';
import TrajectoryTimeline from '@/components/TrajectoryTimeline';
import EmotionModal from '@/components/EmotionModal';
import DetailCard from '@/components/DetailCard';
import TrajectoryCard from '@/components/TrajectoryCard';
import ShareModal from '@/components/ShareModal';
import { Send, Plus, User } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
  const {
    state,
    dispatch,
    fetchTrajectories,
    createRecord,
    updateRecord,
    deleteRecord,
    addEcho,
    showToast,
  } = useEmotion();

  const { records, echoes, selectedRecord, modalOpen, editingRecord, shareModalOpen, toastMessage, toastVisible } = state;
  const [detailPos, setDetailPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [shareCardView, setShareCardView] = useState(false);
  const shareBlobRef = useRef<Blob | null>(null);

  useEffect(() => {
    fetchTrajectories();
  }, [fetchTrajectories]);

  const handleDotClick = (record: typeof records[0], pos: { x: number; y: number }) => {
    dispatch({ type: 'SET_SELECTED_RECORD', payload: record });
    setDetailPos(pos);
  };

  const handleEmptyClick = () => {
    dispatch({ type: 'SET_EDITING_RECORD', payload: null });
    dispatch({ type: 'SET_MODAL_OPEN', payload: true });
  };

  const handleSave = async (data: { color: string; text: string; intensity: number; date: string }) => {
    if (editingRecord) {
      await updateRecord(editingRecord.id, data);
    } else {
      await createRecord(data);
    }
    dispatch({ type: 'SET_MODAL_OPEN', payload: false });
    dispatch({ type: 'SET_EDITING_RECORD', payload: null });
  };

  const handleEdit = (record: typeof records[0]) => {
    dispatch({ type: 'SET_EDITING_RECORD', payload: record });
    dispatch({ type: 'SET_MODAL_OPEN', payload: true });
    dispatch({ type: 'SET_SELECTED_RECORD', payload: null });
  };

  const handleDelete = async (id: string) => {
    await deleteRecord(id);
  };

  const handleDrag = async (record: typeof records[0], newPos: { x: number; y: number }) => {
    await updateRecord(record.id, { position: newPos });
  };

  const handleShare = () => {
    shareBlobRef.current = null;
    setShareCardView(true);
  };

  const handleBlobReady = useCallback((blob: Blob | null) => {
    shareBlobRef.current = blob;
  }, []);

  const handleCopyShare = async () => {
    setTimeout(async () => {
      try {
        const res = await fetch('/api/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 'user_default' }),
        });
        const data = await res.json();
        const url = `${window.location.origin}/share/${data.shareId}`;
        await navigator.clipboard.writeText(url);
        showToast('链接已复制！');
      } catch {
        showToast('复制失败');
      }
      setShareCardView(false);
      dispatch({ type: 'SET_SHARE_MODAL_OPEN', payload: false });
    }, 300);
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #FADDC6 0%, #E8D0F0 100%)',
        minHeight: '100vh',
      }}
    >
      <div className="relative z-10 min-h-screen flex flex-col" style={{ willChange: 'transform', transform: 'translateZ(0)' }}>
        <header className="flex items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold text-white/90 tracking-wide" style={{ willChange: 'transform', transform: 'translateZ(0)' }}>情绪轨迹图</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={handleShare}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
              style={{
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                willChange: 'transform',
                transform: 'translateZ(0)',
              }}
            >
              <Send size={16} className="text-white/80" />
            </button>
            <Link
              to="/profile"
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
              style={{
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                willChange: 'transform',
                transform: 'translateZ(0)',
              }}
            >
              <User size={16} className="text-white/80" />
            </Link>
          </div>
        </header>

        <div className="flex-1 flex flex-col justify-center px-4 gap-6">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-white/90 mb-1">你的情绪河流</h2>
            <p className="text-sm text-white/60">每一个圆点，都是你认真生活的一天</p>
          </div>

          <TrajectoryTimeline
            records={records}
            echoes={echoes}
            onDotClick={handleDotClick}
            onDotDrag={handleDrag}
            onEmptyClick={handleEmptyClick}
          />

          <div className="text-center">
            <p className="text-xs text-white/40">点击圆点查看详情 · 点击空白处记录心情 · 拖拽圆点调整位置</p>
          </div>
        </div>

        <button
          onClick={() => {
            dispatch({ type: 'SET_EDITING_RECORD', payload: null });
            dispatch({ type: 'SET_MODAL_OPEN', payload: true });
          }}
          className="fixed bottom-8 right-8 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 z-40"
          style={{
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            background: 'rgba(255,255,255,0.25)',
            border: '1px solid rgba(255,255,255,0.35)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            willChange: 'transform',
            transform: 'translateZ(0)',
          }}
        >
          <Plus size={24} className="text-white/80" />
        </button>
      </div>

      <EmotionModal
        open={modalOpen}
        editingRecord={editingRecord}
        onClose={() => {
          dispatch({ type: 'SET_MODAL_OPEN', payload: false });
          dispatch({ type: 'SET_EDITING_RECORD', payload: null });
        }}
        onSave={handleSave}
      />

      {selectedRecord && (
        <DetailCard
          record={selectedRecord}
          position={detailPos}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onClose={() => dispatch({ type: 'SET_SELECTED_RECORD', payload: null })}
        />
      )}

      {shareCardView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShareCardView(false)}>
          <div className="absolute inset-0 bg-black/40" style={{ backdropFilter: 'blur(4px)' }} />
          <div className="relative z-10 flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <TrajectoryCard records={records} onBlobReady={handleBlobReady} />
            <div className="flex justify-center mt-4 gap-3">
              <button
                onClick={() => setShareCardView(false)}
                className="px-6 py-2 rounded-xl text-white/70 font-medium transition-all duration-300 hover:bg-white/10"
                style={{ border: '1px solid rgba(255,255,255,0.2)' }}
              >
                关闭
              </button>
              <button
                onClick={handleCopyShare}
                className="px-8 py-2 rounded-xl text-white font-medium transition-all duration-300 hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #FF8E53, #7C6EF6)',
                  boxShadow: '0 4px 15px rgba(124,110,246,0.3)',
                }}
              >
                复制分享链接
              </button>
            </div>
          </div>
        </div>
      )}

      <ShareModal
        open={shareModalOpen && !shareCardView}
        records={records}
        echoes={echoes}
        onClose={() => dispatch({ type: 'SET_SHARE_MODAL_OPEN', payload: false })}
        onAddEcho={async (echo) => {
          await addEcho(echo);
        }}
      />

      <div
        className="fixed bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 text-sm text-white font-medium transition-all duration-500 z-50"
        style={{
          background: '#4CAF50',
          borderRadius: '8px',
          opacity: toastVisible ? 1 : 0,
          transform: toastVisible ? 'translate(-50%, 0)' : 'translate(-50%, 10px)',
          pointerEvents: toastVisible ? 'auto' : 'none',
          willChange: 'opacity, transform',
        }}
      >
        {toastMessage}
      </div>
    </div>
  );
}
