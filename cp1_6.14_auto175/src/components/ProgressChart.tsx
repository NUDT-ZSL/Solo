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
      pointHoverRadius: 4,
      pointHoverBackgroundColor: '#ffffff',
      pointHoverBorderColor: ds.color,
      pointHoverBorderWidth: 2,
      pointStyle: 'circle' as const,
      tension: 0.4,
      fill: false,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 500,
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#f8fafc',
          font: {
            size: 13,
            family: "'Inter', sans-serif",
          },
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
          boxWidth: 8,
          boxHeight: 8,
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: '#0f172a',
        titleColor: '#f8fafc',
        bodyColor: '#f8fafc',
        borderColor: '#334155',
        borderWidth: 1,
        cornerRadius: 6,
        padding: {
          top: 10,
          right: 12,
          bottom: 10,
          left: 12,
        },
        titleFont: {
          size: 12,
          weight: 'bold' as const,
          family: "'Inter', sans-serif",
        },
        bodyFont: {
          size: 12,
          family: "'Inter', sans-serif",
        },
        displayColors: true,
        boxPadding: 4,
        usePointStyle: true,
        pointStyle: 'circle',
        callbacks: {
          label: (context: {
            dataset: { label: string; borderColor?: string };
            parsed: { y: number };
          }) => {
            return `${context.dataset.label}: ${context.parsed.y}%`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(51, 65, 85, 0.4)',
          drawBorder: false,
        },
        ticks: {
          color: '#94a3b8',
          font: {
            size: 12,
            family: "'Inter', sans-serif",
          },
        },
      },
      y: {
        min: 0,
        max: 100,
        grid: {
          color: 'rgba(51, 65, 85, 0.4)',
          drawBorder: false,
        },
        ticks: {
          color: '#94a3b8',
          font: {
            size: 12,
            family: "'Inter', sans-serif",
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
