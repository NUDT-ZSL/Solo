import { useState, useEffect, useCallback } from 'react';
import RuleList from './components/RuleList';
import EditorPanel from './components/EditorPanel';
import LogPanel from './components/LogPanel';
import type { Rule, RequestLog } from './types';
import { startSimulation } from './utils/mockServer';

const initialRules: Rule[] = [
  {
    id: 'rule-1',
    name: '获取用户列表',
    urlPattern: '/api/users',
    method: 'GET',
    conditions: [],
    responseBody: {
      code: 0,
      message: 'success',
      data: {
        total: 100,
        page: 1,
        pageSize: 10,
        list: [
          { id: 1, name: '张三', email: 'zhangsan@example.com', role: 'admin' },
          { id: 2, name: '李四', email: 'lisi@example.com', role: 'user' },
          { id: 3, name: '王五', email: 'wangwu@example.com', role: 'user' }
        ]
      }
    },
    responseHeaders: { 'Content-Type': 'application/json' },
    statusCode: 200,
    delay: 500,
    cacheEnabled: false,
    enabled: true
  },
  {
    id: 'rule-2',
    name: '获取用户详情',
    urlPattern: '/api/users/:id',
    method: 'GET',
    conditions: [],
    responseBody: {
      code: 0,
      data: {
        id: 123,
        name: '张三',
        email: 'zhangsan@example.com',
        avatar: 'https://example.com/avatar.png',
        createdAt: '2024-01-15T10:00:00Z',
        profile: {
          bio: '前端开发工程师',
          location: '北京',
          skills: ['React', 'TypeScript', 'Vite']
        }
      }
    },
    responseHeaders: { 'Content-Type': 'application/json' },
    statusCode: 200,
    delay: 300,
    cacheEnabled: true,
    enabled: true
  },
  {
    id: 'rule-3',
    name: '获取文章列表',
    urlPattern: '/api/posts',
    method: 'GET',
    conditions: [
      {
        id: 'cond-1',
        type: 'query',
        key: 'category',
        operator: 'equals',
        value: 'tech'
      }
    ],
    responseBody: {
      code: 0,
      data: [
        { id: 1, title: 'React 18新特性解析', author: '张三', views: 1200 },
        { id: 2, title: 'TypeScript高级技巧', author: '李四', views: 856 }
      ]
    },
    responseHeaders: { 'Content-Type': 'application/json' },
    statusCode: 200,
    delay: 800,
    cacheEnabled: false,
    enabled: true
  },
  {
    id: 'rule-4',
    name: '用户登录',
    urlPattern: '/api/login',
    method: 'POST',
    conditions: [],
    responseBody: {
      code: 0,
      message: '登录成功',
      data: {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-token',
        expiresIn: 7200,
        user: { id: 1, name: '张三' }
      }
    },
    responseHeaders: {
      'Content-Type': 'application/json',
      'X-Auth-Token': 'mock-token-12345'
    },
    statusCode: 200,
    delay: 1200,
    cacheEnabled: false,
    enabled: false
  },
  {
    id: 'rule-5',
    name: '删除用户',
    urlPattern: '/api/users/:id',
    method: 'DELETE',
    conditions: [],
    responseBody: {
      code: 0,
      message: '删除成功'
    },
    responseHeaders: { 'Content-Type': 'application/json' },
    statusCode: 204,
    delay: 200,
    cacheEnabled: false,
    enabled: true
  }
];

function App() {
  const [rules, setRules] = useState<Rule[]>(initialRules);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(initialRules[0]?.id || null);
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const addLog = useCallback((log: RequestLog) => {
    setLogs((prev) => {
      const next = [log, ...prev];
      if (next.length > 50) {
        return next.slice(0, 50);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const stop = startSimulation(rules, addLog, 50