export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface MatchCondition {
  id: string;
  type: 'url' | 'query' | 'header' | 'body';
  key: string;
  operator: 'equals' | 'contains' | 'regex';
  value: string;
}

export interface Rule {
  id: string;
  name: string;
  urlPattern: string;
  method: HttpMethod;
  conditions: MatchCondition[];
  responseBody: any;
  responseHeaders: Record<string, string>;
  statusCode: number;
  delay: number;
  cacheEnabled: boolean;
  enabled: boolean;
}

export interface MockRequest {
  url: string;
  method: HttpMethod;
  query: Record<string, string>;
  headers: Record<string, string>;
  body?: any;
  timestamp: number;
}

export interface MockResponse {
  statusCode: number;
  body: any;
  headers: Record<string, string>;
  matchedRuleId?: string;
  matchedRuleName?: string;
  delay: number;
}

export interface RequestLog {
  id: string;
  timestamp: number;
  method: HttpMethod;
  url: string;
  matchedRuleName: string | null;
  statusCode: number;
  delay: number;
  isError: boolean;
  isWarning: boolean;
}

export interface TreeNode {
  key: string;
  value: any;
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  children?: TreeNode[];
  collapsed?: boolean;
  id: string;
}
