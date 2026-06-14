export type NodeType =
  | 'csv-reader'
  | 'filter'
  | 'merge-columns'
  | 'chart'
  | 'table';

export interface Port {
  id: string;
  label: string;
}

export interface NodePosition {
  x: number;
  y: number;
}

export interface CSVReaderConfig {
  fileName?: string;
  fileContent?: string;
  delimiter: string;
  hasHeader: boolean;
}

export interface FilterConfig {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
  value: string;
}

export interface MergeColumnsConfig {
  sourceColumns: string[];
  targetColumn: string;
  separator: string;
}

export interface ChartConfig {
  chartType: 'bar' | 'line' | 'scatter';
  xField: string;
  yField: string;
  title: string;
}

export interface TableConfig {
  pageSize: number;
}

export type NodeConfig =
  | CSVReaderConfig
  | FilterConfig
  | MergeColumnsConfig
  | ChartConfig
  | TableConfig;

export interface NodeData {
  id: string;
  type: NodeType;
  position: NodePosition;
  config: NodeConfig;
  status: 'idle' | 'running' | 'success' | 'error';
  errorMessage?: string;
}

export interface Connection {
  id: string;
  sourceNodeId: string;
  sourcePort: string;
  targetNodeId: string;
  targetPort: string;
}

export interface DataRow {
  [key: string]: string | number;
}

export interface NodeOutput {
  data: DataRow[];
  columns: string[];
  chartData?: ChartDataPoint[];
}

export interface ChartDataPoint {
  x: string | number;
  y: number;
}

export interface PipelineState {
  nodes: NodeData[];
  connections: Connection[];
  selectedNodeId: string | null;
  executing: boolean;
  results: Map<string, NodeOutput>;
}

export interface ToolNodeDefinition {
  type: NodeType;
  label: string;
  icon: string;
  description: string;
  hasInput: boolean;
  hasOutput: boolean;
  defaultConfig: NodeConfig;
}

export const TOOL_NODES: ToolNodeDefinition[] = [
  {
    type: 'csv-reader',
    label: '读取CSV',
    icon: '📄',
    description: '从CSV文件读取数据',
    hasInput: false,
    hasOutput: true,
    defaultConfig: {
      delimiter: ',',
      hasHeader: true,
    } as CSVReaderConfig,
  },
  {
    type: 'filter',
    label: '过滤行',
    icon: '🔍',
    description: '按条件筛选数据行',
    hasInput: true,
    hasOutput: true,
    defaultConfig: {
      field: '',
      operator: 'equals',
      value: '',
    } as FilterConfig,
  },
  {
    type: 'merge-columns',
    label: '合并列',
    icon: '🔗',
    description: '合并多个列为一列',
    hasInput: true,
    hasOutput: true,
    defaultConfig: {
      sourceColumns: [],
      targetColumn: 'merged',
      separator: ' ',
    } as MergeColumnsConfig,
  },
  {
    type: 'chart',
    label: '绘制图表',
    icon: '📊',
    description: '生成数据可视化图表',
    hasInput: true,
    hasOutput: false,
    defaultConfig: {
      chartType: 'bar',
      xField: '',
      yField: '',
      title: '数据图表',
    } as ChartConfig,
  },
  {
    type: 'table',
    label: '数据表格',
    icon: '📋',
    description: '以表格形式展示数据',
    hasInput: true,
    hasOutput: false,
    defaultConfig: {
      pageSize: 20,
    } as TableConfig,
  },
];
