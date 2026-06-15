import React, { useState, useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { eventBus, EVENTS } from '../engine/EventBus';
import type { WeatherData } from '../types';
import { chartEngine } from '../engine/ChartEngine';

interface ChartPanelProps {
  weatherData: WeatherData | null;
}

const ChartPanel: React.FC<ChartPanelProps> = ({ weatherData }) => {
  const [chartOption, setChartOption] = useState<EChartsOption | null>(null);
  const chartRef = useRef<ReactECharts>(null);

  useEffect(() => {
    const handleChartDataReady = (option: EChartsOption) => {
      setChartOption(option);
    };

    eventBus.on(EVENTS.CHART_DATA_READY, handleChartDataReady);

    return () => {
      eventBus.off(EVENTS.CHART_DATA_READY, handleChartDataReady);
    };
  }, []);

  useEffect(() => {
    if (weatherData) {
      const option = chartEngine.generateLineChartOption(weatherData.hourly);
      setChartOption(option);
    }
  }, [weatherData]);

  return (
    <div className="chart-panel">
      <h3 className="section-title">24小时温湿度趋势</h3>
      <div className="chart-container">
        {chartOption ? (
          <ReactECharts
            ref={chartRef}
            option={chartOption}
            style={{ height: '100%', width: '100%' }}
            opts={{ renderer: 'canvas' }}
          />
        ) : (
          <div className="chart-placeholder">
            <div className="loading-spinner"></div>
            <span>加载图表数据中...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChartPanel;
