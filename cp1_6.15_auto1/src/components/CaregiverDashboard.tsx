import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
  Order,
  Caregiver,
  OrderStatus,
  PET_TYPE_LABELS,
  PET_TYPE_COLORS,
  SERVICE_TYPE_LABELS,
  ORDER_STATUS_COLORS
} from '../types';
import { getWeekStart, getWeeklySchedule, calculateWeeklyRevenue } from '../logic/scheduleManager';
import { api } from '../data/api';

const petIcons: Record<string, string> = {
  dog: '🐕', cat: '🐱', rabbit: '🐰', hamster: '🐹'
};

const weekDayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const RevenueCard: React.FC<{ total: number; trend: number; dailyData: { date: string; revenue: number }[] }> = ({
  total, trend, dailyData
}) => {
  const chartData = dailyData.map((d, i) => ({
    name: weekDayNames[i],
    收入: d.revenue,
    fullDate: d.date
  }));

  return (
    <div style={{
      backgroundColor: '#F5DEB3',
      borderRadius: '16px',
      padding: '28px',
      boxShadow: '0 4px 16px rgba(139, 115, 85, 0.12)',
      border: '2px solid #DEB88780',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: '120px', height: '120px',
        backgroundColor: '#DEB88740',
        borderRadius: '0 0 0 120px',
        pointerEvents: 'none'
      }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}
        className="revenue-header-row"
      >
        <div>
          <div style={{ fontSize: '14px', color: '#8B7355', marginBottom: '6px', fontWeight: 500 }}>
            💰 本周收入
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <span style={{ fontSize: '44px', fontWeight: 800, color: '#8B4513', lineHeight: 1 }}>
              ¥{total.toLocaleString()}
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '4px 10px', borderRadius: '12px',
              backgroundColor: trend >= 0 ? '#32CD3225' : '#FF634725',
              color: trend >= 0 ? '#228B22' : '#B22222',
              fontSize: '13px', fontWeight: 700
            }}>
              {trend >= 0 ? '📈' : '📉'} {trend >= 0 ? '+' : ''}{trend}%
            </span>
          </div>
        </div>
        <div style={{
          padding: '8px 16px', borderRadius: '10px',
          backgroundColor: '#FFFFFF60',
          fontSize: '13px', color: '#8B7355', fontWeight: 600
        }}>
          {new Date().toISOString().split('T')[0]}
        </div>
      </div>

      <div style={{ height: '180px', width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="#DEB88740" vertical={false} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8B7355', fontSize: 12 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#A08870', fontSize: 11 }} width={45} />
            <Tooltip
              formatter={(value: number) => [`¥${value}`, '收入']}
              labelFormatter={(label, payload) => {
                const full = payload?.[0]?.payload?.fullDate || '';
                return `${label} ${full}`;
              }}
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #DEB887',
                borderRadius: '8px',
                fontSize: '13px'
              }}
            />
            <Bar dataKey="收入" radius={[6, 6, 0, 0]}>
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={index === new Date().getDay() - 1 || (index === 6 && new Date().getDay() === 0) ? '#B22222' : '#DEB887'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const PendingOrders: React.FC<{
  orders: Order[];
  onAction: (id: string, status: OrderStatus) => void;
  processingId: string | null;
}> = ({ orders, onAction, processingId }) => {
  const pending = orders.filter(o => o.status === 'pending');

  return (
    <div style={{
      backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '24px',
      border: '1px solid #E8DCC8', boxShadow: '0 2px 8px rgba(139, 115, 85, 0.06)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#5C4A32', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🔔 待确认订单
          {pending.length > 0 && (
            <span style={{
              backgroundColor: '#FF6347', color: '#FFFFFF', fontSize: '12px',
              padding: '2px 10px', borderRadius: '10px', fontWeight: 700
            }}>
              {pending.length}
            </span>
          )}
        </h3>
      </div>

      {pending.length === 0 ? (
        <div style={{
          padding: '40px 20px', textAlign: 'center',
          backgroundColor: '#F8F4EF', borderRadius: '8px',
          color: '#A08870'
        }}>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>✅</div>
          暂无待确认订单，您可以休息一下～
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {pending.map((order) => (
            <div key={order.id} style={{
              padding: '16px', borderRadius: '10px',
              border: '1.5px solid #FF634740',
              backgroundColor: '#FFF5F5',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
              flexWrap: 'wrap',
              transition: 'all 0.2s'
            }}
              className="pending-order-row"
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,99,71,0.15)')}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '50%',
                  backgroundColor: PET_TYPE_COLORS[order.petType] + '25',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '24px', flexShrink: 0
                }}>
                  {petIcons[order.petType]}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#5C4A32', marginBottom: '4px' }}>
                    {order.ownerName} · {order.petName}
                    <span style={{
                      marginLeft: '6px', fontSize: '11px',
                      padding: '2px 6px', borderRadius: '6px',
                      backgroundColor: PET_TYPE_COLORS[order.petType] + '30',
                      color: PET_TYPE_COLORS[order.petType], fontWeight: 500
                    }}>
                      {PET_TYPE_LABELS[order.petType]}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#8B7355' }}>
                    {SERVICE_TYPE_LABELS[order.serviceType]} · 📅 {order.startDate} ~ {order.endDate}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '20px', fontWeight: 700, color: '#228B22' }}>
                  ¥{order.totalPrice}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => onAction(order.id, 'confirmed')}
                    disabled={processingId === order.id}
                    style={{
                      padding: '8px 16px', borderRadius: '8px',
                      border: 'none', backgroundColor: '#3CB371', color: '#FFFFFF',
                      cursor: processingId === order.id ? 'not-allowed' : 'pointer',
                      fontSize: '13px', fontWeight: 600,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => processingId !== order.id && (e.currentTarget.style.backgroundColor = '#2E8B57')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#3CB371')}
                  >
                    ✓ 确认
                  </button>
                  <button
                    onClick={() => onAction(order.id, 'cancelled')}
                    disabled={processingId === order.id}
                    style={{
                      padding: '8px 16px', borderRadius: '8px',
                      border: '1px solid #B2222240', backgroundColor: '#FFFFFF',
                      color: '#B22222',
                      cursor: processingId === order.id ? 'not-allowed' : 'pointer',
                      fontSize: '13px', fontWeight: 600,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => processingId !== order.id && (e.currentTarget.style.backgroundColor = '#B2222210')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                  >
                    ✗ 拒绝
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const WeekSchedule: React.FC<{
  orders: Order[];
  weekStart: Date;
  onWeekChange: (delta: number) => void;
  onDayClick: (dateStr: string, dayOrders: Order[]) => void;
}> = ({ orders, weekStart, onWeekChange, onDayClick }) => {
  const schedule = getWeeklySchedule(orders, weekStart);

  return (
    <div style={{
      backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '24px',
      border: '1px solid #E8DCC8', boxShadow: '0 2px 8px rgba(139, 115, 85, 0.06)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#5C4A32', display: 'flex', alignItems: 'center', gap: '8px' }}>
          📆 本周日程
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => onWeekChange(-1)}
            style={{
              width: '32px', height: '32px', border: 'none', borderRadius: '50%',
              backgroundColor: '#F5DEB360', cursor: 'pointer',
              color: '#8B7355', fontSize: '14px', fontWeight: 700
            }}
          >
            ◀
          </button>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#8B7355', minWidth: '180px', textAlign: 'center' }}>
            {weekStart.toISOString().split('T')[0]} ~
            {new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
          </span>
          <button
            onClick={() => onWeekChange(1)}
            style={{
              width: '32px', height: '32px', border: 'none', borderRadius: '50%',
              backgroundColor: '#F5DEB360', cursor: 'pointer',
              color: '#8B7355', fontSize: '14px', fontWeight: 700
            }}
          >
            ▶
          </button>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '10px',
        overflowX: 'auto'
      }}
        className="week-schedule-grid"
      >
        {Array.from(schedule.entries()).map(([dateStr, dayOrders], idx) => {
          const isToday = dateStr === new Date().toISOString().split('T')[0];
          const isOverflow = dayOrders.length > 5;
          const count = dayOrders.length;

          let countBg = count === 0 ? '#F8F4EF' : count <= 2 ? '#98FB9840' : count <= 5 ? '#FFD70040' : '#FF450025';
          let countColor = count === 0 ? '#A08870' : count <= 2 ? '#228B22' : count <= 5 ? '#B8860B' : '#FF4500';

          return (
            <div
              key={dateStr}
              onClick={() => onDayClick(dateStr, dayOrders)}
              style={{
                padding: '16px 12px',
                borderRadius: '10px',
                border: `2px solid ${isToday ? '#B22222' : isOverflow ? '#FF450080' : '#E8DCC8'}`,
                backgroundColor: isToday ? '#FFF5F5' : isOverflow ? '#FF450015' : '#FFFEF7',
                cursor: count > 0 ? 'pointer' : 'default',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
                minWidth: '90px',
                transition: 'all 0.2s ease',
                transform: 'translateY(0)',
                opacity: 0,
                animation: `fadeInUp 0.3s ease ${idx * 0.04}s forwards`
              }}
              onMouseEnter={(e) => {
                if (count > 0) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(139, 115, 85, 0.15)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                fontSize: '12px', fontWeight: 600,
                color: '#A08870'
              }}>
                {weekDayNames[idx]}
              </div>
              <div style={{
                fontSize: '22px', fontWeight: 700,
                color: isToday ? '#B22222' : '#5C4A32'
              }}>
                {new Date(dateStr).getDate()}
              </div>
              <div style={{
                display: 'flex', flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '3px', minHeight: '28px', maxWidth: '80px'
              }}>
                {dayOrders.slice(0, 5).map((o) => (
                  <span key={o.id} style={{ fontSize: '14px' }}>
                    {petIcons[o.petType]}
                  </span>
                ))}
                {isOverflow && (
                  <span style={{
                    fontSize: '11px', color: '#FF4500', fontWeight: 700
                  }}>
                    +{count - 5}
                  </span>
                )}
              </div>
              <div style={{
                padding: '4px 10px', borderRadius: '10px',
                backgroundColor: isOverflow ? '#FF450025' : countBg,
                color: isOverflow ? '#FF4500' : countColor,
                fontSize: '12px', fontWeight: 700,
                border: `1px solid ${isOverflow ? '#FF450060' : 'transparent'}`,
                transition: 'all 0.3s ease'
              }}>
                {isOverflow ? '🔥 ' : ''}{count} 个预约
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const DayDetailModal: React.FC<{
  dateStr: string;
  orders: Order[];
  onClose: () => void;
}> = ({ dateStr, orders, onClose }) => {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)'
      }} />
      <div style={{
        position: 'relative', width: '90%', maxWidth: '520px',
        maxHeight: '75vh', overflow: 'auto',
        backgroundColor: '#FFFEF7', borderRadius: '16px',
        padding: '28px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <h3 style={{
          margin: '0 0 20px 0', fontSize: '20px', fontWeight: 700,
          color: '#5C4A32', display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          📅 {dateStr} 的预约详情
          <button
            onClick={onClose}
            style={{
              marginLeft: 'auto', width: '32px', height: '32px', borderRadius: '50%',
              border: 'none', backgroundColor: '#F5DEB380', cursor: 'pointer',
              fontSize: '16px', color: '#8B7355'
            }}
          >
            ✕
          </button>
        </h3>

        {orders.length === 0 ? (
          <div style={{
            padding: '40px 20px', textAlign: 'center',
            color: '#A08870'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🌿</div>
            今天没有预约，可以享受自由时光～
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {orders.map((order) => (
              <div key={order.id} style={{
                padding: '16px', borderRadius: '10px',
                backgroundColor: '#FFFFFF',
                border: `1.5px solid ${ORDER_STATUS_COLORS[order.status]}50`
              }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', gap: '12px', marginBottom: '10px',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      backgroundColor: PET_TYPE_COLORS[order.petType] + '25',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '20px'
                    }}>
                      {petIcons[order.petType]}
                    </div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: '#5C4A32' }}>
                        {order.petName} · {order.ownerName}
                      </div>
                      <div style={{ fontSize: '12px', color: '#8B7355' }}>
                        {SERVICE_TYPE_LABELS[order.serviceType]}
                      </div>
                    </div>
                  </div>
                  <span style={{
                    fontSize: '11px', padding: '3px 10px', borderRadius: '10px',
                    backgroundColor: ORDER_STATUS_COLORS[order.status] + '20',
                    color: ORDER_STATUS_COLORS[order.status], fontWeight: 600
                  }}>
                    {order.status === 'pending' ? '待确认' : order.status === 'confirmed' ? '已确认' : order.status === 'completed' ? '已完成' : '已取消'}
                  </span>
                </div>
                <div style={{
                  padding: '8px 12px', borderRadius: '6px',
                  backgroundColor: '#FFF8F0', fontSize: '13px', color: '#8B7355',
                  display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px'
                }}>
                  <span>📅 {order.startDate} → {order.endDate}</span>
                  <span style={{ fontWeight: 700, color: '#228B22' }}>¥{order.totalPrice}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const CaregiverDashboard: React.FC = () => {
  const [caregiver, setCaregiver] = useState<Caregiver | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(getWeekStart(new Date()));
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [dayDetail, setDayDetail] = useState<{ date: string; orders: Order[] } | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [caregivers, ordersData] = await Promise.all([
        api.getCaregivers(),
        api.getOrders({ caregiverId: 'c1' })
      ]);
      setCaregiver(caregivers[0]);
      setOrders(ordersData);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const revenue = calculateWeeklyRevenue(orders, weekStart);
  const lastWeekStart = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastRevenue = calculateWeeklyRevenue(orders, lastWeekStart);
  const trend = lastRevenue.total > 0
    ? Math.round(((revenue.total - lastRevenue.total) / lastRevenue.total) * 100)
    : revenue.total > 0 ? 100 : 0;

  const handleStatusAction = async (id: string, status: OrderStatus) => {
    setProcessingId(id);
    try {
      await api.updateOrderStatus(id, status);
      await loadData();
    } catch (e) {
      alert('操作失败');
    }
    setProcessingId(null);
  };

  if (loading || !caregiver) {
    return (
      <div style={{
        padding: '60px 20px', textAlign: 'center', fontSize: '16px',
        color: '#8B7355', backgroundColor: '#FFFEF7',
        borderRadius: '12px', border: '1px solid #E8DCC8'
      }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏠</div>
        加载仪表盘...
      </div>
    );
  }

  const confirmed = orders.filter(o => o.status === 'confirmed').length;
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const completed = orders.filter(o => o.status === 'completed').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '10px 4px' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '16px'
      }}
        className="dashboard-header"
      >
        <div>
          <h2 style={{
            margin: 0, fontSize: '26px', fontWeight: 700, color: '#8B7355',
            display: 'flex', alignItems: 'center', gap: '12px'
          }}>
            🏠 寄养人仪表盘
          </h2>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#A08870' }}>
            欢迎回来，<span style={{ fontWeight: 600, color: '#8B7355' }}>{caregiver.name}</span>！今天也要元气满满地照顾宠物们哦～
          </p>
        </div>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px'
      }}
        className="stats-grid"
      >
        {[
          { label: '待确认', value: pendingCount, color: '#FFA500', icon: '⏳' },
          { label: '已确认', value: confirmed, color: '#3CB371', icon: '✅' },
          { label: '已完成', value: completed, color: '#4682B4', icon: '🎉' },
          { label: '服务总数', value: caregiver.servedCount, color: '#8B7355', icon: '🏆' }
        ].map((stat, idx) => (
          <div key={stat.label} style={{
            backgroundColor: '#FFFFFF', borderRadius: '12px',
            padding: '20px', border: '1px solid #E8DCC8',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            boxShadow: '0 2px 6px rgba(139, 115, 85, 0.06)',
            opacity: 0, animation: `fadeInUp 0.3s ease ${idx * 0.05}s forwards`
          }}>
            <div>
              <div style={{ fontSize: '12px', color: '#A08870', marginBottom: '6px', fontWeight: 500 }}>
                {stat.label}
              </div>
              <div style={{ fontSize: '30px', fontWeight: 800, color: stat.color }}>
                {stat.value}
              </div>
            </div>
            <div style={{
              width: '50px', height: '50px', borderRadius: '14px',
              backgroundColor: stat.color + '15',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '26px'
            }}>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      <RevenueCard total={revenue.total} trend={trend} dailyData={revenue.dailyBreakdown} />

      <PendingOrders orders={orders} onAction={handleStatusAction} processingId={processingId} />

      <WeekSchedule
        orders={orders}
        weekStart={weekStart}
        onWeekChange={(delta) => {
          setWeekStart(new Date(weekStart.getTime() + delta * 7 * 24 * 60 * 60 * 1000));
        }}
        onDayClick={(dateStr, dayOrders) => setDayDetail({ date: dateStr, orders: dayOrders })}
      />

      {dayDetail && (
        <DayDetailModal
          dateStr={dayDetail.date}
          orders={dayDetail.orders}
          onClose={() => setDayDetail(null)}
        />
      )}
    </div>
  );
};

export default CaregiverDashboard;
