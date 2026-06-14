import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import type { ProcessedCountry } from './data-processor';
import { formatNumber } from './data-processor';

interface BubbleSelectedEventDetail {
  code: string;
}

declare global {
  interface WindowEventMap {
    BubbleSelected: CustomEvent<BubbleSelectedEventDetail>;
  }
}

interface DetailPanelProps {
  allCountries: ProcessedCountry[];
}

export function DetailPanel({ allCountries }: DetailPanelProps) {
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const lineChartRef = useRef<HTMLDivElement>(null);
  const barChartRef = useRef<HTMLDivElement>(null);
  const lineChartInstance = useRef<echarts.ECharts | null>(null);
  const barChartInstance = useRef<echarts.ECharts | null>(null);

  const selectedCountry = selectedCode
    ? allCountries.find((c) => c.code === selectedCode) || null
    : null;

  useEffect(() => {
    const handler = (event: CustomEvent<BubbleSelectedEventDetail>) => {
      setSelectedCode(event.detail.code);
    };
    window.addEventListener('BubbleSelected', handler as EventListener);
    return () => {
      window.removeEventListener('BubbleSelected', handler as EventListener);
    };
  }, []);

  useEffect(() => {
    if (lineChartRef.current) {
      lineChartInstance.current = echarts.init(lineChartRef.current);
    }
    if (barChartRef.current) {
      barChartInstance.current = echarts.init(barChartRef.current);
    }
    const resizeHandler = () => {
      lineChartInstance.current?.resize();
      barChartInstance.current?.resize();
    };
    window.addEventListener('resize', resizeHandler);
    return () => {
      if (lineChartInstance.current) {
        lineChartInstance.current.dispose();
        lineChartInstance.current = null;
      }
      if (barChartInstance.current) {
        barChartInstance.current.dispose();
        barChartInstance.current = null;
      }
      window.removeEventListener('resize', resizeHandler);
    };
  }, []);

  useEffect(() => {
    if (!selectedCountry) {
      if (lineChartInstance.current) {
        lineChartInstance.current.clear();
      }
      if (barChartInstance.current) {
        barChartInstance.current.clear();
      }
      return;
    }

    const years = selectedCountry.emissions.map((e) => e.year);
    const emissions = selectedCountry.emissions.map((e) => e.value);
    const gdpValues = selectedCountry.gdpPerCapita.map((g) => g.value);

    lineChartInstance.current?.setOption({
      grid: { left: 48, right: 12, top: 24, bottom: 28 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(30,30,46,0.95)',
        borderColor: '#3b82f6',
        textStyle: { color: '#ffffff', fontSize: 12 },
        formatter: (params: unknown) => {
          const p = params as Array<{ axisValue: string | number; data: number }>;
          if (!p || p.length === 0) return '';
          return `${p[0].axisValue}年<br/>排放量: <b style="color:#f43f5e">${formatNumber(p[0].data)} 万吨</b>`;
        },
      },
      xAxis: {
        type: 'category',
        data: years,
        axisLine: { lineStyle: { color: '#475569' } },
        axisLabel: { color: '#94a3b8', fontSize: 10, interval: 3 },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisLabel: { color: '#94a3b8', fontSize: 10 },
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
      },
      series: [
        {
          type: 'line',
          data: emissions,
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: { color: '#f43f5e', width: 2 },
          itemStyle: { color: '#f43f5e' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(244,63,94,0.25)' },
              { offset: 1, color: 'rgba(244,63,94,0.02)' },
            ]),
          },
        },
      ],
    });

    barChartInstance.current?.setOption({
      grid: { left: 48, right: 12, top: 24, bottom: 28 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(30,30,46,0.95)',
        borderColor: '#3b82f6',
        textStyle: { color: '#ffffff', fontSize: 12 },
        formatter: (params: unknown) => {
          const p = params as Array<{ axisValue: string | number; data: number }>;
          if (!p || p.length === 0) return '';
          return `${p[0].axisValue}年<br/>人均GDP: <b style="color:#3b82f6">$${formatNumber(p[0].data)}</b>`;
        },
      },
      xAxis: {
        type: 'category',
        data: years,
        axisLine: { lineStyle: { color: '#475569' } },
        axisLabel: { color: '#94a3b8', fontSize: 10, interval: 3 },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisLabel: { color: '#94a3b8', fontSize: 10 },
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
      },
      series: [
        {
          type: 'bar',
          data: gdpValues,
          barWidth: 12,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(59,130,246,0.9)' },
              { offset: 1, color: 'rgba(59,130,246,0.35)' },
            ]),
            borderRadius: [4, 4, 0, 0],
          },
        },
      ],
    });
  }, [selectedCountry]);

  return (
    <div className="detail-panel">
      <div className="detail-panel__header">
        <div className="detail-panel__title">国家详情</div>
        <div className="detail-panel__subtitle">2000 - 2023 年数据</div>
      </div>

      {selectedCountry ? (
        <div className="detail-panel__content">
          <div className="country-header">
            <div
              className="country-dot"
              style={{ backgroundColor: selectedCountry.color }}
            />
            <div>
              <div className="country-name">{selectedCountry.name}</div>
              <div className="country-code">
                {selectedCountry.code} · {selectedCountry.continent}
              </div>
            </div>
          </div>

          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">最新碳排放量</div>
              <div className="stat-value emission">
                {formatNumber(selectedCountry.latestEmission)}
              </div>
              <div className="stat-unit">万吨</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">最新人均 GDP</div>
              <div className="stat-value gdp">
                ${formatNumber(selectedCountry.latestGdp)}
              </div>
              <div className="stat-unit">美元 / 人</div>
            </div>
          </div>

          <div className="chart-section">
            <div className="chart-title">
              <span className="chart-legend emission-dot" />
              排放量趋势 (万吨)
            </div>
            <div ref={lineChartRef} className="chart-container" />
          </div>

          <div className="chart-section">
            <div className="chart-title">
              <span className="chart-legend gdp-dot" />
              人均 GDP 趋势 (美元)
            </div>
            <div ref={barChartRef} className="chart-container" />
          </div>

          <div className="trade-section">
            <div className="trade-title">主要贸易伙伴</div>
            <div className="trade-tags">
              {selectedCountry.tradePartners.map((code) => {
                const partner = allCountries.find((c) => c.code === code);
                return (
                  <span key={code} className="trade-tag">
                    {partner ? partner.name : code}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="detail-panel__empty">
          <div className="empty-icon">🌍</div>
          <div className="empty-title">点击泡泡查看详情</div>
          <div className="empty-hint">点击 3D 场景中的任意国家泡泡，此处将显示该国家历年碳排放与经济数据</div>
        </div>
      )}
    </div>
  );
}
