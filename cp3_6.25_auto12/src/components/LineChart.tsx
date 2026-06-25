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
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { LineData } from '../types';

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

interface LineChartProps {
  data: LineData;
}

const LineChart: React.FC<LineChartProps> = ({ data }) => {
  const chartData = {
    labels: data.labels,
    datasets: [
      {
        label: '浏览量',
        data: data.data,
        borderColor: '#42a5f5',
        backgroundColor: 'rgba(66, 165, 245, 0.1)',
        borderWidth: 2,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#42a5f5',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 300,
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#263238',
        titleColor: '#fff',
        bodyColor: '#fff',
        bodyFont: {
          size: 12,
        },
        padding: 8,
        cornerRadius: 4,
        displayColors: false,
        callbacks: {
          label: (item: any) => `${item.raw} 次浏览`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: '#424242',
        },
        ticks: {
          color: '#9e9e9e',
          font: {
            size: 10,
          },
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: '#424242',
        },
        ticks: {
          color: '#9e9e9e',
          font: {
            size: 10,
          },
          stepSize: 1,
          precision: 0,
        },
      },
    },
  };

  return <Line data={chartData} options={options as any} />;
};

export default LineChart;
