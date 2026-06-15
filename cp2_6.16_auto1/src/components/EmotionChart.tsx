import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import type { DailyStats } from '../types';
import { EMOTION_CONFIG } from '../utils/constants';
import { formatDisplayDate } from '../utils/date';
import { fetchStats } from '../utils/api';
import LoadingSkeleton from './LoadingSkeleton';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function EmotionChart() {
  const [stats, setStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await fetchStats();
        setStats(data);
      } catch (err) {
        console.error('加载统计数据失败:', err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="w-full space-y-8">
        <LoadingSkeleton count={1} height="250px" />
        <LoadingSkeleton count={1} height="250px" />
      </div>
    );
  }

  const labels = stats.map((s) => formatDisplayDate(s.date));

  const lineData = {
    labels,
    datasets: stats.map((stat, index) => ({
      label: EMOTION_CONFIG[stat.emotion].label,
      data: stats.map((s, i) => (i === index ? s.emotionLevel : null)),
      borderColor: EMOTION_CONFIG[stat.emotion].color,
      backgroundColor: `${EMOTION_CONFIG[stat.emotion].color}20`,
      borderWidth: 2,
      pointRadius: 6,
      pointBackgroundColor: EMOTION_CONFIG[stat.emotion].color,
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      tension: 0.3,
      spanGaps: false,
    })),
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: '情绪变化趋势',
        font: {
          size: 16,
          weight: 700 as const,
          family: '"Noto Sans SC", sans-serif',
        },
        color: '#5d4037',
        padding: {
          bottom: 20,
        },
      },
      tooltip: {
        backgroundColor: '#333',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#333',
        borderWidth: 1,
        cornerRadius: 4,
        padding: 12,
        animation: {
          duration: 200,
        },
        callbacks: {
          label: function (context: { parsed: { y: number } }) {
            const value = context.parsed.y;
            const emotionEntry = Object.entries(EMOTION_CONFIG).find(
              ([, config]) => config.level === value
            );
            if (emotionEntry) {
              const [, config] = emotionEntry;
              return `${config.emoji} ${config.label} (等级 ${value})`;
            }
            return `等级 ${value}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#8d6e63',
          font: {
            family: '"Noto Sans SC", sans-serif',
          },
        },
      },
      y: {
        min: 1,
        max: 5,
        ticks: {
          stepSize: 1,
          color: '#8d6e63',
          callback: function (value: number | string) {
            const v = Number(value);
            const emotionEntry = Object.entries(EMOTION_CONFIG).find(
              ([, config]) => config.level === v
            );
            return emotionEntry ? emotionEntry[1].emoji : v;
          },
        },
        grid: {
          color: '#f5e6d3',
        },
      },
    },
  };

  const barData = {
    labels,
    datasets: [
      {
        label: '阅读时长（分钟）',
        data: stats.map((s) => s.duration),
        backgroundColor: '#42a5f5',
        borderRadius: 4,
        borderSkipped: false as const,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: '阅读时长统计',
        font: {
          size: 16,
          weight: 700 as const,
          family: '"Noto Sans SC", sans-serif',
        },
        color: '#5d4037',
        padding: {
          bottom: 20,
        },
      },
      tooltip: {
        backgroundColor: '#333',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#333',
        borderWidth: 1,
        cornerRadius: 4,
        padding: 12,
        animation: {
          duration: 200,
        },
        callbacks: {
          label: function (context: { parsed: { y: number } }) {
            return `阅读 ${context.parsed.y} 分钟`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#8d6e63',
          font: {
            family: '"Noto Sans SC", sans-serif',
          },
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: '#8d6e63',
        },
        grid: {
          color: '#f5e6d3',
        },
      },
    },
  };

  return (
    <div className="w-full space-y-8">
      <div className="w-full bg-white rounded-2xl p-6" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <div style={{ height: '280px' }}>
          <Line data={lineData} options={lineOptions} />
        </div>
      </div>
      <div className="w-full bg-white rounded-2xl p-6" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <div style={{ height: '280px' }}>
          <Bar data={barData} options={barOptions} />
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-4 mt-6">
        {Object.entries(EMOTION_CONFIG).map(([key, config]) => (
          <div key={key} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: config.color }}
            />
            <span className="text-sm" style={{ color: '#6d4c41' }}>
              {config.emoji} {config.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
