import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getPhotoDetail, addComment } from '../api';
import type { PhotoDetail, Comment } from '../types';
import type { DrawResult, FaceBoxDrawData } from '../workers/faceBox.worker';

interface DetailPageProps {
  onUpdate: (photo: PhotoDetail) => void;
}

export default function DetailPage({ onUpdate }: DetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [photo, setPhoto] = useState<PhotoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const drawDataRef = useRef<DrawResult | null>(null);

  useEffect(() => {
    if (id) {
      loadPhoto(id);
    }
  }, [id]);

  const loadPhoto = async (photoId: string) => {
    try {
      setLoading(true);
      const data = await getPhotoDetail(photoId);
      setPhoto(data);
      onUpdate(data);
    } finally {
      setLoading(false);
    }
  };

  const drawFaceBox = useCallback(() => {
    if (!photo || !canvasRef.current || !imageLoaded || !photo.faceBox) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!container) return;

    const img = container.querySelector('img');
    if (!img) return;

    canvas.width = img.clientWidth;
    canvas.height = img.clientHeight;

    const scaleX = img.clientWidth / photo.width;
    const scaleY = img.clientHeight / photo.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#f5c518';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);

    const x = photo.faceBox.x * scaleX;
    const y = photo.faceBox.y * scaleY;
    const w = photo.faceBox.width * scaleX;
    const h = photo.faceBox.height * scaleY;

    ctx.strokeRect(x, y, w, h);

    ctx.setLineDash([]);
    ctx.fillStyle = '#f5c518';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`😊 ${photo.score}分`, x, y - 8);
  }, [photo, imageLoaded]);

  useEffect(() => {
    drawFaceBox();
    const handleResize = () => drawFaceBox();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawFaceBox]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !photo || submitting) return;

    setSubmitting(true);
    try {
      const newComment = await addComment(photo.id, comment.trim());
      setPhoto((prev) =>
        prev
          ? {
              ...prev,
              comments: [newComment, ...prev.comments],
            }
          : prev
      );
      setComment('');
    } finally {
      setSubmitting(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#f5c518';
    if (score >= 60) return '#52c41a';
    return '#ff4d4f';
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN');
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{ fontSize: 64 }}
        >
          ⏳
        </motion.div>
      </div>
    );
  }

  if (!photo) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#8888aa' }}>
        <p>照片不存在</p>
        <button
          onClick={() => navigate('/')}
          style={{
            marginTop: 20,
            padding: '10px 24px',
            background: '#16213e',
            color: '#e0e0e0',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          返回首页
        </button>
      </div>
    );
  }

  const scoreColor = getScoreColor(photo.score);

  return (
    <div style={{ minHeight: '100vh', padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      <button
        onClick={() => navigate('/')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 20px',
          background: '#16213e',
          color: '#e0e0e0',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          marginBottom: 24,
          fontSize: 14,
        }}
      >
        ← 返回照片墙
      </button>

      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
        style={{
          position: 'relative',
          background: '#0f3460',
          borderRadius: 16,
          overflow: 'hidden',
          marginBottom: 24,
        }}
      >
        <img
          src={photo.url}
          alt={photo.filename}
          onLoad={() => setImageLoaded(true)}
          style={{
            width: '100%',
            maxHeight: '70vh',
            objectFit: 'contain',
            display: 'block',
            background: '#0a0a1a',
          }}
        />
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        />
        {photo.faceBox && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
            style={{
              position: 'absolute',
              top: 20,
              left: 20,
              background: 'rgba(22, 33, 62, 0.9)',
              backdropFilter: 'blur(10px)',
              padding: '12px 20px',
              borderRadius: 12,
              border: `2px solid ${scoreColor}`,
            }}
          >
            <div style={{ fontSize: 12, color: '#8888aa', marginBottom: 4 }}>微笑评分</div>
            <div style={{ fontSize: 32, fontWeight: 'bold', color: scoreColor }}>
              {photo.score}
            </div>
          </motion.div>
        )}
      </motion.div>

      <div
        style={{
          background: '#16213e',
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <h3 style={{ color: '#f5c518', marginBottom: 16, fontSize: 18 }}>💬 评论 ({photo.comments.length})</h3>

        <form onSubmit={handleSubmitComment}>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 200))}
            placeholder="写下你的评论（最多200字）..."
            style={{
              width: '100%',
              minHeight: 80,
              padding: 12,
              background: '#0f3460',
              color: '#e0e0e0',
              border: '2px solid #0f3460',
              borderRadius: 8,
              resize: 'vertical',
              fontSize: 14,
              outline: 'none',
              transition: 'all 0.3s',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#f5c518';
              e.target.style.boxShadow = '0 0 20px rgba(245, 197, 24, 0.3)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#0f3460';
              e.target.style.boxShadow = 'none';
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: 12, color: comment.length > 180 ? '#ff4d4f' : '#8888aa' }}>
              {comment.length}/200
            </span>
            <button
              type="submit"
              disabled={!comment.trim() || submitting}
              style={{
                padding: '8px 24px',
                background: comment.trim() && !submitting ? '#f5c518' : '#444466',
                color: comment.trim() && !submitting ? '#1a1a2e' : '#666688',
                border: 'none',
                borderRadius: 6,
                cursor: comment.trim() && !submitting ? 'pointer' : 'not-allowed',
                fontWeight: 'bold',
                fontSize: 14,
              }}
            >
              {submitting ? '发送中...' : '发送'}
            </button>
          </div>
        </form>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <AnimatePresence>
          {photo.comments.map((c: Comment) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{
                background: '#16213e',
                borderRadius: 12,
                padding: 16,
                borderLeft: `3px solid #f5c518`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#f5c518', fontWeight: 600 }}>👤 访客</span>
                <span style={{ color: '#666688', fontSize: 12 }}>{formatTime(c.createdAt)}</span>
              </div>
              <p style={{ color: '#e0e0e0', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {c.content}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>

        {photo.comments.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#666688' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>💭</div>
            <p>还没有评论，来抢沙发吧！</p>
          </div>
        )}
      </div>
    </div>
  );
}
