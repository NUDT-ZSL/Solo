import type { Rule } from '../types';

interface RuleListProps {
  rules: Rule[];
  selectedRuleId: string | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectRule: (id: string) => void;
  onToggleRule: (id: string) => void;
  onAddRule: () => void;
}

export default function RuleList({
  rules,
  selectedRuleId,
  searchQuery,
  onSearchChange,
  onSelectRule,
  onToggleRule,
  onAddRule
}: RuleListProps) {
  return (
    <>
      <div className="sidebar-header">
        <div className="sidebar-title">
          <span>规则列表 ({rules.length})</span>
          <button className="add-rule-btn" onClick={onAddRule} title="添加规则">
            +
          </button>
        </div>
        <input
          className="search-input"
          type="text"
          placeholder="搜索规则名称、URL、方法..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="rule-list">
        {rules.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#52525b', padding: '20px 12px', fontSize: '13px' }}>
            {searchQuery ? '未找到匹配的规则' : '暂无规则，点击 + 创建'}
          </div>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              className={`rule-card ${selectedRuleId === rule.id ? 'selected' : ''} ${!rule.enabled ? 'disabled' : ''}`}
              onClick={() => onSelectRule(rule.id)}
            >
              <div className="rule-card-header">
                <span className="rule-name" title={rule.name}>
                  {rule.name}
                </span>
                <div
                  className={`toggle ${rule.enabled ? 'toggle-enabled' : 'toggle-disabled'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleRule(rule.id);
                  }}
                >
                  <div
                    className="toggle-slider"
                    style={{ transform: `translateX(${rule.enabled ? '3px' : '-3px'})` }}
                  />
                </div>
              </div>
              <div className="rule-url" title={rule.urlPattern}>
                <span className={`rule-method method-${rule.method}`}>{rule.method}</span>
                &nbsp;&nbsp;{rule.urlPattern}
              </div>
              <div className="rule-meta">
                <span>延迟 {rule.delay}ms</span>
                <span>·</span>
                <span>状态码 {rule.statusCode}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
