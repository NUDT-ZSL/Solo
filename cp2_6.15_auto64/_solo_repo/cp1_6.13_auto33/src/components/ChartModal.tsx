import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { ChipHistoryEntry, Player } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  chipHistory: ChipHistoryEntry[];
  players: Player[];
}

const PLAYER_COLORS = [
  { border: '#e53e3e', bg: 'rgba(229, 62, 62, 0.1)' },
  { border: '#3182ce', bg: 'rgba(49, 130, 206, 0.1)' },
  { border: '#38a169', bg: 'rgba(56, 161, 105, 0.1)' },
  { border: '#dd6b20', bg: 'rgba(221, 107, 32, 0.1)' },
];

const ChartModal: React.FC<ChartModalProps> = ({
  isOpen,
  onClose,
  chipHistory,
  players,
}) => {
  const chartData = useMemo(() => {
    if (chipHistory.length === 0 || players.length === 0) {
      return { labels: [], datasets: [] };
    }

    const labels = chipHistory.map((entry) => `第${entry.handNumber}局`);

    const datasets = players.map((player, index) => {
      const color = PLAYER_COLORS[index % PLAYER_COLORS.length];
      const data = chipHistory.map((entry) => entry.players[player.id] ?? 0);

      return {
        label: player.name,
        data,
        borderColor: color.border,
        backgroundColor: color.bg,
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: color.border,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        tension: 0.3,
        fill: false,
      };
    });

    return { labels, datasets };
  }, [chipHistory, players]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: { size: 14, weight: 'bold' as const },
        bodyFont: { size: 13 },
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          font: { size: 12 },
          color: '#4a5568',
        },
        title: {
          display: true,
          text: '手牌轮次',
          font: { size: 14, weight: 'bold' as const },
          color: '#2d3748',
        },
      },
      y: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          font: { size: 12 },
          color: '#4a5568',
        },
        title: {
          display: true,
          text: '筹码数',
          font: { size: 14, weight: 'bold' as const },
          color: '#2d3748',
        },
        beginAtZero: true,
      },
    },
    animation: {
      duration: 800,
      easing: 'easeOutQuart' as const,
    },
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        <h2 className="modal-title">筹码变化曲线</h2>
        <div className="chart-container">
          {chipHistory.length > 0 ? (
            <Line data={chartData} options={options} />
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#718096',
              }}
            >
              暂无数据记录
            </div>
          )}
        </div>
        <div className="chart-legend">
          {players.map((player, index) => {
            const color = PLAYER_COLORS[index % PLAYER_COLORS.length];
            return (
              <div key={player.id} className="chart-legend-item">
                <span
                  className="legend-color"
                  style={{ backgroundColor: color.border }}
                ></span>
                <span>{player.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default React.memo(ChartModal);
