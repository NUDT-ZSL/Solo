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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccess(false);
    try {
      const book = await onSubmit({ title, author, coverUrl, isbn });
      setCreatedBook(book);
      setSuccess(true);
      setTitle('');
      setAuthor('');
      setCoverUrl('');
      setIsbn('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to add book', err);
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = (hasFocus: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 15,
    outline: 'none',
    transition: 'all 0.3s ease',
  });

  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: 36, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1f2937', marginBottom: 24 }}>添加新书</h2>

      {success && createdBook && (
        <div style={{
          background: '#dcfce7', borderRadius: 12, padding: 20, marginBottom: 24,
          animation: 'fadeIn 0.3s ease forwards',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span className="checkmark-icon" style={{ color: '#16a34a', fontSize: 20 }}>✓</span>
            <span style={{ fontWeight: 600, color: '#166534' }}>图书添加成功！</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{
              background: '#fff', padding: 12, borderRadius: 8,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            }}>
              <QRCodeSVG
                value={`${window.location.origin}/trail/${createdBook._id}`}
                size={120}
                level="M"
                bgColor="#ffffff"
                fgColor="#1f2937"
              />
              <span style={{ fontSize: 11, color: '#6b7280' }}>扫码借阅此书</span>
            </div>
            <div>
              <p style={{ fontWeight: 600, color: '#1f2937' }}>{createdBook.title}</p>
              <p style={{ fontSize: 13, color: '#6b7280' }}>{createdBook.author}</p>
              <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                QR码ID: {createdBook.qrCode}
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6 }}>书名 *</label>
          <input
            value={title} onChange={(e) => setTitle(e.target.value)}
            required placeholder="请输入书名"
            style={inputStyle(false)}
            onFocus={(e) => { e.target.style.borderColor = '#f97316'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.2)'; }}
            onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6 }}>作者 *</label>
          <input
            value={author} onChange={(e) => setAuthor(e.target.value)}
            required placeholder="请输入作者"
            style={inputStyle(false)}
            onFocus={(e) => { e.target.style.borderColor = '#f97316'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.2)'; }}
            onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6 }}>封面图片URL</label>
          <input
            value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)}
            placeholder="https://example.com/cover.jpg"
            style={inputStyle(false)}
            onFocus={(e) => { e.target.style.borderColor = '#f97316'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.2)'; }}
            onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
          />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6 }}>ISBN</label>
          <input
            value={isbn} onChange={(e) => setIsbn(e.target.value)}
            placeholder="978-X-XXXX-XXXX-X"
            style={inputStyle(false)}
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
          ) : success ? (
            <>
              <span className="checkmark-icon">✓</span>
              添加成功
            </>
          ) : (
            '添加图书'
          )}
        </button>
      </form>
    </div>
  );
}
