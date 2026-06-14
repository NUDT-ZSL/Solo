import { useMemo } from 'react';
import { Music, Users, Target, TrendingUp } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import PieceCard from '@/components/PieceCard';
import { getDifficultyColor } from '@/utils/dataGenerator';
import './OverviewPage.css';

export default function OverviewPage() {
  const { state } = useApp();

  const stats = useMemo(() => {
    const totalPieces = state.pieces.length;
    const totalVoiceParts = state.pieces.reduce(
      (sum, piece) => sum + piece.voiceParts.length,
      0
    );
    const avgProgress =
      totalVoiceParts > 0
        ? Math.round(
            state.pieces.reduce(
              (sum, piece) =>
                sum +
                piece.voiceParts.reduce(
                  (partSum, part) => partSum + part.progress,
                  0
                ),
              0
            ) / totalVoiceParts
          )
        : 0;

    const completedParts = state.pieces.reduce(
      (sum, piece) =>
        sum + piece.voiceParts.filter((p) => p.progress >= 100).length,
      0
    );

    return {
      totalPieces,
      totalVoiceParts,
      avgProgress,
      completedParts,
    };
  }, [state.pieces]);

  const statCards = [
    {
      icon: Music,
      label: '乐曲总数',
      value: stats.totalPieces,
      color: '#3b82f6',
    },
    {
      icon: Users,
      label: '活跃声部',
      value: stats.totalVoiceParts,
      color: '#22c55e',
    },
    {
      icon: Target,
      label: '已完成声部',
      value: stats.completedParts,
      color: '#eab308',
    },
    {
      icon: TrendingUp,
      label: '平均完成度',
      value: `${stats.avgProgress}%`,
      color: '#2dd4bf',
    },
  ];

  return (
    <div className="page-container">
      <div className="content-wrapper">
        <h1 className="page-title">总览</h1>

        <div className="stats-grid">
          {statCards.map((stat, index) => (
            <div key={index} className="stat-card">
              <div
                className="stat-icon"
                style={{ backgroundColor: `${stat.color}20`, color: stat.color }}
              >
                <stat.icon size={24} />
              </div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="section-header">
          <h2 className="section-title">我的乐曲</h2>
        </div>

        <div className="piece-grid">
          {state.pieces.map((piece) => (
            <PieceCard key={piece.id} piece={piece} />
          ))}
        </div>

        {state.pieces.length === 0 && (
          <div className="empty-state">
            <Music size={48} style={{ color: '#94a3b8', marginBottom: 12 }} />
            <p>还没有乐曲，去"乐曲管理"添加一首吧！</p>
          </div>
        )}
      </div>
    </div>
  );
}

// 为了消除 getDifficultyColor 未使用警告（其他组件会用到）
export { getDifficultyColor };
