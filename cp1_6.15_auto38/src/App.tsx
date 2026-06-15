import React, { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AccessibleButton } from './components/AccessibleButton';
import { AccessibleDialog } from './components/AccessibleDialog';
import { AccessibleToast, ToastItem } from './components/AccessibleToast';
import { a11yChecker, A11yReport } from './engine/a11yChecker';
import { focusManager } from './engine/focusManager';

type Severity = 'error' | 'warning' | 'success';

const App: React.FC = () => {
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toastMessages, setToastMessages] = useState<ToastItem[]>([]);
  const [focusPolicyEnabled, setFocusPolicyEnabled] = useState(true);
  const [reports, setReports] = useState<A11yReport[]>([]);
  const [isResetting, setIsResetting] = useState(false);
  const [activeTab, setActiveTab] = useState<'button' | 'dialog' | 'toast'>('button');

  const buttonRef = useRef<HTMLButtonElement>(null);
  const dialogTriggerRef = useRef<HTMLButtonElement>(null);
  const toastTriggerRef = useRef<HTMLButtonElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  const addReport = useCallback((report: A11yReport) => {
    setReports((prev) => [report, ...prev].slice(0, 50));
  }, []);

  const runButtonCheck = useCallback(() => {
    if (buttonRef.current) {
      const report = a11yChecker.parse(buttonRef.current, '可访问按钮');
      addReport(report);
    }
  }, [addReport]);

  const runDialogCheck = useCallback(() => {
    const dialogElement = document.querySelector('[role="dialog"]') as HTMLElement | null;
    if (dialogElement || !dialogOpen) {
      const report = a11yChecker.parse(dialogElement, '可访问弹窗');
      addReport(report);
    }
  }, [dialogOpen, addReport]);

  const runToastCheck = useCallback(() => {
    const toastContainer = document.querySelector('.toast-container') as HTMLElement | null;
    if (toastContainer) {
      const report = a11yChecker.parse(toastContainer, '可访问通知');
      addReport(report);
    }
  }, [addReport]);

  useEffect(() => {
    const timer = setTimeout(() => {
      runButtonCheck();
    }, 100);
    return () => clearTimeout(timer);
  }, [runButtonCheck]);

  const handleButtonClick = useCallback(() => {
    runButtonCheck();
  }, [runButtonCheck]);

  const handleToggleDisabled = useCallback(() => {
    setButtonDisabled((prev) => {
      const newValue = !prev;
      setTimeout(() => runButtonCheck(), 0);
      return newValue;
    });
  }, [runButtonCheck]);

  const handleDialogToggle = useCallback(() => {
    setDialogOpen((prev) => {
      const newValue = !prev;
      if (newValue) {
        setTimeout(() => runDialogCheck(), 50);
      } else {
        runDialogCheck();
      }
      return newValue;
    });
  }, [runDialogCheck]);

  const handleShowToast = useCallback(() => {
    const newToast: ToastItem = {
      id: uuidv4(),
      message: `这是第 ${toastMessages.length + 1} 条通知消息`,
      duration: 4000,
    };
    setToastMessages((prev) => [...prev, newToast]);
    setTimeout(() => runToastCheck(), 50);
  }, [toastMessages.length, runToastCheck]);

  const handleRemoveToast = useCallback(
    (id: string) => {
      setToastMessages((prev) => prev.filter((msg) => msg.id !== id));
    },
    []
  );

  useEffect(() => {
    if (toastMessages.length > 0) {
      const timer = setTimeout(() => runToastCheck(), 100);
      return () => clearTimeout(timer);
    }
  }, [toastMessages.length, runToastCheck]);

  const handleFocusPolicyToggle = useCallback(() => {
    setFocusPolicyEnabled((prev) => !prev);
  }, []);

  const handleReset = useCallback(() => {
    setIsResetting(true);
    setTimeout(() => {
      setButtonDisabled(false);
      setDialogOpen(false);
      setToastMessages([]);
      setFocusPolicyEnabled(true);
      setReports([]);
      focusManager.clearHistory();
      setIsResetting(false);
      setTimeout(() => runButtonCheck(), 100);
    }, 500);
  }, [runButtonCheck]);

  const getSeverityLabel = (severity: Severity): string => {
    switch (severity) {
      case 'error':
        return '错误';
      case 'warning':
        return '警告';
      case 'success':
        return '通过';
    }
  };

  const getSeverityColor = (severity: Severity): string => {
    switch (severity) {
      case 'error':
        return '#ff4d4f';
      case 'warning':
        return '#faad14';
      case 'success':
        return '#52c41a';
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">无障碍交互组件评估面板</h1>
        <p className="app-subtitle">实时测试和对比组件的可访问性表现</p>
      </header>

      <div className="main-content">
        <aside className="component-panel">
          <div className="panel-tabs">
            <button
              className={`tab-btn ${activeTab === 'button' ? 'active' : ''}`}
              onClick={() => setActiveTab('button')}
              aria-selected={activeTab === 'button'}
              role="tab"
            >
              按钮
            </button>
            <button
              className={`tab-btn ${activeTab === 'dialog' ? 'active' : ''}`}
              onClick={() => setActiveTab('dialog')}
              aria-selected={activeTab === 'dialog'}
              role="tab"
            >
              弹窗
            </button>
            <button
              className={`tab-btn ${activeTab === 'toast' ? 'active' : ''}`}
              onClick={() => setActiveTab('toast')}
              aria-selected={activeTab === 'toast'}
              role="tab"
            >
              通知
            </button>
          </div>

          <div className="panel-content">
            {activeTab === 'button' && (
              <section className="component-section" aria-labelledby="button-section-title">
                <h3 id="button-section-title" className="section-title">
                  可访问按钮
                </h3>
                <div className="component-demo">
                  <AccessibleButton
                    ref={buttonRef}
                    onClick={handleButtonClick}
                    disabled={buttonDisabled}
                    ariaLabel={buttonDisabled ? '示例按钮 已禁用' : '示例按钮'}
                    className="demo-button"
                  >
                    {buttonDisabled ? '已禁用按钮' : '点击测试'}
                  </AccessibleButton>
                </div>
                <div className="component-controls">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={buttonDisabled}
                      onChange={handleToggleDisabled}
                      aria-describedby="button-disable-desc"
                    />
                    <span className="toggle-slider" aria-hidden="true"></span>
                    <span className="toggle-text">禁用按钮</span>
                  </label>
                  <p id="button-disable-desc" className="control-desc">
                    切换按钮的禁用状态，测试 ARIA 禁用声明
                  </p>
                </div>
              </section>
            )}

            {activeTab === 'dialog' && (
              <section className="component-section" aria-labelledby="dialog-section-title">
                <h3 id="dialog-section-title" className="section-title">
                  可访问弹窗
                </h3>
                <div className="component-demo">
                  <button
                    ref={dialogTriggerRef}
                    className="demo-button"
                    onClick={handleDialogToggle}
                    aria-haspopup="dialog"
                    aria-expanded={dialogOpen}
                  >
                    {dialogOpen ? '关闭弹窗' : '打开弹窗'}
                  </button>
                </div>
                <div className="component-controls">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={dialogOpen}
                      onChange={handleDialogToggle}
                      aria-describedby="dialog-toggle-desc"
                    />
                    <span className="toggle-slider" aria-hidden="true"></span>
                    <span className="toggle-text">显示弹窗</span>
                  </label>
                  <p id="dialog-toggle-desc" className="control-desc">
                    使用开关控制弹窗显隐，测试焦点陷阱和 ESC 关闭
                  </p>
                </div>
              </section>
            )}

            {activeTab === 'toast' && (
              <section className="component-section" aria-labelledby="toast-section-title">
                <h3 id="toast-section-title" className="section-title">
                  可访问通知
                </h3>
                <div className="component-demo">
                  <button
                    ref={toastTriggerRef}
                    className="demo-button"
                    onClick={handleShowToast}
                    aria-describedby="toast-btn-desc"
                  >
                    显示通知
                  </button>
                  <p id="toast-btn-desc" className="control-desc">
                    当前通知数量: {toastMessages.length}
                  </p>
                </div>
                <div className="component-controls">
                  <p className="control-desc">
                    点击按钮触发动态通知条，测试 aria-live 实时播报
                  </p>
                </div>
              </section>
            )}
          </div>
        </aside>

        <main
          className={`results-panel ${isResetting ? 'fade-out' : ''}`}
          ref={resultsContainerRef}
          role="region"
          aria-label="测试结果区"
        >
          <div className="results-header">
            <h2 className="results-title">测试结果</h2>
            <span className="results-count" aria-live="polite">
              共 {reports.length} 条报告
            </span>
          </div>

          {reports.length === 0 ? (
            <div className="empty-state" role="status">
              <p>暂无测试报告</p>
              <p className="empty-hint">与左侧组件交互，将在此显示可访问性检查结果</p>
            </div>
          ) : (
            <div className="reports-list">
              {reports.map((report, index) => (
                <article
                  key={report.id}
                  className="report-card"
                  style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
                >
                  <header className="report-header">
                    <h3 className="report-component-name">{report.componentName}</h3>
                    <span
                      className="severity-badge"
                      style={{
                        backgroundColor: getSeverityColor(report.overallStatus),
                      }}
                    >
                      {getSeverityLabel(report.overallStatus)}
                    </span>
                  </header>
                  <div className="report-meta">
                    <span className="report-time">
                      {new Date(report.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="report-execution">
                      耗时: {report.executionTime.toFixed(2)}ms
                    </span>
                  </div>
                  {report.violations.length > 0 ? (
                    <ul className="violations-list">
                      {report.violations.map((violation, vIndex) => (
                        <li key={vIndex} className="violation-item">
                          <div className="violation-header">
                            <code className="rule-id">{violation.ruleId}</code>
                            <span
                              className="violation-severity"
                              style={{ color: getSeverityColor(violation.severity) }}
                            >
                              {getSeverityLabel(violation.severity)}
                            </span>
                          </div>
                          <p className="violation-message">{violation.message}</p>
                          <p className="violation-suggestion">
                            <strong>修复建议：</strong>
                            {violation.suggestion}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="no-violations">所有检查项均通过 ✓</p>
                  )}
                </article>
              ))}
            </div>
          )}
        </main>
      </div>

      <footer className="config-bar" role="contentinfo">
        <div className="config-item">
          <label className="toggle-label large-toggle">
            <input
              type="checkbox"
              checked={focusPolicyEnabled}
              onChange={handleFocusPolicyToggle}
              aria-describedby="focus-policy-desc"
            />
            <span className="toggle-slider" aria-hidden="true"></span>
            <span className="toggle-text">启用焦点策略</span>
          </label>
          <span id="focus-policy-desc" className="config-desc">
            弹窗打开时自动移动焦点，关闭后恢复
          </span>
        </div>
        <button className="reset-button" onClick={handleReset} aria-label="重置所有状态">
          重置所有状态
        </button>
      </footer>

      <AccessibleDialog
        open={dialogOpen}
        onClose={handleDialogToggle}
        title="示例弹窗"
        focusPolicy={focusPolicyEnabled}
        ariaLabel="示例弹窗"
      >
        <p>
          这是一个可访问的弹窗组件。使用
          <kbd>Tab</kbd> 键在元素间导航，<kbd>Esc</kbd> 键关闭弹窗。
        </p>
        <p>弹窗内容可以包含表单、按钮等任何可交互元素。</p>
        <button className="demo-button secondary">示例操作按钮</button>
      </AccessibleDialog>

      <AccessibleToast messages={toastMessages} onRemove={handleRemoveToast} triggerRef={toastTriggerRef} />
    </div>
  );
};

export default App;
