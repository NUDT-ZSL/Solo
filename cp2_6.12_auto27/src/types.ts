export interface DataRow {
  [key: string]: string | number;
}

export type ChartType = 'line' | 'bar' | 'scatter';

export interface ChartConfig {
  id: string;
  xField: string;
  yField: string;
  chartType: ChartType;
}

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export interface StoredState {
  columns: string[];
  data: DataRow[];
  charts: ChartConfig[];
}
