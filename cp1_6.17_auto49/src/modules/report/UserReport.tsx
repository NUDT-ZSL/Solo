import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useDataStore, MusicianId } from '../data/DataStore';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export const UserReport: React.FC = () => {
  const { getStats, musicians, userName, totalScore, getUnlockedTracks, explorationRecords } = useDataStore();
  const stats = getStats();

  const musicianColors: Record<MusicianId, string> = {
    galaxy: '#5C6BC0',
    jazzCat: '#26A69A',
    electronicRain: '#FF7043',
    mountainWind: '#AB47BC',
    lonelyStar: '#FFCA28'
  };

  const barData = {
    labels: musicians.map(m => m.name),
    datasets: [
      {
        label: '已解锁',
        data: musicians.map(m => stats.perMusicianStats[m.id].unlocked),
        backgroundColor: '#81C784',
        borderRadius: 4
      },
      {
        label: '未解锁',
        data: musicians.map(m => stats.perMusicianStats[m.id].total - stats.perMusicianStats[m.id].unlocked),
        backgroundColor: '#E57373',
        borderRadius: 4
      }
    ]
  };

  const barOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1.5,
    scales: {
      x: {
        stacked: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: '#E0E0E0'
        }
      },
      y: {
        stacked: true,
        grid: {
          display: false
        },
        ticks: {
          color: '#E0E0E0'
        }
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#E0E0E0'
        }
      },
      title: {
        display: true,
        text: '音乐人解锁进度',
        color: '#FFD54F',
        font: {
          size: 16
        }
      },
      tooltip: {
        backgroundColor: '#1E1E2E',
        titleColor: '#FFD54F',
        bodyColor: '#E0E0E0',
        borderColor: '#FFD54F',
        borderWidth: 1
      }
    }
  };

  const totalExplorationTime = musicians.reduce((sum, m) => sum + stats.perMusicianStats[m.id].explorationTime, 0);
  
  const doughnutData = {
    labels: musicians.map(m => m.name),
    datasets: [
      {
        data: musicians.map(m => {
          const time = stats.perMusicianStats[m.id].explorationTime;
          return totalExplorationTime > 0 ? (time / totalExplorationTime * 100).toFixed(1) : 0;
        }),
        backgroundColor: musicians.map(m => musicianColors[m.id]),
        borderColor: '#1E1E2E',
        borderWidth: 2
      }
    ]
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#E0E0E0',
          padding: 15
        }
      },
      title: {
        display: true,
        text: '探索时间占比 (%)',
        color: '#FFD54F',
        font: {
          size: 16
        }
      },
      tooltip: {
        backgroundColor: '#1E1E2E',
        titleColor: '#FFD54F',
        bodyColor: '#E0E0E0',
        borderColor: '#FFD54F',
        borderWidth: 1,
        callbacks: {
          label: (context: any) => {
            return `${context.label}: ${context.raw}%`;
          }
        }
      }
    }
  };

  const exportReport = () => {
    const unlockedTracks = getUnlockedTracks();
    const report = {
      userName,
      totalScore,
      exportDate: new Date().toISOString(),
      stats: {
        totalUnlocked: stats.totalUnlocked,
        totalExplored: stats.totalExplored,
        avgAttempts: stats.avgAttempts.toFixed(2)
      },
      unlockedTracks: unlockedTracks.map(({ item, record }) => ({
        trackTitle: item.unlockedTrack.title,
        artist: item.unlockedTrack.artist,
        musician: musicians.find(m => m.id === item.musicianId)?.name,
        unlockedAt: record.unlockedAt ? new Date(record.unlockedAt).toISOString() : null,
        attempts: record.attempts
      })),
      explorationRecords: explorationRecords.map(r => ({
        itemId: r.itemId,
        musician: musicians.find(m => m.id === r.musicianId)?.name,
        unlocked: r.unlocked,
        attempts: r.attempts,
        explorationTime: r.explorationTime
      }))
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `音符秘境_探索报告_${userName}_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="report-page">
      <div className="report-header">
        <h2 className="page-title">📊 我的探索报告</h2>
        <p className="page-subtitle">了解你的音乐探索旅程</p>
      </div>

      <div className="charts-container">
        <div className="chart-card">
          <div className="progress-bars">
            {musicians.map(musician => {
              const mStats = stats.perMusicianStats[musician.id];
              const progress = mStats.total > 0 ? (mStats.unlocked / mStats.total) * 100 : 0;
              return (
                <div key={musician.id} className="progress-item">
                  <div className="progress-header">
                    <span className="musician-name" style={{ color: musician.accentColor }}>
                      {musician.name}
                    </span>
                    <span className="progress-text">
                      {mStats.unlocked} / {mStats.total}
                    </span>
                  </div>
                  <div className="progress-bar-container">
                    <div 
                      className="progress-bar" 
                      style={{ 
                        width: `${progress}%`,
                        backgroundColor: musician.accentColor
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-wrapper">
            <Bar data={barData} options={barOptions} />
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-wrapper">
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
        </div>
      </div>

      <div className="export-section">
        <button onClick={exportReport} className="btn btn-export">
          📥 导出报告 (JSON)
        </button>
      </div>

      <style>{`
        .report-page {
          padding: 24px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .report-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .page-title {
          color: #FFD54F;
          font-size: 28px;
          margin: 0 0 8px 0;
        }

        .page-subtitle {
          color: #9E9E9E;
          margin: 0;
        }

        .charts-container {
          display: grid;
          gap: 24px;
          margin-bottom: 32px;
        }

        .chart-card {
          background: #1E1E2E;
          border-radius: 12px;
          padding: 24px;
          border: 1px solid #37474F;
        }

        .progress-bars {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .progress-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .musician-name {
          font-weight: 600;
          font-size: 14px;
        }

        .progress-text {
          color: #9E9E9E;
          font-size: 13px;
        }

        .progress-bar-container {
          width: 100%;
          height: 12px;
          background: #263238;
          border-radius: 6px;
          overflow: hidden;
        }

        .progress-bar {
          height: 100%;
          border-radius: 6px;
          transition: width 0.5s ease-out;
        }

        .chart-wrapper {
          width: 100%;
          position: relative;
        }

        .export-section {
          text-align: center;
        }

        .btn {
          padding: 12px 32px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease-out;
        }

        .btn-export {
          background: linear-gradient(135deg, #FFD54F 0%, #FFB300 100%);
          color: #121212;
        }

        .btn-export:hover {
          transform: scale(1.05);
          box-shadow: 0 8px 25px rgba(255, 213, 79, 0.4);
        }

        @media (max-width: 768px) {
          .report-page {
            padding: 16px;
          }

          .chart-card {
            padding: 16px;
          }

          .charts-container {
            gap: 16px;
          }
        }
      `}</style>
    </div>
  );
};
