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
import { DeviceUsage } from '../types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface StatsChartProps {
  usageStats: DeviceUsage[];
}

const StatsChart = ({ usageStats }: StatsChartProps) => {
  const data = {
    labels: usageStats.map((s) => s.deviceName),
    datasets: [
      {
        label: '预约次数',
        data: usageStats.map((s) => s.bookingCount),
        backgroundColor: '#42a5f5',
        borderRadius: 4,
        barThickness: 16,
      },
      {
        label: '使用时长(小时)',
        data: usageStats.map((s) => s.totalHours),
        backgroundColor: '#66bb6a',
        borderRadius: 4,
        barThickness: 16,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 12,
          padding: 8,
          font: {
            size: 11,
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
          font: {
            size: 10,
          },
          maxRotation: 45,
          minRotation: 45,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: '#f0f0f0',
        },
        ticks: {
          font: {
            size: 11,
          },
        },
      },
    },
  };

  return (
    <div style={{ height: '250px', width: '100%' }}>
      <Bar data={data} options={options} />
    </div>
  );
};

export default StatsChart;
