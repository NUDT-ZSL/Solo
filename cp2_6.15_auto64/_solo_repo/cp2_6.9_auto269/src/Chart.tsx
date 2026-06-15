import { useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import type { DailySnapshot } from './types'
import './Chart.css'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface Props {
  snapshots: DailySnapshot[]
}

export default function Chart({ snapshots }: Props) {
  const data = useMemo(() => {
    const recent = snapshots.slice(-30)
    const labels = recent.map(s => {
      const d = new Date(s.date)
      return `${d.getMonth() + 1}/${d.getDate()}`
    })

    return {
      labels,
      datasets: [
        {
          label: '茎高(cm)',
          data: recent.map(s => s.stemHeight),
          borderColor: '#4A7C4A',
          backgroundColor: 'rgba(74, 124, 74, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 5
        },
        {
          label: '叶片数(片)',
          data: recent.map(s => s.leafCount),
          borderColor: '#6B8E6B',
          backgroundColor: 'rgba(107, 142, 107, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 5
        },
        {
          label: '浇水量(ml)',
          data: recent.map(s => s.water),
          borderColor: '#5A9EAD',
          backgroundColor: 'rgba(90, 158, 173, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 5
        }
      ]
    }
  }, [snapshots])

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 500
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#3A3A2E',
          font: { size: 11 },
          boxWidth: 12,
          padding: 8
        }
      },
      tooltip: {
        backgroundColor: 'rgba(58, 58, 46, 0.9)',
        titleColor: '#FAF6F0',
        bodyColor: '#FAF6F0',
        borderColor: '#D4C8B8',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 6
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#6B6B5E',
          font: { size: 10 }
        },
        grid: {
          color: 'rgba(212, 200, 184, 0.3)'
        }
      },
      y: {
        ticks: {
          color: '#6B6B5E',
          font: { size: 10 }
        },
        grid: {
          color: 'rgba(212, 200, 184, 0.3)'
        }
      }
    }
  }), [])

  return (
    <div className="chart-container">
      <h3 className="chart-title">📊 生长趋势</h3>
      <div className="chart-wrapper">
        <Line data={data} options={options} />
      </div>
    </div>
  )
}
