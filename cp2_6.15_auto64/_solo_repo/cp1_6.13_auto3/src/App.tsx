import { useState, useEffect, useCallback } from 'react';
import type { Record } from './types';
import BudgetDashboard from './components/BudgetDashboard';
import RecordForm from './components/RecordForm';
import ExpenseChart from './components/ExpenseChart';
import { format, parseISO, isSameMonth } from 'date-fns';
import { zhCN } from 'date-fns/locale';

function App() {
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeNav, setActiveNav] = useState('dashboard');

  const fetchRecords = useCallback(async () => {
    try {
      const res = await fetch('/api/records');
      const data = await res.json();
      setRecords(data);
    } catch (err) {
      console.error('Failed to fetch records:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/records/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchRecords();
      }
    } catch (err) {
      console.error('Failed to delete record:', err);
    }
  };

  const sortedRecords = [...records].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const now = new Date();
  const thisMonthRecords = records.filter((r) =>
    isSameMonth(parseISO(r.date), now)
  );

  const totalIncome = thisMonthRecords
    .filter((r) => r.type === 'income')
    .reduce((sum, r) => sum + r.amount, 0);

  const totalExpense = thisMonthRecords
    .filter((r) => r.type === 'expense')
    .reduce((sum, r) => sum + r.amount, 0);

  const balance = totalIncome - totalExpense;

  const currentMonth = format(now, 'yyyy年MM月', { locale: zhCN });

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="sidebar-logo-icon">💰</span>
          <span>BudgetBuddy</span>
        </div>
        <ul className="sidebar-nav">
          <li
            className={activeNav === 'dashboard' ? 'active' : ''}
            onClick={() => setActiveNav('dashboard')}
          >
            <span>📊</span>
            <span>仪表盘</span>
          </li>
          <li
            className={activeNav === 'records' ? 'active' : ''}
            onClick={() => setActiveNav('records')}
          >
            <span>📝</span>
            <span>收支记录</span>
          </li>
          <li
            className={activeNav === 'charts' ? 'active' : ''}
            onClick={() => setActiveNav('charts')}
          >
            <span>📈</span>
            <span>图表分析</span>
          </li>
          <li
            className={activeNav === 'settings' ? 'active' : ''}
            onClick={() => setActiveNav('settings')}
          >
            <span>⚙️</span>
            <span>设置</span>
          </li>
        </ul>
      </aside>

      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">欢迎使用 BudgetBuddy</h1>
          <p className="page-subtitle">
            {currentMonth} · 轻松管理您的家庭预算
          </p>
        </div>

        <div className="dashboard-section">
          <BudgetDashboard
            income={totalIncome}
            expense={totalExpense}
            balance={balance}
          />
        </div>

        <RecordForm onSuccess={fetchRecords} />

        <div className="charts-grid">
          <ExpenseChart records={records} />
        </div>

        <div className="table-card">
          <h3 className="table-title">收支明细</h3>
          {loading ? (
            <div className="empty-state">
              <div className="empty-state-icon">⏳</div>
              <div className="empty-state-text">加载中...</div>
            </div>
          ) : sortedRecords.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <div className="empty-state-text">
                暂无收支记录，快来添加第一条吧！
              </div>
            </div>
          ) : (
            <table className="records-table">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>类型</th>
                  <th>类别</th>
                  <th>金额</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {sortedRecords.map((record) => (
                  <tr key={record.id}>
                    <td>{record.date}</td>
                    <td>
                      <span
                        className={`type-badge ${record.type}`}
                      >
                        {record.type === 'income' ? '收入' : '支出'}
                      </span>
                    </td>
                    <td>{record.category}</td>
                    <td
                      className={
                        record.type === 'income'
                          ? 'amount-income'
                          : 'amount-expense'
                      }
                    >
                      {record.type === 'income' ? '+' : '-'}¥
                      {record.amount.toFixed(2)}
                    </td>
                    <td>
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(record.id)}
                        title="删除记录"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
