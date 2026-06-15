export interface MoodDataPoint {
  date: string;
  avgMood: number | null;
  count: number;
  notes: string[];
}

export interface ChartConfig {
  data: MoodDataPoint[];
  lineColor: string;
  dotColor: string;
  highlightColor: string;
  highlightedDates: string[];
}

export function generateLineChartConfig(
  data: MoodDataPoint[],
  highlightedDates: string[] = []
): ChartConfig {
  return {
    data,
    lineColor: '#8b5cf6',
    dotColor: '#8b5cf6',
    highlightColor: '#f97316',
    highlightedDates,
  };
}

export function getMoodColor(mood: number): string {
  if (mood <= 3) return '#ef4444';
  if (mood <= 6) return '#eab308';
  return '#22c55e';
}

export function getMoodCardBackground(avgMood: number | null): string {
  if (avgMood === null) return '#f3f4f6';
  if (avgMood <= 3) return 'linear-gradient(135deg, #fef2f2, #fee2e2)';
  if (avgMood <= 6) return 'linear-gradient(135deg, #fefce8, #fef9c3)';
  return 'linear-gradient(135deg, #f0fdf4, #dcfce7)';
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const weekday = weekdays[d.getDay()];
  return `${month}/${day} 周${weekday}`;
}
