import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { Book } from './App';

interface AddBookFormProps {
  onSubmit: (data: { title: string; author: string; coverUrl: string; isbn: string }) => Promise<Book>;
}

export default function AddBookForm({ onSubmit }: AddBookFormProps) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [isbn, setIsbn] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdBook, setCreatedBook] = useState<Book | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccess(false);
    try {
      const book = await onSubmit({ title, author, coverUrl, isbn });
      setCreatedBook(book);
      setSuccess(true);
      setShowQrModal(true);
      setTitle('');
      setAuthor('');
      setCoverUrl('');
      setIsbn('');
    } catch (err) {
      console.error('Failed to add book', err);
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 15,
    outline: 'none',
    transition: 'all 0.3s ease',
  };

  return (
    <>
      <div style={{ background: '#fff', borderRadius: 16, padding: 36, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1f2937', marginBottom: 24 }}>添加新书</h2>

        {success && createdBook && (
          <div style={{
            background: '#dcfce7', borderRadius: 12, padding: 16, marginBottom: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            animation: 'fadeIn 0.3s ease forwards',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="checkmark-icon" style={{ color: '#16a34a', fontSize: 20 }}>✓</span>
              <span style={{ fontWeight: 600, color: '#166534' }}>
                「{createdBook.title}」添加成功！
              </span>
            </div>
            <button
              onClick={() => setShowQrModal(true)}
              style={{
                padding: '6px 16px', background: '#fff', border: '1px solid #16a34a',
                borderRadius: 8, color: '#16a34a', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.3s ease',
              }}
            >
              查看二维码
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6 }}>书名 *</label>
            <input
              value={title} onChange={(e) => setTitle(e.target.value)}
              required placeholder="请输入书名"
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = '#f97316'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.2)'; }}
              onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6 }}>作者 *</label>
            <input
              value={author} onChange={(e) => setAuthor(e.target.value)}
              required placeholder="请输入作者"
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = '#f97316'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.2)'; }}
              onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6 }}>封面图片URL</label>
            <input
              value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://example.com/cover.jpg"
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = '#f97316'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.2)'; }}
              onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6 }}>ISBN</label>
            <input
              value={isbn} onChange={(e) => setIsbn(e.target.value)}
              placeholder="978-X-XXXX-XXXX-X"
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = '#f97316'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.2)'; }}
              onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
          <button
            type="submit"
            className="btn-primary"
            disabled={submitting}
            style={{ width: '100%', justifyContent: 'center', padding: 12, fontSize: 16 }}
          >
            {submitting ? (
              <>
                <span className="spinner" />
                提交中...
              </>
            ) : '添加图书'}
          </button>
        </form>
      </div>

      {showQrModal && createdBook && (
        <div
          onClick={() => setShowQrModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 16, padding: 32,
              width: 380, maxWidth: '90vw',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              textAlign: 'center',
              animation: 'fadeIn 0.3s ease',
            }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 24,
              background: '#dcfce7', margin: '0 auto 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24,
            }}>
              ✓
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1f2937', marginBottom: 4 }}>
              图书添加成功
            </h3>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 20 }}>
              {createdBook.title} · {createdBook.author}
            </p>
            <div style={{
              display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 10,
              background: '#f9fafb', padding: 20, borderRadius: 12,
            }}>
              <QRCodeSVG
                value={`${window.location.origin}/trail/${createdBook._id}`}
                size={160}
                level="M"
                bgColor="#ffffff"
                fgColor="#1f2937"
              />
              <span style={{ fontSize: 12, color: '#6b7280' }}>扫描二维码借阅此书</span>
            </div>
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 12 }}>
              QR码ID: {createdBook.qrCode}
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'center' }}>
              <button
                onClick={() => setShowQrModal(false)}
                style={{
                  padding: '8px 24px', background: '#f9fafb',
                  border: '1px solid #d1d5db', borderRadius: 8,
                  fontSize: 14, color: '#374151', cursor: 'pointer',
                }}
              >
                关闭
              </button>
              <button
                onClick={() => setShowQrModal(false)}
                style={{
                  padding: '8px 24px',
                  background: 'linear-gradient(135deg, #f97316, #ea580c)',
                  color: '#fff', border: 'none', borderRadius: 8,
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                继续添加
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
