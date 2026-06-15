import type { EChartsOption } from 'echarts';
import type { HourlyData } from '../types';
import { eventBus, EVENTS } from './EventBus';

export class ChartEngine {
  constructor() {
    eventBus.on(EVENTS.WEATHER_DATA_UPDATED, this.handleWeatherData.bind(this));
  }

  private handleWeatherData(data: { hourly: HourlyData[] }): void {
    const option = this.generateLineChartOption(data.hourly);
    eventBus.emit(EVENTS.CHART_DATA_READY, option);
  }

  generateLineChartOption(hourlyData: HourlyData[]): EChartsOption {
    const alignedData = hourlyData.map((item) => {
      const alignedTs = Math.round(item.timestamp / 7200000) * 7200000;
      return { ...item, timestamp: alignedTs };
    });
    const tempData = alignedData.map((item) => [item.timestamp, item.temperature]);
    const humidData = alignedData.map((item) => [item.timestamp, item.humidity]);

    return {
      backgroundColor: '#f1f5f9',
      animationDuration: 800,
      animationEasing: 'cubicOut',
      legend: {
        data: ['温度 (°C)', '湿度 (%)'],
        left: 20,
        top: 10,
        textStyle: {
          fontSize: 13,
          color: '#475569',
        },
      },
      grid: {
        left: 60,
        right: 60,
        top: 60,
        bottom: 40,
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#ffffff',
        borderWidth: 0,
        textStyle: {
          color: '#1e293b',
          fontSize: 13,
        },
        extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-radius: 8px; padding: 12px 16px;',
        axisPointer: {
          type: 'cross',
          lineStyle: {
            color: '#94a3b8',
            width: 1,
            type: 'dashed',
          },
        },
      },
      xAxis: {
        type: 'time',
        interval: 7200000,
        axisLine: {
          lineStyle: {
            color: '#cbd5e1',
          },
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          color: '#64748b',
          fontSize: 12,
          formatter: '{HH}:{mm}',
        },
        splitLine: {
          show: false,
        },
      },
      yAxis: [
        {
          type: 'value',
          name: '温度 (°C)',
          nameTextStyle: {
            color: '#3b82f6',
            fontSize: 12,
            padding: [0, 0, 10, 0],
          },
          position: 'left',
          axisLine: {
            show: true,
            lineStyle: {
              color: '#3b82f6',
            },
          },
          axisLabel: {
            color: '#3b82f6',
            fontSize: 12,
            formatter: '{value}°',
          },
          splitLine: {
            lineStyle: {
              color: '#e2e8f0',
              type: 'dashed',
            },
          },
        },
        {
          type: 'value',
          name: '湿度 (%)',
          nameTextStyle: {
            color: '#10b981',
            fontSize: 12,
            padding: [0, 0, 10, 0],
          },
          position: 'right',
          axisLine: {
            show: true,
            lineStyle: {
              color: '#10b981',
            },
          },
          axisLabel: {
            color: '#10b981',
            fontSize: 12,
            formatter: '{value}%',
          },
          splitLine: {
            show: false,
          },
        },
      ],
      series: [
        {
          name: '温度 (°C)',
          type: 'line',
          data: tempData,
          yAxisIndex: 0,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: {
            color: '#3b82f6',
            width: 2,
          },
          itemStyle: {
            color: '#3b82f6',
            borderWidth: 2,
            borderColor: '#ffffff',
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(59, 130, 246, 0.25)' },
                { offset: 1, color: 'rgba(59, 130, 246, 0.02)' },
              ],
            },
          },
        },
        {
          name: '湿度 (%)',
          type: 'line',
          data: humidData,
          yAxisIndex: 1,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: {
            color: '#10b981',
            width: 2,
          },
          itemStyle: {
            color: '#10b981',
            borderWidth: 2,
            borderColor: '#ffffff',
          },
        },
      ],
    };
  }

  destroy(): void {
    eventBus.off(EVENTS.WEATHER_DATA_UPDATED, this.handleWeatherData.bind(this));
  }
}

export const chartEngine = new ChartEngine();
