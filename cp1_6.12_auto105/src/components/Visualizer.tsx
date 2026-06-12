/**
 * Visualizer.tsx - 多图表联动可视化组件
 *
 * 【职责】
 *   1. 接收 App 分发的时序数据切片，渲染三类图表：
 *      - 柱状图（BarChart）：当月各产品线销售额，带转折点脉动光圈
 *      - 环形图（PieChart）：当月各产品线销售占比，hover放大阴影
 *      - 折线图（LineChart）：截至当前月份的累计销售额趋势，带星形转折点闪烁
 *   2. 内部通过 useMemo 缓存图表数据计算结果，通过 React.memo 避免无关重渲染
 *
 * 【输入（Props）】
 *   - data: SalesData          - 来自 App 按 sortType + selectedProducts 过滤排序后的数据
 *   - currentMonthIndex: number - 当前回放月份索引，来自 Timeline 状态机
 *   - selectedProducts: string[] - 勾选的产品线列表，来自 App state
 *   - productColors: Record     - 产品→颜色映射，来自 DataEngine.getProductColors
 *
 * 【输出】渲染的 SVG 图表（通过 Recharts）
 *
 * 【被依赖】src/App.tsx → 渲染 <Visualizer />
 * 【依赖】
 *   - src/DataEngine.ts: isProductTurningPoint 检测单个产品在某月是否为转折点
 *   - recharts: BarChart, LineChart, PieChart 等图表组件
 */

import React, { useMemo, memo } from 'react'
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

const CustomBar = memo((props: any) => {
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
})
CustomBar.displayName = 'CustomBar'

const CustomDot = memo((props: any) => {
  const { cx, cy, stroke, isTurning } = props

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
})
CustomDot.displayName = 'CustomDot'

const CustomTooltip = memo(({ active, payload, label }: any) => {
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
})
CustomTooltip.displayName = 'CustomTooltip'

const PieLabel = memo(({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
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
})
PieLabel.displayName = 'PieLabel'

const VisualizerInner: React.FC<VisualizerProps> = ({
  data,
  currentMonthIndex,
  selectedProducts,
  productColors,
}) => {
  const filteredSeries = useMemo(
    () => data.series.filter((s) => selectedProducts.includes(s.product)),
    [data.series, selectedProducts]
  )

  const barData = useMemo(() => {
    return filteredSeries.map((s) => ({
      product: s.product,
      value: s.values[currentMonthIndex] || 0,
      isTurningPoint: isProductTurningPoint(data, s.product, currentMonthIndex),
    }))
  }, [filteredSeries, currentMonthIndex, data])

  const lineData = useMemo(() => {
    const months = data.months.slice(0, currentMonthIndex + 1)
    return months.map((month, idx) => {
      const row: Record<string, string | number> = { month }
      filteredSeries.forEach((s) => {
        row[s.product] = s.values[idx] || 0
      })
      return row
    })
  }, [data.months, currentMonthIndex, filteredSeries])

  const pieData = useMemo(() => {
    return filteredSeries.map((s) => ({
      name: s.product,
      value: s.values[currentMonthIndex] || 0,
    }))
  }, [filteredSeries, currentMonthIndex])

  const turningPointSet = useMemo(() => {
    const set = new Set<string>()
    filteredSeries.forEach((s) => {
      if (isProductTurningPoint(data, s.product, currentMonthIndex)) {
        set.add(s.product)
      }
    })
    return set
  }, [filteredSeries, currentMonthIndex, data])

  const chartStyle = { animationDuration: 500, animationEasing: 'ease-out' }

  return (
    <div className="visualizer-container">
      <div className="chart-card bar-chart-card" style={{ order: 1 }}>
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
              barSize={40}
              {...chartStyle}
            >
              {barData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={productColors[entry.product]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card pie-chart-card" style={{ order: 2 }}>
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
              label={<PieLabel />}
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

      <div className="chart-card line-chart-card" style={{ order: 3 }}>
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
            {filteredSeries.map((s) => (
              <Line
                key={s.product}
                type="monotone"
                dataKey={s.product}
                stroke={productColors[s.product]}
                strokeWidth={2}
                dot={(dotProps: any) => (
                  <CustomDot
                    {...dotProps}
                    stroke={productColors[s.product]}
                    isTurning={turningPointSet.has(s.product) && dotProps.index === currentMonthIndex}
                  />
                )}
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

const arePropsEqual = (prev: VisualizerProps, next: VisualizerProps): boolean => {
  if (prev.currentMonthIndex !== next.currentMonthIndex) return false
  if (prev.data.months.length !== next.data.months.length) return false
  if (prev.data.series.length !== next.data.series.length) return false
  if (prev.selectedProducts.length !== next.selectedProducts.length) return false
  for (let i = 0; i < prev.selectedProducts.length; i++) {
    if (prev.selectedProducts[i] !== next.selectedProducts[i]) return false
  }
  const prevKeys = Object.keys(prev.productColors)
  const nextKeys = Object.keys(next.productColors)
  if (prevKeys.length !== nextKeys.length) return false
  return true
}

const Visualizer = memo(VisualizerInner, arePropsEqual)
Visualizer.displayName = 'Visualizer'

export default Visualizer
