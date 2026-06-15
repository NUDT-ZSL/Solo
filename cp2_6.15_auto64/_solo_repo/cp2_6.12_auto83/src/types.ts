export interface DataPoint {
  date: string;
  value: number;
  category: string;
}

export type ChartType = 'timeline' | 'bar' | 'line';

export interface ChartItem {
  id: string;
  type: ChartType;
  title: string;
}

export interface AnnotationItem {
  id: string;
  chartId: string;
  text: string;
  fontSize: number;
  color: string;
  align: 'left' | 'center' | 'right';
}

export type StoryboardItemType = 'chart' | 'annotation';

export interface StoryboardItem {
  id: string;
  type: StoryboardItemType;
  refId: string;
}

export interface ParsedDataset {
  data: DataPoint[];
  categories: string[];
  dateRange: { start: string; end: string };
  valueRange: { min: number; max: number };
}
