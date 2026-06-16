import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Repeat, CheckCircle, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useExchange } from '../hooks/useExchange';
import { booksApi, usersApi } from '../api';
import type { AdminStats, ExchangeRecord, Book, User } from '../types';
import { formatDate } from '../utils';

export function AdminPage() {
  const { user } = useAuth();
  const exchange = useExchange();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [records, setRecords] = useState<(ExchangeRecord & { book?: Book; currentHolder?: User })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.isAdmin) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, r, allBooks, allUsers] = await Promise.all([
        exchange.getAdminStats(),
        exchange.getAdminRecords(),
        booksApi.list(),
        usersApi.list(),
      ]);
      setStats(s);
      const enriched = r.map((rec) => ({
        ...rec,
        book: allBooks.find((b) => b.id === rec.bookId),
        currentHolder: allUsers.find((u) => u.id === rec.currentHolderId),
      }));
      setRecords(enriched);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async (id: string) => {
    if (!confirm('确定要关闭这条漂流记录吗？')) return;
    try {
      await exchange.closeRecord(id);
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (!user?.isAdmin) {
    return (
      <div className="container">
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <Shield size={48} style={{ color: '#a8a29e', margin: '0 auto 16px' }} />
          <p style={{ color: '#78716c', marginBottom: 20, fontSize: 15 }}>
            你没有管理员权限
          </p>
          <button className="btn-primary" onClick={() => navigate('/home')}>
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1
        style={{
          fontSize: 28,
          fontWeight: 700,
          marginBottom: 32,
          color: '#292524',
        }}
      >
        管理员面板
      </h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 20,
          marginBottom: 32,
        }}
      >
        {[
          {
            label: '图书总数',
          value: stats?.totalBooks ?? 0,
            icon: BookOpen,
            color: '#d97706',
            bg: '#fef3c7',
          },
          {
            label: '交换中',
            value: stats?.activeExchanges ?? 0,
            icon: Repeat,
            color: '#3b82f6',
            bg: '#dbeafe',
          },
          {
            label: '已完成',
            value: stats?.completedExchanges ?? 0,
            icon: CheckCircle,
            color: '#22c55e',
            bg: '#dcfce7',
          },
        ].map((item, i) => (
          <div
            key={i}
            className="card fade-in-up"
            style={{
              padding: 24,
              animationDelay: `${i * 80}ms`,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: item.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <item.icon size={24} style={{ color: item.color }} />
              </div>
              <div>
                <p style={{ fontSize: 13, color: '#78716c' }}>{item.label}</p>
                <p
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: '#292524',
                    lineHeight: 1.2,
                  }}
                >
                  {item.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 24 }}>
        <h3
          style={{
            fontSize: 18,
            fontWeight: 600,
            marginBottom: 16,
            color: '#292524',
          }}
        >
          所有漂流记录
        </h3>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div className="loading-spinner" />
          </div>
        ) : records.length === 0 ? (
          <p style={{ color: '#a8a29e', fontSize: 14, textAlign: 'center', padding: 20 }}>
            暂无漂流记录
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
              }}
            >
              <thead>
                <tr style={{ borderBottom: '1px solid #e7e5e4' }}>
                  <th
                    style={tableHeaderStyle}
                  >
                    图书名称
                  </th>
                  <th style={tableHeaderStyle}>当前持有者</th>
                  <th style={tableHeaderStyle}>开始日期</th>
                  <th style={tableHeaderStyle}>状态</th>
                  <th style={tableHeaderStyle}>操作</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec) => (
                  <tr
                    key={rec.id}
                    style={{ borderBottom: '1px solid #f5f5f4' }}
                  >
                    <td
                      style={{
                        padding: '12px 12px',
                        fontSize: 14,
                        color: '#292