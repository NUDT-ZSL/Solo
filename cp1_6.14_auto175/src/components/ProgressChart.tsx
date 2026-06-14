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
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { formatDate } from '@/utils/dataGenerator';
import './ProgressChart.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ProgressChartProps {
  dates: string[];
  datasets: {
    label: string;
    data: number[];
    color: string;
  }[];
}

export default function ProgressChart({ dates, datasets }: ProgressChartProps) {
  const formattedDates = dates.map((d) => formatDate(d));

  const chartData = {
    labels: formattedDates,
    datasets: datasets.map((ds) => ({
      label: ds.label,
      data: ds.data,
      borderColor: ds.color,
      backgroundColor: `${ds.color}20`,
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 6,
      pointHoverBackgroundColor: '#ffffff',
      pointHoverBorderColor: ds.color,
      pointHoverBorderWidth: 2,
      tension: 0.4,
      fill: false,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#94a3b8',
          font: {
            size: 13,
          },
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#f8fafc',
        bodyColor: '#f8fafc',
        borderColor: '#334155',
        borderWidth: 1,
        cornerRadius: 6,
        padding: 12,
        titleFont: {
          size: 13,
        },
        bodyFont: {
          size: 12,
        },
        displayColors: true,
        callbacks: {
          label: (context: { dataset: { label: string; borderColor?: string }; parsed: { y: number } }) => {
            return `${context.dataset.label}: ${context.parsed.y}%`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(51, 65, 85, 0.4)',
        },
        ticks: {
          color: '#94a3b8',
          font: {
            size: 12,
          },
        },
      },
      y: {
        min: 0,
        max: 100,
        grid: {
          color: 'rgba(51, 65, 85, 0.4)',
        },
        ticks: {
          color: '#94a3b8',
          font: {
            size: 12,
          },
          callback: (value: string | number) => `${value}%`,
        },
      },
    },
  };

  return (
    <div className="chart-container">
      <Line data={chartData} options={options} />
    </div>
  );
}
