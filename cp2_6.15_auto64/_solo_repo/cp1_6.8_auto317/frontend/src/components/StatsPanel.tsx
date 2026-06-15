import { useEffect, useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  DoughnutController,
} from 'chart.js';
import { useStore } from '@/store/useStore';
import type { UserStats } from '@/store/useStore';
import { fetchUserStats } from '@/api/client';
import { FileText, Waves, Tag } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend, DoughnutController);

const CHART_COLORS = [
  '#D4A574', '#8D6E63', '#CD853F', '#DEB887', '#F5DEB3',
  '#DAA520', '#B8860B', '#D2691E', '#BC8F8F', '#C4A882',
];

export default function StatsPanel({ userId }: { userId: string }) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchUserStats(userId);
        if (mounted) setStats(data);
      } catch (e) {
        console.error('Failed to load stats:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [userId]);

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card p-4 animate-pulse">
            <div className="h-8 bg-amber-gold/10 rounded mb-2" />
            <div className="h-4 bg-amber-gold/10 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const topCategory = Object.entries(stats.category_distribution || {}).sort((a, b) => b[1] - a[1])[0];

  const chartData = {
    labels: Object.keys(stats.category_distribution || {}),
    datasets: [{
      data: Object.values(stats.category_distribution || {}),
      backgroundColor: CHART_COLORS.slice(0, Object.keys(stats.category_distribution || {}).length),
      borderWidth: 0,
      hoverOffset: 6,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#8D6E63',
          font: { family: "'Noto Sans SC', sans-serif", size: 11 },
          padding: 12,
          usePointStyle: true,
        },
      },
    },
    cutout: '60%',
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="glass-card p-4 text-center">
          <FileText size={20} className="mx-auto text-amber-gold mb-1" />
          <p className="text-2xl font-bold text-warm-brown">{stats.total_published}</p>
          <p className="text-xs text-warm-brown/50">总发布</p>
        </div>
        <div className="glass-card p-4 text-center">
          <Waves size={20} className="mx-auto text-amber-gold mb-1" />
          <p className="text-2xl font-bold text-warm-brown">{stats.total_resonated}</p>
          <p className="text-xs text-warm-brown/50">总共鸣</p>
        </div>
        <div className="glass-card p-4 text-center">
          <Tag size={20} className="mx-auto text-amber-gold mb-1" />
          <p className="text-lg font-bold text-warm-brown">{topCategory ? topCategory[0] : '-'}</p>
          <p className="text-xs text-warm-brown/50">气味类型</p>
        </div>
      </div>

      {Object.keys(stats.category_distribution || {}).length > 0 && (
        <div className="glass-card p-4">
          <p className="text-sm text-warm-brown/60 mb-3">气味分布</p>
          <div className="h-48">
            <Doughnut data={chartData} options={chartOptions} />
          </div>
        </div>
      )}
    </div>
  );
}
