export type LogLevel = 'error' | 'warn' | 'info';

export interface LogEntry {
  _id: string;
  timestamp: string;
  level: LogLevel;
  operator: string;
  action: string;
  requestParams: Record<string, unknown>;
  responseData: Record<string, unknown>;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface LogsResponse {
  data: LogEntry[];
  pagination: Pagination;
}

export interface DateItem {
  date: string;
  label: string;
  isToday: boolean;
}
