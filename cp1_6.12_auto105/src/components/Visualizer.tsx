import React, { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import type { SalesData } from '../DataEngine'
import { isProductTurningPoint } from '../DataEngine'

interface VisualizerProps {
  data: SalesData
  currentMonthIndex: number
  selectedProducts: string[]
  productColors: Record<string, string>
}

const Visualizer: React.FC<VisualizerProps> = ({
  data,
  currentMonthIndex,
  selectedProducts,
  productColors,
}) => {
  const barData = useMemo(() => {
    return data.series
      .filter((s) => selectedProducts.includes(s.product))
      .map((s) => ({
        product: s.product,
        value: s.values[currentMonthIndex] || 0,
        isTurningPoint: isProductTurningPoint(data, s.product, currentMonthIndex),
      }))
  }, [data, currentMonthIndex, selectedProducts])

  const lineData = useMemo(() => {
    const months = data.months.slice(0, currentMonthIndex + 1)
    return months.map((month, idx) => {
      const row: Record<string, string | number> = { month }
      data.series
        .filter((s) => selectedProducts.includes(s.product))
        .forEach((s) => {
          row[s.product] = s.values[idx] || 0
        })
      return row
    })
  }, [data, currentMonthIndex, selectedProducts])

  const pieData = useMemo(() => {
    return data.series
      .filter((s) => selectedProducts.includes(s.product))
      .map((s) => ({
        name: s.product,
        value: s.values[currentMonthIndex] || 0,
      }))
  }, [data, currentMonthIndex, selectedProducts])

  const turningPointProducts = useMemo(() => {
    return data.series
      .filter(
        (s) =>
          selectedProducts.includes(s.product) &&
          isProductTurningPoint(data, s.product, currentMonthIndex)
      )
      .map((s) => s.product)
  }, [data, currentMonthIndex, selectedProducts])

  const CustomBar = (props: any) => {
    const { x, y, width, height, fill, payload } = props
    const isTurning = payload?.isTurningPoint

    return (
      <g>
        {isTurning && (
          <circle
            cx={x + width / 2}
            cy={y + height / 2}
            r={Math.max(width, height) / 2 + 10}
            fill={fill}
            opacity={0.3}
            className="pulse-ring"
          />
        )}
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={fill}
          rx={6}
          ry={6}
          style={{ filter: isTurning ? 'drop-shadow(0 0 8px ' + fill + ')' : 'none' }}
        />
      </g>
    )
  }

  const CustomDot = (props: any) => {
    const { cx, cy, stroke, dataKey } = props
    const isTurning = turningPointProducts.includes(dataKey)

    if (!isTurning) {
      return <circle cx={cx} cy={cy} r={4} fill={stroke} stroke="none" />
    }

    return (
      <g>
        <circle cx={cx} cy={cy} r={6} fill={stroke} className="star-pulse" />
        <polygon
          points={`${cx},${cy - 8} ${cx + 2},${cy - 2} ${cx + 8},${cy} ${cx + 2},${cy + 2} ${cx},${cy + 8} ${cx - 2},${cy + 2} ${cx - 8},${cy} ${cx - 2},${cy - 2}`}
          fill={stroke}
          className="star-blink"
        />
      </g>
    )
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="tooltip-item">
              <span
                className="tooltip-color"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}: {entry.value?.toLocaleString()}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    if (percent < 0.05) return null
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text
        x={x}
        y={y}
        fill="#e0e0e0"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  const chartStyle = { animationDuration: 500, animationEasing: 'ease-out' }

  return (
    <div className="visualizer-container">
      <div className="chart-card bar-chart-card">
        <h3 className="chart-title">当月销售额</h3>
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
            <XAxis
              dataKey="product"
              stroke="#888"
              tick={{ fill: '#a0a0c0', fontSize: 11 }}
              angle={-30}
              textAnchor="end"
              height={60}
            />
            <YAxis stroke="#888" tick={{ fill: '#a0a0c0' }} />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            />
            <Bar
              dataKey="value"
              shape={<CustomBar />}
              {...chartStyle}
            >
              {barData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={productColors[entry.product]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card pie-chart-card">
        <h3 className="chart-title">销售占比</h3>
        <ResponsiveContainer width="100%" height="85%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              label={renderCustomizedLabel}
              labelLine={false}
              {...chartStyle}
            >
              {pieData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={productColors[entry.name]}
                  className="pie-cell"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => <span style={{ color: '#a0a0c0', fontSize: 11 }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card line-chart-card">
        <h3 className="chart-title">累计趋势</h3>
        <ResponsiveContainer width="100%" height="85%">
          <LineChart data={lineData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
            <XAxis
              dataKey="month"
              stroke="#888"
              tick={{ fill: '#a0a0c0', fontSize: 10 }}
            />
            <YAxis stroke="#888" tick={{ fill: '#a0a0c0' }} />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: '#555', strokeWidth: 1 }}
            />
            <Legend
              formatter={(value) => <span style={{ color: '#a0a0c0', fontSize: 11 }}>{value}</span>}
            />
            {data.series
              .filter((s) => selectedProducts.includes(s.product))
              .map((s) => (
                <Line
                  key={s.product}
                  type="monotone"
                  dataKey={s.product}
                  stroke={productColors[s.product]}
                  strokeWidth={2}
                  dot={<CustomDot dataKey={s.product} stroke={productColors[s.product]} />}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                  {...chartStyle}
                />
              ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default Visualizer
