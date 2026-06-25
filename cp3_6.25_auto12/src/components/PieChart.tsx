import React from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import type { PieData } from '../types';

ChartJS.register(ArcElement, Tooltip, Legend);

const PIE_COLORS = ['#ab47bc', '#66bb6a', '#ffa726', '#26c6da', '#ef5350'];

interface PieChartProps {
  data: PieData;
}

const PieChart: React.FC<PieChartProps> = ({ data }) => {
  const total = data.data.reduce((sum, val) => sum + val, 0);

  const chartData = {
    labels: data.labels,
    datasets: [
      {
        data: data.data,
        backgroundColor: data.labels.map((_, idx) => PIE_COLORS[idx % PIE_COLORS.length]),
        borderColor: '#2d2d2d',
        borderWidth: 2,
        hoverOffset: 10,
        spacing: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 300,
    },
    cutout: '60%',
    plugins: {
      legend: {
        display: true,
        position: 'right' as const,
        align: 'center' as const,
        labels: {
          color: '#e0e0e0',
          font: {
            size: 12,
          },
          padding: 12,
          boxWidth: 12,
          boxHeight: 12,
          usePointStyle: true,
          pointStyle: 'circle' as const,
          generateLabels: (chart: any) => {
            const datasets = chart.data.datasets;
            return chart.data.labels.map((label: string, i: number) => ({
              text: `${label} ${datasets[0].data[i]}`,
              fillStyle: datasets[0].backgroundColor[i],
              strokeStyle: datasets[0].backgroundColor[i],
              hidden: false,
              index: i,
            }));
          },
        },
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
          label: (item: any) => {
            const label = item.label || '';
            const value = item.raw;
            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
            return `${label}: ${value} 件 (${percentage}%)`;
          },
        },
      },
    },
  };

  const centerPlugin = {
    id: 'centerText',
    beforeDraw: (chart: any) => {
      const { ctx, chartArea } = chart;
      const centerX = (chartArea.left + chartArea.right) / 2;
      const centerY = (chartArea.top + chartArea.bottom) / 2;
      
      ctx.save();
      ctx.fillStyle = '#e0e0e0';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${total}`, centerX, centerY - 6);
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#9e9e9e';
      ctx.fillText('总作品', centerX, centerY + 14);
      ctx.restore();
    },
  };

  return (
    <Doughnut 
      data={chartData} 
      options={options as any} 
      plugins={[centerPlugin]}
    />
  );
};

export default PieChart;
