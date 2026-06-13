import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { shareApi } from '../utils/api';
import type { ShareData } from '../types';

const SharePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [share, setShare] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    shareApi.get(id)
      .then(data => { if (mounted) setShare(data); })
      .catch(err => {
        if (err?.response?.status === 404 && mounted) setNotFound(true);
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [id]);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = shareUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="share-page">
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>正在加载书单...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="share-page">
        <div className="share-not-found">
          <div className="empty-icon">📭</div>
          <h2>书单不存在</h2>
          <p>该分享链接不存在或已过期</p>
          <Link to="/" className="btn-primary">返回首页</Link>
        </div>
      </div>
    );
  }

  if (!share) return null;

  return (
    <div className="share-page">
      <div className="share-card">
        <div className="share-header">
          <div className="share-icon">📋</div>
          <h1 className="share-name">{share.name}</h1>
          <p className="share-meta">
            共 {share.totalCount || share.items.reduce((s, i) => s + i.quantity, 0)} 本
            {share.createdAt && ` · ${new Date(share.createdAt).toLocaleDateString('zh-CN')}`}
          </p>
        </div>

        <ul className="share-book-list">
          {share.items.map(item => (
            <li key={item.id} className="share-book-item">
              <img src={item.cover} alt={item.title} className="share-book-cover" />
              <div className="share-book-info">
                <div className="share-book-title">{item.title}</div>
                <div className="share-book-author">{item.author}</div>
              </div>
              <div className="share-book-right">
                <span className="share-book-price">¥{item.price.toFixed(2)}</span>
                {item.quantity > 1 && <span className="share-book-qty">×{item.quantity}</span>}
              </div>
            </li>
          ))}
        </ul>

        <div className="share-total">
          <span>总价</span>
          <span className="share-total-price">¥{share.totalPrice.toFixed(2)}</span>
        </div>

        <div className="share-qr-section">
          <div className="share-qr-wrap">
            <QRCodeSVG value={shareUrl} size={140} level="M" />
          </div>
          <p className="share-qr-tip">扫描二维码查看书单</p>
          <button
            className={`btn-copy-link ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
          >
            {copied ? '✓ 已复制' : '复制链接'}
          </button>
        </div>

        <div className="share-footer">
          <Link to="/" className="share-back-link">← 返回 BookShelf 浏览更多书籍</Link>
        </div>
      </div>
    </div>
  );
};

export default SharePage;
