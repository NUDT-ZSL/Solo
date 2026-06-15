import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

interface WeeklyReportData {
  summary: string;
  dailyPages: number[];
  bookShares: { title: string; pages: number }[];
  generated: string;
}

interface WeeklyReportProps {
  isOpen: boolean;
  onClose: () => void;
  report: WeeklyReportData | null;
}

const WeeklyReport: React.FC<WeeklyReportProps> = ({ isOpen, onClose, report }) => {
  const [showFullReport, setShowFullReport] = React.useState(false);

  if (!isOpen) return null;

  const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  const lineData = {
    labels: weekDays,
    datasets: [
      {
        label: '阅读页数',
        data: report?.dailyPages || [0, 0, 0, 0, 0, 0, 0],
        borderColor: '#C8A97E',
        backgroundColor: 'rgba(200, 169, 126, 0.2)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#B8965E',
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 2,
        pointRadius: 4,
      },
    ],
  };

  const lineOptions = {
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
        ticks: { color: '#8A7A6A', font: { size: 11, family: "'Noto Serif SC', serif" } },
      },
      y: {
        grid: { color: '#E8E0D0' },
        ticks: { color: '#8A7A6A', font: { size: 11, family: "'Noto Serif SC', serif" } },
        beginAtZero: true,
      },
    },
  };

  const doughnutColors = [
    '#C8A97E',
    '#A7C4B5',
    '#8A6A8A',
    '#5A7A9A',
    '#B8865A',
    '#7A9A6A',
    '#D4A574',
  ];

  const doughnutData = {
    labels: report?.bookShares.map((b) => b.title) || [],
    datasets: [
      {
        data: report?.bookShares.map((b) => b.pages) || [],
        backgroundColor: report?.bookShares.map((_, i) => doughnutColors[i % doughnutColors.length]) || [],
        borderWidth: 0,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#5A4A3A',
          font: { size: 11, family: "'Noto Serif SC', serif" },
          padding: 10,
        },
      },
      tooltip: {
        backgroundColor: '#FBF8F0',
        titleColor: '#3A2A1A',
        bodyColor: '#5A4A3A',
        borderColor: '#DBCBA9',
        borderWidth: 1,
      },
    },
    cutout: '60%',
  };

  return (
    <>
      <div style={overlayStyle} onClick={onClose}>
        <div style={{ ...cardStyle, transform: isOpen ? 'scaleY(1)' : 'scaleY(0)' }} onClick={(e) => e.stopPropagation()}>
          <button style={closeBtnStyle} onClick={onClose}>
            ✕
          </button>
          <div style={headerStyle}>阅读周报</div>
          <div style={summaryStyle}>{report?.summary || '暂无周报数据'}</div>
          <button
            style={fullReportBtnStyle}
            onClick={() => setShowFullReport(true)}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#4A6A8A')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#5A7A9A')}
          >
            查看完整报告
          </button>
        </div>
      </div>

      {showFullReport && (
        <div style={fullOverlayStyle} onClick={() => setShowFullReport(false)}>
          <div style={fullReportStyle} onClick={(e) => e.stopPropagation()}>
            <button style={fullCloseBtnStyle} onClick={() => setShowFullReport(false)}>
              ✕
            </button>
            <div style={fullReportHeaderStyle}>完整阅读报告</div>
            <div style={fullSummaryStyle}>{report?.summary}</div>

            <div style={chartSectionStyle}>
              <div style={chartSectionTitleStyle}>每日阅读页数趋势</div>
              <div style={lineChartStyle}>
                <Line data={lineData} options={lineOptions} />
              </div>
            </div>

            <div style={chartSectionStyle}>
              <div style={chartSectionTitleStyle}>各书阅读占比</div>
              <div style={doughnutChartStyle}>
                {report?.bookShares.length ? (
                  <Doughnut data={doughnutData} options={doughnutOptions} />
                ) : (
                  <div style={emptyStyle}>暂无数据</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: '#00000040',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  zIndex: 1001,
  paddingTop: '60px',
};

const cardStyle: React.CSSProperties = {
  width: '480px',
  maxHeight: '400px',
  backgroundColor: '#FFFFFF',
  borderRadius: '16px',
  padding: '28px 24px',
  transformOrigin: 'top center',
  animation: 'expandDown 0.4s ease-out',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  overflowY: 'auto',
};

const closeBtnStyle: React.CSSProperties = {
  position: 'absolute',
  top: '16px',
  right: '20px',
  fontSize: '18px',
  color: '#8A7A6A',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const headerStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 600,
  color: '#3A2A1A',
  marginBottom: '20px',
  position: 'relative',
};

const summaryStyle: React.CSSProperties = {
  fontSize: '15px',
  color: '#5A4A3A',
  lineHeight: 1.8,
  textAlign: 'center',
  marginBottom: '24px',
  padding: '0 8px',
};

const fullReportBtnStyle: React.CSSProperties = {
  width: '140px',
  height: '36px',
  borderRadius: '8px',
  backgroundColor: '#5A7A9A',
  color: '#FFFFFF',
  fontSize: '14px',
  border: 'none',
  cursor: 'pointer',
  fontFamily: "'Noto Serif SC', serif",
  transition: 'background-color 0.3s',
};

const fullOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: '#00000050',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1002,
  padding: '20px',
};

const fullReportStyle: React.CSSProperties = {
  width: '560px',
  maxHeight: '85vh',
  backgroundColor: '#FFFFFF',
  borderRadius: '16px',
  padding: '32px 28px',
  overflowY: 'auto',
  position: 'relative',
};

const fullCloseBtnStyle: React.CSSProperties = {
  position: 'absolute',
  top: '16px',
  right: '20px',
  fontSize: '20px',
  color: '#8A7A6A',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const fullReportHeaderStyle: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: 600,
  color: '#3A2A1A',
  marginBottom: '16px',
  textAlign: 'center',
};

const fullSummaryStyle: React.CSSProperties = {
  fontSize: '15px',
  color: '#5A4A3A',
  lineHeight: 1.7,
  textAlign: 'center',
  marginBottom: '28px',
  padding: '12px 16px',
  backgroundColor: '#FBF8F0',
  borderRadius: '10px',
};

const chartSectionStyle: React.CSSProperties = {
  marginBottom: '28px',
};

const chartSectionTitleStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 500,
  color: '#5A4A3A',
  marginBottom: '12px',
};

const lineChartStyle: React.CSSProperties = {
  height: '220px',
  width: '100%',
};

const doughnutChartStyle: React.CSSProperties = {
  height: '260px',
  width: '100%',
};

const emptyStyle: React.CSSProperties = {
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#8A7A6A',
  fontSize: '14px',
};

export default WeeklyReport;
