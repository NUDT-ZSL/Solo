import type { MuscleGroup } from '../../types';

const muscleGroupLabels: Record<MuscleGroup, string> = {
  chest: '胸部',
  back: '背部',
  shoulders: '肩部',
  biceps: '二头肌',
  triceps: '三头肌',
  legs: '腿部',
  core: '核心',
  glutes: '臀部',
};

export function getWeeklyFrequencyConfig(data: { date: string; count: number }[]): Record<string, any> {
  return {
    animationDuration: 500,
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const item = Array.isArray(params) ? params[0] : params;
        return `${item.axisValue}<br/>训练次数: ${item.value}`;
      },
    },
    grid: {
      left: 40,
      right: 20,
      top: 20,
      bottom: 30,
    },
    xAxis: {
      type: 'category',
      data: data.map(d => d.date),
      axisLabel: { color: '#333' },
      axisLine: { lineStyle: { color: '#ccc' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#333' },
      splitLine: { lineStyle: { color: '#eee' } },
    },
    series: [
      {
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: true,
        data: data.map(d => d.count),
        itemStyle: { color: '#FF6F00' },
        lineStyle: { color: '#FF6F00', width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(255,111,0,0.4)' },
              { offset: 1, color: 'rgba(255,111,0,0.05)' },
            ],
          },
        },
      },
    ],
  };
}

export function getMuscleGroupVolumeConfig(data: { muscle: string; volume: number }[]): Record<string, any> {
  return {
    animationDuration: 500,
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const item = Array.isArray(params) ? params[0] : params;
        return `${item.axisValue}<br/>总容量: ${item.value} kg`;
      },
    },
    grid: {
      left: 50,
      right: 20,
      top: 20,
      bottom: 30,
    },
    xAxis: {
      type: 'category',
      data: data.map(d => muscleGroupLabels[d.muscle as MuscleGroup] ?? d.muscle),
      axisLabel: { color: '#333' },
      axisLine: { lineStyle: { color: '#ccc' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#333', formatter: '{value} kg' },
      splitLine: { lineStyle: { color: '#eee' } },
    },
    series: [
      {
        type: 'bar',
        barWidth: 30,
        data: data.map(d => d.volume),
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#FF6F00' },
              { offset: 1, color: '#FF9E40' },
            ],
          },
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  };
}

const pieColors = ['#FF6F00', '#0D1B2A', '#FF9E40', '#1B2838', '#FFB74D', '#4A6FA5', '#81C784', '#E57373'];

export function getMuscleDistributionPieConfig(data: { muscle: string; volume: number }[]): Record<string, any> {
  return {
    animationDuration: 500,
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => `${params.name}<br/>训练量: ${params.value} kg (${params.percent}%)`,
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: { color: '#333', fontSize: 12 },
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: false,
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold',
          },
        },
        data: data.map((d, i) => ({
          name: muscleGroupLabels[d.muscle as MuscleGroup] ?? d.muscle,
          value: d.volume,
          itemStyle: { color: pieColors[i % pieColors.length] },
        })),
      },
    ],
  };
}

export function getMaxWeightProgressConfig(
  data: { date: string; maxWeight: number }[],
  exerciseName: string,
): Record<string, any> {
  return {
    animationDuration: 500,
    title: {
      text: exerciseName,
      textStyle: { color: '#333', fontSize: 14 },
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const item = Array.isArray(params) ? params[0] : params;
        return `${item.axisValue}<br/>最大重量: ${item.value} kg`;
      },
    },
    grid: {
      left: 50,
      right: 20,
      top: 40,
      bottom: 30,
    },
    xAxis: {
      type: 'category',
      data: data.map(d => d.date),
      axisLabel: { color: '#333' },
      axisLine: { lineStyle: { color: '#ccc' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#333', formatter: '{value} kg' },
      splitLine: { lineStyle: { color: '#eee' } },
    },
    series: [
      {
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        data: data.map(d => d.maxWeight),
        itemStyle: { color: '#0D1B2A' },
        lineStyle: { color: '#0D1B2A' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(13,27,42,0.15)' },
              { offset: 1, color: 'rgba(13,27,42,0.02)' },
            ],
          },
        },
      },
    ],
  };
}
