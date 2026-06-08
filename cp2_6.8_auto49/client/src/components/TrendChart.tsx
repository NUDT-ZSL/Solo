import React, { useMemo, useRef, useEffect } from 'react';
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
import { KeywordData } from '../types';

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

interface TrendChartProps {
  keywords: KeywordData[];
  selectedKeywords?: string[];
  chartRef?: React.MutableRefObject<any>;
}

function getDateLabels(): string[] {
  const labels: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
  }
  return labels;
}

function keywordColors(keywords: KeywordData[]): Record<string, string> {
  const map: Record<string, string> = {};
  keywords.forEach((k, i) => {
    const hue = Math.round((i * 360) / keywords.length + Math.random() * 30) % 360;
    map[k.keyword] = `hsl(${hue}, 70%, 60%)`;
  });
  return map;
}

const TrendChart: React.FC<TrendChartProps> = ({ keywords, selectedKeywords = [], chartRef }) => {
  const internalRef = useRef<any>(null);
  const ref = chartRef || internalRef;

  const labels = useMemo(() => getDateLabels(), []);

  const colorMap = useMemo(() => keywordColors(keywords), [keywords]);

  const displayList = useMemo(() => {
    if (selectedKeywords.length > 0) {
      return keywords.filter(k => selectedKeywords.includes(k.keyword));
    }
    return keywords.slice(0, 5);
  }, [keywords, selectedKeywords]);

  const data = useMemo(() => ({
    labels,
    datasets: displayList.map(k => ({
      label: k.keyword,
      data: k.trend,
      borderColor: colorMap[k.keyword] || '#6C63FF',
      backgroundColor: (colorMap[k.keyword] || '#6C63FF') + '33',
      tension: 0.35,
      borderWidth: 2,
      pointRadius: 3,
      pointHoverRadius: 5,
      fill: false,
    })),
  }), [displayList, labels, colorMap]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 200 },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: '#E0E0E0',
          usePointStyle: true,
          padding: 16,
          font: { size: 12 },
        },
      },
      tooltip: {
        backgroundColor: '#16213E',
        titleColor: '#E0E0E0',
        bodyColor: '#E0E0E0',
        borderColor: '#2a2a4a',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: { color: '#E0E0E0' },
        grid: { color: 'rgba(158, 158, 158, 0.15)' },
      },
      y: {
        min: 0,
        max: 110,
        ticks: { color: '#E0E0E0' },
        grid: { color: 'rgba(158, 158, 158, 0.15)' },
      },
    },
  }), []);

  return (
    <div style={{ width: '100%', height: 400 }}>
      <Line ref={ref} data={data} options={options} />
    </div>
  );
};

export default TrendChart;
