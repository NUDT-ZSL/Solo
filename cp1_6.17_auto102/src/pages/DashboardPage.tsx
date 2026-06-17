import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Users, Star, TrendingUp, FileText, Calendar, BarChart3 } from 'lucide-react';
import LineChart from '../components/LineChart';
import { api } from '../utils/api';
import type { SummaryStats, TrendPoint } from '../../shared/types';

const DashboardPage = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [activityTrend, setActivityTrend] = useState<TrendPoint[]>([]);
  const [reviewTrend, setReviewTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, a, r] = await Promise.all([
          api.get<SummaryStats>('/stats/summary'),
          api.get<TrendPoint[]>('/stats/activity-trend?days=30'),
          api.get<TrendPoint[]>('/stats/review-trend?days=30'),
        ]);
        setSummary(s);
        setActivityTrend(a);
        setReviewTrend(r);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handlePointClick = (date: string) => {
    navigate(`/?date=${date}`);
  };

  const StatCard = ({
    icon: Icon,
    label,
    value,
    sub,
    gradient,
    iconColor,
  }: {
    icon: any;
    label: string;
    value: string | number;
    sub?: string;
    gradient: string;
    iconColor: string;
  }) => (
    <div className="card" style={{
      padding: 22,
      background: `linear-gradient(135deg, ${gradient})`,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{
            fontSize: 13,
            fontWeight: 500,
            color: '#616161',
            marginBottom: 8,
          }}>{label}</div>
          <div style={{
            fontSize: 34,
            fontWeight: 800,
            color: '#212121',
            lineHeight: 1.1,
            marginBottom: 6,
            letterSpacing: -1,
          }}>{value}</div>
          {sub && <div style={{ fontSize: 12, color: '#757575' }}>{sub}</div>}
        </div>
        <div style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          backgroundColor: iconColor + '1A',
          color: iconColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Icon size={26} strokeWidth={2.2} />
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontSize: 26,
          fontWeight: 700,
          color: '#212121',
          marginBottom: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <BarChart3 size={26} color="#1976D2" /> 店主数据分析
        </h1>
        <p style={{ fontSize: 14, color: '#757575' }}>
          读书会整体运营数据概览，助您了解社群活跃度与用户参与度
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 20,
        marginBottom: 28,
      }}>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card" style={{ padding: 22, height: 120, opacity: 0.5,
              background: 'linear-gradient(90deg, #f5f5f5 25%, #ececec 50%, #f5f5f5 75%)',
              backgroundSize: '200% 100%', animation: 'skeleton 1.5s infinite' }} />
          ))
        ) : (
          <>
            <StatCard
              icon={Calendar}
              label="总活动数"
              value={summary?.totalActivities ?? 0}
              sub="历史累计举办的读书会活动"
              gradient="#FFF3E0, #FFE0B2"
              iconColor="#FF7043"
            />
            <StatCard
              icon={Users}
              label="总参与人次"
              value={summary?.totalRegistrations ?? 0}
              sub="所有活动报名人数总和"
              gradient="#E3F2FD, #BBDEFB"
              iconColor="#1976D2"
            />
            <StatCard
              icon={Star}
              label="平均书评评分"
              value={summary?.avgReviewRating.toFixed(1) ?? '0.0'}
              sub="来自所有书友书评的综合评分"
              gradient="#FFF8E1, #FFECB3"
              iconColor="#FFA000"
            />
          </>
        )}
        <style>{`@keyframes skeleton { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <FileText size={18} color="#FF7043" />
            <h2 className="section-title" style={{ marginBottom: 0 }}>近30天活动新建趋势</h2>
          </div>
          <p style={{ fontSize: 13, color: '#757575', marginBottom: 12 }}>
            点击趋势图上的数据点可跳转至对应日期的活动列表
          </p>
          <LineChart
            data={activityTrend}
            color="#FF7043"
            onPointClick={handlePointClick}
            title="每日新建活动数量"
          />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <TrendingUp size={18} color="#42A5F5" />
            <h2 className="section-title" style={{ marginBottom: 0 }}>近30天书评提交趋势</h2>
          </div>
          <p style={{ fontSize: 13, color: '#757575', marginBottom: 12 }}>
            反映书友活跃度变化，热门书籍带动讨论热情
          </p>
          <LineChart
            data={reviewTrend}
            color="#42A5F5"
            onPointClick={handlePointClick}
            title="每日书评提交数量"
          />
        </div>
      </div>

      <div className="card" style={{ padding: 24, marginTop: 28 }}>
        <h3 style={{
          fontSize: 16,
          fontWeight: 600,
          color: '#424242',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <BookOpen size={18} color="#1976D2" /> 运营小贴士
        </h3>
        <ul style={{
          fontSize: 13,
          color: '#616161',
          lineHeight: 2,
          paddingLeft: 20,
        }}>
          <li>定期举办主题鲜明的读书会，更容易吸引书友报名参加</li>
          <li>鼓励书友提交详细书评，可以准备小礼品作为参与奖励</li>
          <li>关注书评评分较低的活动，收集反馈改进后续环节安排</li>
          <li>对高活跃度书友可以给予荣誉称号，增强社群凝聚力</li>
        </ul>
      </div>
    </div>
  );
};

export default DashboardPage;
