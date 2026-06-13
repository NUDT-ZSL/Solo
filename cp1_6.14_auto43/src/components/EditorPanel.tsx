import { useState, useEffect, useRef, useMemo } from 'react';
import type { Rule, MatchCondition, TreeNode, HttpMethod } from '../types';
import { parseToTree, rebuildFromTree, updateNodeInTree, toggleCollapse } from '../utils/jsonTreeParser';

interface EditorPanelProps {
  rule: Rule | null;
  onUpdateRule: (rule: Rule) => void;
  onAddCondition: (ruleId: string) => void;
  onUpdateCondition: (ruleId: string, conditionId: string, patch: Partial<MatchCondition>) => void;
  onRemoveCondition: (ruleId: string, conditionId: string) => void;
}

type TabKey = 'match' | 'response' | 'config';

interface JsonTreeProps {
  node: TreeNode;
  editingId: string | null;
  highlightedIds: Set<string>;
  onStartEdit: (id: string) => void;
  onCommitEdit: (id: string, value: any, newType?: TreeNode['type']) => void;
  onCancelEdit: () => void;
  onToggleCollapse: (id: string) => void;
  depth?: number;
}

function JsonTreeNode({
  node,
  editingId,
  highlightedIds,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  onToggleCollapse,
  depth = 0
}: JsonTreeProps) {
  const isEditing = editingId === node.id;
  const isHighlighted = highlightedIds.has(node.id);
  const hasChildren = (node.type === 'object' || node.type === 'array') && node.children && node.children.length > 0;
  const isLeaf = !hasChildren;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleValueClick = () => {
    if (!isEditing) {
      onStartEdit(node.id);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    let newValue: any = e.target.value;
    let newType: TreeNode['type'] = node.type;

    if (node.type === 'number') {
      const num = Number(newValue);
      newValue = isNaN(num) ? newValue : num;
    } else if (node.type === 'boolean') {
      newValue = newValue === 'true' || newValue === true;
    } else if (node.type === 'null') {
      newValue = null;
    }

    onCommitEdit(node.id, newValue, newType);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      onCancelEdit();
    }
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as TreeNode['type'];
    let newValue: any = node.value;
    if (newType === 'null') newValue = null;
    else if (newType === 'number') newValue = 0;
    else if (newType === 'boolean') newValue = false;
    else if (newType === 'string') newValue = '';
    else if (newType === 'object') newValue = {};
    else if (newType === 'array') newValue = [];
    onCommitEdit(node.id, newValue, newType);
  };

  const renderValue = () => {
    if (node.type === 'object') {
      const count = node.children?.length || 0;
      return (
        <>
          <span className="tree-value-bracket">{'{'}</span>
          {!node.collapsed && count === 0 && <span className="tree-value-bracket">{'}'}</span>}
          {node.collapsed && <span className="tree-value-bracket">{`} ${count} 项`}</span>}
        </>
      );
    }
    if (node.type === 'array') {
      const count = node.children?.length || 0;
      return (
        <>
          <span className="tree-value-bracket">[</span>
          {!node.collapsed && count === 0 && <span className="tree-value-bracket">]</span>}
          {node.collapsed && <span className="tree-value-bracket">{`] ${count} 项`}</span>}
        </>
      );
    }

    const valueClass = `tree-value tree-value-${node.type}`;
    let displayValue = '';
    if (node.type === 'string') displayValue = `"${String(node.value ?? '')}"`;
    else if (node.type === 'null') displayValue = 'null';
    else displayValue = String(node.value ?? '');

    if (isEditing) {
      let editValue = '';
      if (node.type !== 'null') {
        editValue = node.value === null || node.value === undefined ? '' : String(node.value);
      }
      return (
        <>
          <input
            ref={inputRef}
            className="tree-value-editor"
            defaultValue={editValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
          {isLeaf && depth > 0 && (
            <select
              className="type-select"
              value={node.type}
              onChange={handleTypeChange}
              onClick={(e) => e.stopPropagation()}
            >
              <option value="string">string</option>
              <option value="number">number</option>
              <option value="boolean">boolean</option>
              <option value="null">null</option>
            </select>
          )}
        </>
      );
    }

    return (
      <span
        className={`${valueClass} ${isHighlighted ? 'highlight' : ''}`}
        onClick={handleValueClick}
      >
        {displayValue}
      </span>
    );
  };

  return (
    <div>
      <div className="tree-node" style={{ paddingLeft: depth === 0 ? 0 : 0 }}>
        <button
          className={`tree-toggle ${isLeaf ? 'leaf' : ''}`}
          onClick={() => !isLeaf && onToggleCollapse(node.id)}
        >
          {isLeaf ? '·' : node.collapsed ? '▶' : '▼'}
        </button>
        {depth > 0 && (
          <>
            <span className="tree-key">{node.key}</span>
            <span className="tree-colon">:</span>
          </>
        )}
        {renderValue()}
      </div>
      {hasChildren && !node.collapsed && (
        <div className="tree-node-children">
          {node.children!.map((child) => (
            <JsonTreeNode
              key={child.id}
              node={child}
              editingId={editingId}
              highlightedIds={highlightedIds}
              onStartEdit={onStartEdit}
              onCommitEdit={onCommitEdit}
              onCancelEdit={onCancelEdit}
              onToggleCollapse={onToggleCollapse}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
      {hasChildren && !node.collapsed && (
        <div className="tree-node" style={{ paddingLeft: '24px' }}>
          <span className="tree-toggle leaf">·</span>
          <span className="tree-value-bracket">
            {node.type === 'object' ? '}' : ']'}
          </span>
        </div>
      )}
    </div>
  );
}

export default function EditorPanel({
  rule,
  onUpdateRule,
  onAddCondition,
  onUpdateCondition,
  onRemoveCondition
}: EditorPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('match');
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (rule) {
      setTree(parseToTree(rule.responseBody));
      setEditingId(null);
      setHighlightedIds(new Set());
    } else {
      setTree(null);
    }
  }, [rule?.id, rule?.responseBody ? JSON.stringify(rule.responseBody) : undefined]);

  const handleStartEdit = (id: string) => {
    setEditingId(id);
  };

  const handleCommitEdit = (id: string, newValue: any, newType?: TreeNode['type']) => {
    if (!tree || !rule) return;

    const newTree = updateNodeInTree(tree, id, newValue, newType);
    setTree(newTree);

    const newBody = rebuildFromTree(newTree);
    onUpdateRule({ ...rule, responseBody: newBody });

    setEditingId(null);

    setHighlightedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    window.setTimeout(() => {
      setHighlightedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 600);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleToggleCollapse = (id: string) => {
    if (!tree) return;
    setTree(toggleCollapse(tree, id));
  };

  const updateRuleField = <K extends keyof Rule>(field: K, value: Rule[K]) => {
    if (!rule) return;
    onUpdateRule({ ...rule, [field]: value });
  };

  const updateResponseHeader = (key: string, value: string) => {
    if (!rule) return;
    const newHeaders = { ...rule.responseHeaders, [key]: value };
    onUpdateRule({ ...rule, responseHeaders: newHeaders });
  };

  const removeResponseHeader = (key: string) => {
    if (!rule) return;
    const newHeaders = { ...rule.responseHeaders };
    delete newHeaders[key];
    onUpdateRule({ ...rule, responseHeaders: newHeaders });
  };

  const addResponseHeader = () => {
    if (!rule) return;
    updateResponseHeader('X-Custom-Header', '');
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'match', label: '请求匹配条件' },
    { key: 'response', label: '响应内容' },
    { key: 'config', label: '响应配置' }
  ];

  if (!rule) {
    return (
      <div className="editor-empty">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>📋</div>
          <div>请选择一条规则进行编辑，或新建规则</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {activeTab === 'match' && (
          <>
            <div className="form-section">
              <div className="form-section-title">基本匹配</div>
              <div className="form-row">
                <div className="form-group" style={{ flex: '0 0 140px' }}>
                  <label className="form-label">请求方法</label>
                  <select
                    className="form-select"
                    value={rule.method}
                    onChange={(e) => updateRuleField('method', e.target.value as HttpMethod)}
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">规则名称</label>
                  <input
                    className="form-input"
                    type="text"
                    value={rule.name}
                    onChange={(e) => updateRuleField('name', e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">URL 模式（支持 :params 占位符和 * 通配符）</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="/api/users/:id 或 /api/*"
                  value={rule.urlPattern}
                  onChange={(e) => updateRuleField('urlPattern', e.target.value)}
                />
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-title">高级匹配条件（全部满足才匹配）</div>
              {rule.conditions.length === 0 ? (
                <div style={{ color: '#52525b', fontSize: '13px', padding: '8px 0' }}>
                  暂无匹配条件，仅按 URL 和方法匹配
                </div>
              ) : (
                rule.conditions.map((cond) => (
                  <div className="condition-row" key={cond.id}>
                    <select
                      className="condition-select condition-type"
                      value={cond.type}
                      onChange={(e) =>
                        onUpdateCondition(rule.id, cond.id, {
                          type: e.target.value as MatchCondition['type']
                        })
                      }
                    >
                      <option value="url">URL</option>
                      <option value="query">Query</option>
                      <option value="header">Header</option>
                      <option value="body">Body</option>
                    </select>
                    <select
                      className="condition-select condition-operator"
                      value={cond.operator}
                      onChange={(e) =>
                        onUpdateCondition(rule.id, cond.id, {
                          operator: e.target.value as MatchCondition['operator']
                        })
                      }
                    >
                      <option value="equals">等于</option>
                      <option value="contains">包含</option>
                      <option value="regex">正则</option>
                    </select>
                    <input
                      className="condition-input condition-key"
                      type="text"
                      placeholder="字段名"
                      value={cond.key}
                      onChange={(e) => onUpdateCondition(rule.id, cond.id, { key: e.target.value })}
                    />
                    <input
                      className="condition-input condition-value"
                      type="text"
                      placeholder="期望值"
                      value={cond.value}
                      onChange={(e) => onUpdateCondition(rule.id, cond.id, { value: e.target.value })}
                    />
                    <button
                      className="remove-condition-btn"
                      onClick={() => onRemoveCondition(rule.id, cond.id)}
                    >
                      删除
                    </button>
                  </div>
                ))
              )}
              <button className="add-condition-btn" onClick={() => onAddCondition(rule.id)}>
                + 添加匹配条件
              </button>
            </div>
          </>
        )}

        {activeTab === 'response' && (
          <div className="form-section">
            <div className="form-section-title">响应体（点击值可直接编辑）</div>
            <div className="json-tree">
              {tree && (
                <JsonTreeNode
                  node={tree}
                  editingId={editingId}
                  highlightedIds={highlightedIds}
                  onStartEdit={handleStartEdit}
                  onCommitEdit={handleCommitEdit}
                  onCancelEdit={handleCancelEdit}
                  onToggleCollapse={handleToggleCollapse}
                />
              )}
            </div>
            <div style={{ marginTop: '24px' }}>
              <div className="form-section-title">响应头 Headers</div>
              {Object.entries(rule.responseHeaders).map(([k, v]) => (
                <div className="condition-row" key={k}>
                  <input
                    className="condition-input condition-key"
                    style={{ width: '180px' }}
                    type="text"
                    placeholder="Header 名称"
                    value={k}
                    onChange={(e) => {
                      if (e.target.value === k) return;
                      const newHeaders = { ...rule.responseHeaders };
                      newHeaders[e.target.value] = v;
                      delete newHeaders[k];
                      onUpdateRule({ ...rule, responseHeaders: newHeaders });
                    }}
                  />
                  <input
                    className="condition-input condition-value"
                    type="text"
                    placeholder="Header 值"
                    value={v}
                    onChange={(e) => updateResponseHeader(k, e.target.value)}
                  />
                  <button className="remove-condition-btn" onClick={() => removeResponseHeader(k)}>
                    删除
                  </button>
                </div>
              ))}
              <button className="add-condition-btn" onClick={addResponseHeader}>
                + 添加 Header
              </button>
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <>
            <div className="form-section">
              <div className="form-section-title">基础配置</div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">状态码 Status Code</label>
                  <input
                    className="form-input"
                    type="number"
                    min={100}
                    max={599}
                    value={rule.statusCode}
                    onChange={(e) => updateRuleField('statusCode', Number(e.target.value) || 200)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">响应延迟（毫秒）</label>
                  <input
                    className="form-input"
                    type="number"
                    min={0}
                    max={10000}
                    value={rule.delay}
                    onChange={(e) => updateRuleField('delay', Number(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>
            <div className="form-section">
              <div className="form-section-title">高级选项</div>
              <div className="checkbox-row">
                <input
                  id="cache-toggle"
                  className="checkbox"
                  type="checkbox"
                  checked={rule.cacheEnabled}
                  onChange={(e) => updateRuleField('cacheEnabled', e.target.checked)}
                />
                <label className="checkbox-label" htmlFor="cache-toggle">
                  启用响应缓存（相同请求返回相同结果，模拟服务端缓存行为）
                </label>
              </div>
              <div className="checkbox-row">
                <input
                  id="enabled-toggle"
                  className="checkbox"
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={(e) => updateRuleField('enabled', e.target.checked)}
                />
                <label className="checkbox-label" htmlFor="enabled-toggle">
                  启用此规则（关闭后不参与匹配）
                </label>
              </div>
            </div>
            <div className="form-section">
              <div className="form-section-title">当前状态预览</div>
              <div
                style={{
                  background: '#1e1e2e',
                  borderRadius: '8px',
                  padding: '16px',
                  fontSize: '13px',
                  lineHeight: '1.8',
                  color: '#a1a1aa',
                  fontFamily: "'SF Mono', Monaco, monospace"
                }}
              >
                <div>方法: <span style={{ color: '#3b82f6' }}>{rule.method}</span></div>
                <div>URL: <span style={{ color: '#e5e5e5' }}>{rule.urlPattern}</span></div>
                <div>状态: <span style={{ color: rule.enabled ? '#22c55e' : '#ef4444' }}>{rule.enabled ? '已启用' : '已禁用'}</span></div>
                <div>延迟: <span style={{ color: '#fbbf24' }}>{rule.delay}ms</span></div>
                <div>匹配条件: <span style={{ color: '#a5b4fc' }}>{rule.conditions.length} 条</span></div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
