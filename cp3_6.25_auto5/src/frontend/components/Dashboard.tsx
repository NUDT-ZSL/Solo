import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import * as api from '../utils/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DashboardData {
  id: string;
  title: string;
  playCount: number;
  chapterStats: {
    chapterId: string;
    title: string;
    completionRate: number;
    commentCount: number;
  }[];
  commentTrend: { date: string; count: number }[];
}

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<DashboardData[]>('/programs/dashboard')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div
        style={{
          padding: 40,
          textAlign: 'center',
          color: '#888',
        }}
      >
        加载中...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        style={{
          padding: 40,
          textAlign: 'center',
          color: '#888',
        }}
      >
        暂无数据，请先创建节目
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h2
        style={{
          color: '#e0e0e0',
          marginBottom: 24,
          fontSize: 22,
          fontWeight: 600,
        }}
      >
        创作者统计看板
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {data.map((program) => (
          <div
            key={program.id}
            style={{
              background: '#1e1e1e',
              borderRadius: 12,
              padding: 24,
              border: '1px solid #333',
              transition: 'transform 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform =
                'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            }}
          >
            <h3
              style={{
                color: '#e0e0e0',
                marginBottom: 16,
                fontSize: 18,
              }}
            >
              {program.title}
            </h3>
            <div
              style={{
                display: 'flex',
                gap: 16,
                flexWrap: 'wrap',
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  background: '#2a2a2a',
                  borderRadius: 8,
                  padding: 16,
                  minWidth: 140,
                  textAlign: 'center',
                }}
              >
                <div style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>
                  总播放次数
                </div>
                <div
                  style={{
                    color: '#42a5f5',
                    fontSize: 28,
                    fontWeight: 700,
                  }}
                >
                  {program.playCount}
                </div>
              </div>
              <div
                style={{
                  background: '#2a2a2a',
                  borderRadius: 8,
                  padding: 16,
                  minWidth: 140,
                  textAlign: 'center',
                }}
              >
                <div style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>
                  章节数
                </div>
                <div
                  style={{
                    color: '#7e57c2',
                    fontSize: 28,
                    fontWeight: 700,
                  }}
                >
                  {program.chapterStats.length}
                </div>
              </div>
              <div
                style={{
                  background: '#2a2a2a',
                  borderRadius: 8,
                  padding: 16,
                  minWidth: 140,
                  textAlign: 'center',
                }}
              >
                <div style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>
                  总评论数
                </div>
                <div
                  style={{
                    color: '#66bb6a',
                    fontSize: 28,
                    fontWeight: 700,
                  }}
                >
                  {program.chapterStats.reduce(
                    (sum, c) => sum + c.commentCount,
                    0
                  )}
                </div>
              </div>
            </div>
            {program.chapterStats.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h4
                  style={{
                    color: '#e0e0e0',
                    marginBottom: 12,
                    fontSize: 15,
                  }}
                >
                  章节平均收听完成率
                </h4>
                <div style={{ maxWidth: 600 }}>
                  <Bar
                    data={{
                      labels: program.chapterStats.map(
                        (c) => c.title || c.chapterId.slice(0, 6)
                      ),
                      datasets: [
                        {
                          label: '完成率 (%)',
                          data: program.chapterStats.map(
                            (c) => c.completionRate
                          ),
                          backgroundColor: program.chapterStats.map(
                            (_, i) => {
                              const t =
                                program.chapterStats.length > 1
                                  ? i / (program.chapterStats.length - 1)
                                  : 0;
                              const r = Math.round(
                                0x66 + (0x43 - 0x66) * t
                              );
                              const g = Math.round(
                                0xbb + (0xa0 - 0xbb) * t
                              );
                              const b = Math.round(
                                0x6a + (0x47 - 0x6a) * t
                              );
                              return `rgb(${r},${g},${b})`;
                            }
                          ),
                          borderRadius: 6,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      scales: {
                        y: {
                          beginAtZero: true,
                          max: 100,
                          ticks: { color: '#888' },
                          grid: { color: '#333' },
                        },
                        x: {
                          ticks: { color: '#888' },
                          grid: { color: '#333' },
                        },
                      },
                      plugins: {
                        legend: { labels: { color: '#e0e0e0' } },
                      },
                    }}
                  />
                </div>
              </div>
            )}
            {program.commentTrend.length > 0 && (
              <div>
                <h4
                  style={{
                    color: '#e0e0e0',
                    marginBottom: 12,
                    fontSize: 15,
                  }}
                >
                  评论数量趋势
                </h4>
                <div style={{ maxWidth: 600 }}>
                  <Line
                    data={{
                      labels: program.commentTrend.map((t) => t.date),
                      datasets: [
                        {
                          label: '评论数',
                          data: program.commentTrend.map((t) => t.count),
                          borderColor: '#42a5f5',
                          backgroundColor: 'rgba(66,165,245,0.1)',
                          pointRadius: 6,
                          pointBackgroundColor: '#42a5f5',
                          pointBorderColor: '#42a5f5',
                          fill: true,
                          tension: 0.3,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: { color: '#888' },
                          grid: { color: '#333' },
                        },
                        x: {
                          ticks: { color: '#888' },
                          grid: { color: '#333' },
                        },
                      },
                      plugins: {
                        legend: { labels: { color: '#e0e0e0' } },
                      },
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
