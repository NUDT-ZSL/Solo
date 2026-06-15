import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, PawPrint, CreditCard, ClipboardList } from 'lucide-react';
import type { ScheduleItem } from '../types';
import { bookingApi } from '../utils/api';

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const getDayName = (dateStr: string) => {
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return days[new Date(dateStr).getDay()];
};

const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    booking: any;
    schedule: ScheduleItem[];
    dailyBreakdown: any[];
  } | null>(null);

  useEffect(() => {
    if (id) {
      loadOrderDetail();
    }
  }, [id]);

  const loadOrderDetail = async () => {
    try {
      const result = await bookingApi.getSchedule(id!);
      setData(result);
    } catch (err) {
      console.error('加载订单详情失败:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '32px 24px', maxWidth: '1000px', margin: '0 auto' }}>
        <div className="skeleton" style={{ height: '40px', width: '120px', borderRadius: '8px', marginBottom: '24px' }} />
        <div className="skeleton" style={{ height: '300px', borderRadius: '12px', marginBottom: '24px' }} />
        <div className="skeleton" style={{ height: '400px', borderRadius: '12px' }} />
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: '32px 24px', textAlign: 'center' }}>
        <p>订单不存在</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: '16px', display: 'inline-block' }}>
          返回首页
        </Link>
      </div>
    );
  }

  const { booking, schedule, dailyBreakdown } = data;

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1000px', margin: '0 auto' }}>
      <Link
        to="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--color-text-light)',
          textDecoration: 'none',
          marginBottom: '24px',
          fontSize: '0.95rem',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color = 'var(--color-primary)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = 'var(--color-text-light)';
        }}
      >
        <ArrowLeft size={18} />
        返回首页
      </Link>

      <div className="fade-in">
        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '32px',
            marginBottom: '24px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '24px',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <h1 style={{ marginBottom: '8px', fontSize: '1.75rem' }}>
                🎉 预订成功！
              </h1>
              <p style={{ color: 'var(--color-text-light)' }}>
                订单号：{booking.id}
              </p>
            </div>
            <div
              style={{
                background: 'rgba(34, 197, 94, 0.1)',
                color: 'var(--color-success)',
                padding: '8px 16px',
                borderRadius: '999px',
                fontWeight: '500',
              }}
            >
              ✓ 已确认
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '24px',
              marginBottom: '24px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', color: 'var(--color-text-light)' }}>
                <Calendar size={16} />
                <span style={{ fontSize: '0.9rem' }}>入住日期</span>
              </div>
              <p style={{ fontWeight: '500', margin: 0 }}>{formatDate(booking.checkIn)}</p>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', color: 'var(--color-text-light)' }}>
                <Calendar size={16} />
                <span style={{ fontSize: '0.9rem' }}>离店日期</span>
              </div>
              <p style={{ fontWeight: '500', margin: 0 }}>{formatDate(booking.checkOut)}</p>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', color: 'var(--color-text-light)' }}>
                <PawPrint size={16} />
                <span style={{ fontSize: '0.9rem' }}>房间类型</span>
              </div>
              <p style={{ fontWeight: '500', margin: 0 }}>{booking.roomName}</p>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', color: 'var(--color-text-light)' }}>
                <PawPrint size={16} />
                <span style={{ fontSize: '0.9rem' }}>入住宠物</span>
              </div>
              <p style={{ fontWeight: '500', margin: 0 }}>{booking.petNames.join('、')}</p>
            </div>
          </div>

          <div
            style={{
              borderTop: '1px solid var(--color-border)',
              paddingTop: '24px',
            }}
          >
            <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>
              <CreditCard size={18} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
              费用明细
            </h3>
            <div
              style={{
                background: 'var(--color-bg-alt)',
                borderRadius: '8px',
                padding: '20px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--color-text-light)' }}>房费 ({dailyBreakdown.length}晚)</span>
                <span>¥{dailyBreakdown.reduce((sum, d) => sum + d.basePrice + d.services.feeding, 0) - (booking.services.feeding ? 30 * dailyBreakdown.length : 0)}</span>
              </div>
              {booking.services.feeding && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--color-text-light)' }}>喂食服务 ({dailyBreakdown.length}天)</span>
                  <span style={{ color: 'var(--color-feeding)' }}>¥{30 * dailyBreakdown.length}</span>
                </div>
              )}
              {booking.services.walking > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--color-text-light)' }}>遛狗服务 ({booking.services.walking}次)</span>
                  <span style={{ color: 'var(--color-walking)' }}>¥{booking.services.walking * 50}</span>
                </div>
              )}
              {booking.services.bathing > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--color-text-light)' }}>洗澡服务 ({booking.services.bathing}次)</span>
                  <span style={{ color: 'var(--color-bathing)' }}>¥{booking.services.bathing * 80}</span>
                </div>
              )}
              <div
                style={{
                  borderTop: '1px dashed var(--color-border)',
                  paddingTop: '12px',
                  marginTop: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontWeight: '600', fontSize: '1.1rem' }}>总计</span>
                <span style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--color-primary)' }}>
                  ¥{booking.totalPrice}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '32px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <h3 style={{ marginBottom: '20px', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ClipboardList size={20} />
            入住日程安排
          </h3>
          <div
            style={{
              overflowX: 'auto',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: '600px',
              }}
            >
              <thead>
                <tr style={{ background: 'var(--color-bg-alt)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', borderRadius: '8px 0 0 0', fontWeight: '500' }}>日期</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500' }}>房型</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500' }}>房费</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500' }}>服务</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', borderRadius: '0 8px 0 0', fontWeight: '500' }}>小计</th>
                </tr>
              </thead>
              <tbody>
                {dailyBreakdown.map((day, index) => (
                  <tr
                    key={day.date}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      background: index % 2 === 1 ? 'var(--color-gray-100)' : 'white',
                    }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: '500' }}>{day.date}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-light)' }}>{getDayName(day.date)}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>{booking.roomName}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={day.isWeekend ? { color: 'var(--color-warning)' } : {}}>
                        ¥{day.basePrice}
                        {day.isWeekend && <span style={{ fontSize: '0.75rem', marginLeft: '4px' }}>(周末)</span>}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {day.services.feeding > 0 ? '🍽️ 喂食' : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '500' }}>
                      ¥{day.basePrice + day.services.feeding}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginTop: '24px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Link to={`/logs/${booking.id}`} className="btn btn-secondary">
            查看看护日志
          </Link>
          <Link to="/schedule" className="btn btn-primary">
            查看日程看板
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;
