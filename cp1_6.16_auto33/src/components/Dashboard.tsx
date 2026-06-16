import { Book, Member, BorrowRecord } from '../types';
import { isLowStock } from '../services/bookService';

interface DashboardProps {
  books: Book[];
  members: Member[];
  borrowRecords: BorrowRecord[];
}

function Dashboard({ books, members, borrowRecords }: DashboardProps) {
  const totalBooks = books.reduce((sum, b) => sum + b.quantity, 0);
  const borrowedCount = borrowRecords.filter(r => r.status === 'borrowed').length;
  const pendingReturnCount = borrowRecords.filter(r => r.status === 'borrowed').length;
  const lowStockCount = books.filter(b => isLowStock(b.quantity)).length;

  const stats = [
    { label: '总图书数', value: totalBooks, hasPulse: false },
    { label: '借出数', value: borrowedCount, hasPulse: false },
    { label: '待归还数', value: pendingReturnCount, hasPulse: false },
    { label: '低库存预警', value: lowStockCount, hasPulse: lowStockCount > 0 },
  ];

  return (
    <div>
      <h1 className="page-title">仪表盘</h1>
      <div className="dashboard-grid">
        {stats.map((stat) => (
          <div className="stat-card" key={stat.label}>
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value">{stat.value}</div>
            {stat.hasPulse && <div className="pulse-dot" />}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
