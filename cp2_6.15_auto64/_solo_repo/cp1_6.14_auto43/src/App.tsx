import { useState, useEffect, useCallback } from 'react';
import RuleList from './components/RuleList';
import EditorPanel from './components/EditorPanel';
import LogPanel from './components/LogPanel';
import type { Rule, RequestLog, MatchCondition } from './types';
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
    const stop = startSimulation(rules, addLog, 5000);
    return stop;
  }, [rules, addLog]);

  const selectedRule = rules.find((r) => r.id === selectedRuleId) || null;

  const handleSelectRule = (id: string) => {
    setSelectedRuleId(id);
    setSidebarOpen(false);
  };

  const handleToggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const handleUpdateRule = (rule: Rule) => {
    setRules((prev) => prev.map((r) => (r.id === rule.id ? rule : r)));
  };

  const handleAddRule = () => {
    const newRule: Rule = {
      id: `rule-${Date.now()}`,
      name: '新规则',
      urlPattern: '/api/endpoint',
      method: 'GET',
      conditions: [],
      responseBody: { message: 'Hello MockMate' },
      responseHeaders: { 'Content-Type': 'application/json' },
      statusCode: 200,
      delay: 200,
      cacheEnabled: false,
      enabled: true
    };
    setRules((prev) => [...prev, newRule]);
    setSelectedRuleId(newRule.id);
  };

  const handleAddCondition = (ruleId: string) => {
    const newCondition: MatchCondition = {
      id: `cond-${Date.now()}`,
      type: 'query',
      key: '',
      operator: 'equals',
      value: ''
    };
    setRules((prev) =>
      prev.map((r) =>
        r.id === ruleId ? { ...r, conditions: [...r.conditions, newCondition] } : r
      )
    );
  };

  const handleUpdateCondition = (ruleId: string, conditionId: string, patch: Partial<MatchCondition>) => {
    setRules((prev) =>
      prev.map((r) =>
        r.id === ruleId
          ? {
              ...r,
              conditions: r.conditions.map((c) =>
                c.id === conditionId ? { ...c, ...patch } : c
              )
            }
          : r
      )
    );
  };

  const handleRemoveCondition = (ruleId: string, conditionId: string) => {
    setRules((prev) =>
      prev.map((r) =>
        r.id === ruleId
          ? { ...r, conditions: r.conditions.filter((c) => c.id !== conditionId) }
          : r
      )
    );
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const handleExport = () => {
    const exportData = rules.map((r) => ({
      name: r.name,
      urlPattern: r.urlPattern,
      method: r.method,
      matchConditions: r.conditions,
      responseBody: r.responseBody,
      responseHeaders: r.responseHeaders,
      statusCode: r.statusCode,
      delay: r.delay,
      cacheEnabled: r.cacheEnabled
    }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mockmate-rules-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredRules = rules.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.urlPattern.toLowerCase().includes(q) ||
      r.method.toLowerCase().includes(q)
    );
  });

  return (
    <div className="app-container">
      <div className="top-bar">
        <button className="hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <span className="hamburger-line" />
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>
        <div className="logo">
          <span className="logo-icon">M</span>
          MockMate
        </div>
        <div className="top-bar-spacer" />
        <button className="export-btn" onClick={handleExport}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          导出规则
        </button>
      </div>

      <div className="main-content">
        {sidebarOpen && (
          <div className="sidebar-overlay visible" onClick={() => setSidebarOpen(false)} />
        )}

        <div className={`rule-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <RuleList
            rules={filteredRules}
            selectedRuleId={selectedRuleId}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelectRule={handleSelectRule}
            onToggleRule={handleToggleRule}
            onAddRule={handleAddRule}
          />
        </div>

        <div className="editor-panel">
          <EditorPanel
            rule={selectedRule}
            onUpdateRule={handleUpdateRule}
            onAddCondition={handleAddCondition}
            onUpdateCondition={handleUpdateCondition}
            onRemoveCondition={handleRemoveCondition}
          />
        </div>
      </div>

      <LogPanel logs={logs} onClearLogs={handleClearLogs} />
    </div>
  );
}

export default App;
