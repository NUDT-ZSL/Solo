import React, { useState, useMemo } from 'react';
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
import type { BarDataItem } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface BarChartProps {
  data: BarDataItem[];
  onDataUpdate: () => void;
}

const MEDAL_COLORS = ['#ffd54f', '#b0bec5', '#a1887f'];

const BarChart: React.FC<BarChartProps> = ({ data, onDataUpdate }) => {
  const [sortBy, setSortBy] = useState<'clicks' | 'avgDuration'>('clicks');

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      if (sortBy === 'clicks') return b.clicks - a.clicks;
      return b.avgDuration - a.avgDuration;
    });
  }, [data, sortBy]);

  const getBarColor = (index: number) => {
    if (index < 3) return MEDAL_COLORS[index];
    const ratio = index / Math.max(sortedData.length - 1, 1);
    const r = Math.round(255 - ratio * (255 - 239));
    const g = Math.round(112 - ratio * (112 - 83));
    const b = Math.round(67 - ratio * (67 - 80));
    return `rgb(${r}, ${g}, ${b})`;
  };

  const handleClick = () => {
    setSortBy(prev => prev === 'clicks' ? 'avgDuration' : 'clicks');
    onDataUpdate();
  };

  const dataValues = sortedData.map(item => sortBy === 'clicks' ? item.clicks : item.avgDuration);

  const chartData = {
    labels: sortedData.map(item => item.title.length > 6 ? item.title.slice(0, 6) + '...' : item.title),
    datasets: [
      {
        data: dataValues,
        backgroundColor: sortedData.map((_, idx) => getBarColor(idx)),
        borderRadius: 4,
        borderSkipped: false,
        barThickness: 60,
        maxBarThickness: 60,
      },
    ],
  };

  const dataLabelsPlugin = {
    id: 'datalabels',
    afterDatasetsDraw: (chart: any) => {
      const { ctx, data } = chart;
      ctx.save();
      ctx.fillStyle = '#e0e0e0';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';

      data.datasets.forEach((dataset: any, datasetIndex: number) => {
        const meta = chart.getDatasetMeta(datasetIndex);
        meta.data.forEach((bar: any, index: number) => {
          const value = dataset.data[index];
          if (value !== null && value !== undefined) {
            ctx.fillText(String(value), bar.x, bar.y - 4);
          }
        });
      });
      ctx.restore();
    },
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 300,
    },
    onClick: handleClick,
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
        callbacks: {
          title: (items: any) => {
            const idx = items[0].dataIndex;
            return sortedData[idx].title;
          },
          label: (item: any) => {
            const value = sortBy === 'clicks'
              ? `${item.raw} 次点击`
              : `${item.raw} 秒平均停留`;
            return value;
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
          color: '#9e9e9e',
          font: {
            size: 10,
          },
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
        },
      },
    },
  };

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <Bar data={chartData} options={options as any} plugins={[dataLabelsPlugin]} />
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontSize: '11px',
        color: '#757575',
      }}>
        点击切换：{sortBy === 'clicks' ? '按点击次数' : '按停留时长'}
      </div>
    </div>
  );
};

export default BarChart;
