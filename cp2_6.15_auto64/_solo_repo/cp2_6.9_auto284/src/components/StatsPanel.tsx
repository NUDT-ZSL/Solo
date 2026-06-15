import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Stats {
  daysReadThisWeek: number;
  totalPagesThisWeek: number;
  avgMinutesPerDay: number;
  booksReadThisWeek: number;
  dailyPagesThisWeek: number[];
}

interface StatsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  stats: Stats | null;
}

const StatsPanel: React.FC<StatsPanelProps> = ({ isOpen, onClose, stats }) => {
  const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  const barData = {
    labels: weekDays,
    datasets: [
      {
        label: '阅读页数',
        data: stats?.dailyPagesThisWeek || [0, 0, 0, 0, 0, 0, 0],
        backgroundColor: [
          'rgba(200, 169, 126, 0.9)',
          'rgba(200, 169, 126, 0.8)',
          'rgba(200, 169, 126, 0.7)',
          'rgba(200, 169, 126, 0.6)',
          'rgba(200, 169, 126, 0.5)',
          'rgba(200, 169, 126, 0.4)',
          'rgba(200, 169, 126, 0.3)',
        ],
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#FBF8F0',
        titleColor: '#3A2A1A',
        bodyColor: '#5A4A3A',
        borderColor: '#DBCBA9',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#8A7A6A', font: { size: 10, family: "'Noto Serif SC', serif" } },
      },
      y: {
        grid: { color: '#E8E0D0' },
        ticks: { color: '#8A7A6A', font: { size: 10, family: "'Noto Serif SC', serif" } },
        beginAtZero: true,
      },
    },
  };

  return (
    <>
      {isOpen && <div style={backdropStyle} onClick={onClose} />}
      <div style={{ ...panelStyle, transform: isOpen ? 'translateX(0)' : 'translateX(120%)' }}>
        <button style={closeBtnStyle} onClick={onClose}>
          ✕
        </button>
        <div style={panelHeaderStyle}>阅读统计</div>
        <div style={statsGridStyle}>
          <div style={statItemStyle}>
            <div style={{ ...statValueStyle, color: '#5A7A9A' }}>{stats?.daysReadThisWeek || 0}</div>
            <div style={statLabelStyle}>本周已读天数</div>
          </div>
          <div style={statItemStyle}>
            <div style={{ ...statValueStyle, color: '#7A9A6A' }}>{stats?.totalPagesThisWeek || 0}</div>
            <div style={statLabelStyle}>阅读总页数</div>
          </div>
          <div style={statItemStyle}>
            <div style={{ ...statValueStyle, color: '#B8865A' }}>
              {stats?.avgMinutesPerDay || 0}<span style={{ fontSize: '14px' }}>分钟</span>
            </div>
            <div style={statLabelStyle}>日均阅读时长</div>
          </div>
          <div style={statItemStyle}>
            <div style={{ ...statValueStyle, color: '#8A6A8A' }}>{stats?.booksReadThisWeek || 0}</div>
            <div style={statLabelStyle}>阅读书籍数量</div>
          </div>
        </div>
        <div style={chartTitleStyle}>本周每日阅读页数</div>
        <div style={chartContainerStyle}>
          <Bar data={barData} options={barOptions} />
        </div>
      </div>
    </>
  );
};

const backdropStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 998,
};

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  top: '50%',
  right: '0',
  transform: 'translateY(-50%) translateX(120%)',
  width: '320px',
  backgroundColor: '#FFFFFF',
  borderRadius: '16px',
  borderTop: '3px solid #B8965E',
  padding: '24px 20px',
  boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.1)',
  zIndex: 999,
  transition: 'transform 0.6s ease-out',
  maxHeight: '90vh',
  overflowY: 'auto',
};

const closeBtnStyle: React.CSSProperties = {
  position: 'absolute',
  top: '12px',
  right: '16px',
  fontSize: '18px',
  color: '#8A7A6A',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const panelHeaderStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 600,
  color: '#3A2A1A',
  marginBottom: '20px',
};

const statsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '16px',
  marginBottom: '24px',
};

const statItemStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '12px',
  backgroundColor: '#FBF8F0',
  borderRadius: '10px',
};

const statValueStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 700,
  marginBottom: '4px',
};

const statLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#8A7A6A',
};

const chartTitleStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 500,
  color: '#5A4A3A',
  marginBottom: '12px',
};

const chartContainerStyle: React.CSSProperties = {
  height: '180px',
  width: '100%',
};

export default StatsPanel;
