export type ChartType = 'bar' | 'line' | 'pie' | 'scatter';

export interface ChartDataPoint {
  x?: number | string;
  y?: number;
  label?: string;
  value?: number;
}

export interface ChartConfig {
  type: ChartType;
  title: string;
  colorScheme: string;
  labels: string[];
  datasets: {
    label: string;
    data: (number | ChartDataPoint)[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
  }[];
  datasetId?: string;
  xColumn?: string;
  yColumns?: string[];
}

export interface JumpCondition {
  id: string;
  sourcePageId: string;
  targetPageId: string;
  field: 'label' | 'value';
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=';
  value: string | number;
}

export interface Page {
  id: string;
  title: string;
  description: string;
  chart: ChartConfig;
}

export interface Story {
  id?: string;
  shortCode?: string;
  title: string;
  pages: Page[];
  jumpConditions: JumpCondition[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Dataset {
  name: string;
  description: string;
  labels: string[];
  columns: Record<string, number[]>;
}

export interface SyncMessage {
  type: 'pageUpdate' | 'jumpConditionUpdate' | 'storyUpdate';
  payload: any;
  timestamp: number;
  clientId: string;
}

export type { };
