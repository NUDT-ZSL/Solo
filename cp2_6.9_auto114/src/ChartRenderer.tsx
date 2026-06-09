import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line, Pie, Scatter } from 'react-chartjs-2';
import type { ChartConfig } from './types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const colorSchemes: Record<string, string[]> = {
  default: ['#89B4FA', '#F38BA8', '#A6E3A1', '#FAB387', '#C6A0F6', '#94E2D5'],
  ocean: ['#0077B6', '#00B4D8', '#90E0EF', '#CAF0F8', '#023E8A', '#48CAE4'],
  sunset: ['#FF6B6B', '#FFA07A', '#FFD93D', '#F9844A', '#F8961E', '#F9C74F'],
  forest: ['#2D6A4F', '#40916C', '#52B788', '#74C69D', '#95D5B2', '#B7E4C7'],
  pastel: ['#BDE0FE', '#CDB4DB', '#FFC8DD', '#FFAFCC', '#A2D2FF', '#E0BBE4']
};

interface ChartRendererProps {
  config: ChartConfig;
  onDataPointClick?: (label: string, value: number) => void;
  height?: number | string;
}

const ChartRenderer: React.FC<ChartRendererProps> = ({ config, onDataPointClick, height = 300 }) => {
  const chartRef = useRef<any>(null);

  const colors = colorSchemes[config.colorScheme] || colorSchemes.default;

  const applyColorsToDatasets = () => {
    return config.datasets.map((ds, idx) => {
      const color = colors[idx % colors.length];
      const bgColors = config.type === 'pie' 
        ? colors.slice(0, ds.data.length)
        : color + (config.type === 'line' ? 'CC' : '99');
      
      return {
        ...ds,
        backgroundColor: bgColors,
        borderColor: config.type === 'pie' ? '#1E1E2E' : color,
        borderWidth: config.type === 'pie' ? 2 : (config.type === 'line' ? 2 : 1),
        tension: config.type === 'line' ? 0.3 : undefined,
        fill: config.type === 'line' ? false : undefined,
        pointRadius: config.type === 'line' ? 4 : undefined,
        pointHoverRadius: config.type === 'line' ? 6 : undefined
      };
    });
  };

  const data = {
    labels: config.labels,
    datasets: applyColorsToDatasets()
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (_event: any, elements: any[]) => {
      if (elements && elements.length > 0 && onDataPointClick) {
        const element = elements[0];
        const label = config.labels[element.index];
        let value: number;
        const dataset = data.datasets[element.datasetIndex];
        const dataPoint = dataset.data[element.index];
        if (typeof dataPoint === 'number') {
          value = dataPoint;
        } else if (dataPoint && typeof dataPoint === 'object') {
          value = (dataPoint as any).y ?? (dataPoint as any).value ?? 0;
        } else {
          value = 0;
        }
        onDataPointClick(label, value);
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#CDD6F4',
          usePointStyle: true,
          padding: 16,
          font: { size: 12 }
        }
      },
      title: {
        display: !!config.title,
        text: config.title,
        color: '#CDD6F4',
        font: { size: 16, weight: 'bold' as const },
        padding: { bottom: 20 }
      },
      tooltip: {
        backgroundColor: '#313244',
        titleColor: '#CDD6F4',
        bodyColor: '#CDD6F4',
        borderColor: '#89B4FA',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8
      }
    },
    scales: config.type === 'pie' ? {} : {
      x: {
        ticks: { color: '#9CA3AF' },
        grid: { color: 'rgba(255,255,255,0.05)' }
      },
      y: {
        ticks: { color: '#9CA3AF' },
        grid: { color: 'rgba(255,255,255,0.05)' }
      }
    }
  };

  const renderChart = () => {
    const commonProps = {
      ref: chartRef,
      data,
      options
    };

    switch (config.type) {
      case 'bar':
        return <Bar {...commonProps} />;
      case 'line':
        return <Line {...commonProps} />;
      case 'pie':
        return <Pie {...commonProps} />;
      case 'scatter':
        return <Scatter {...commonProps} />;
      default:
        return <Bar {...commonProps} />;
    }
  };

  return (
    <div style={{ height, width: '100%' }}>
      {renderChart()}
    </div>
  );
};

export default ChartRenderer;
export { colorSchemes };
