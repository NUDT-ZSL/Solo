import { useState, useMemo } from 'react';
import { BorrowRecord, CustomerStats } from '../types';
import {
  searchBorrowRecords,
  getBookById,
  getCustomerById,
  getCustomerStats,
  getStatusLabel,
  returnBook
} from '../store';

const BorrowPanel = () => {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  
  const filteredRecords = useMemo(() => {
    return searchBorrowRecords(searchKeyword);
  }, [searchKeyword, refresh]);
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchKeyword(e.target.value);
  };
  
  const handleRowClick = (customerId: string) => {
    setSelectedCustomerId(customerId === selectedCustomerId ? null : customerId);
  };
  
  const handleReturnBook = (recordId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const returned = returnBook(recordId);
    if (returned) {
      setRefresh(prev => prev + 1);
    }
  };
  
  const selectedCustomer = selectedCustomerId ? getCustomerById(selectedCustomerId) : null;
  const customerStats: CustomerStats | null = selectedCustomerId
    ? getCustomerStats(selectedCustomerId)
    : null;
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'borrowing':
        return '#F4A261';
      case 'returned':
        return '#2A9D8F';
      case 'overdue':
        return '#E76F51';
      default:
        return '#999';
    }
  };
  
  const formatDate = (dateStr: string) => {
    return dateStr;
  };
  
  return (
    <div className="borrow-panel">
      <div className="borrow-panel__main">
        <div className="borrow-panel__header">
          <h2 className="borrow-panel__title">借阅记录</h2>
          <div className="borrow-panel__search">
            <input
              type="text"
              placeholder="搜索顾客姓名或会员号..."
              value={searchKeyword}
              onChange={handleSearch}
              className="borrow-panel__search-input"
            />
          </div>
        </div>
        
        <div className="borrow-panel__table-container">
          <table className="borrow-panel__table">
            <thead>
              <tr>
                <th>顾客姓名</th>
                <th>会员号</th>
                <th>书名</th>
                <th>借阅日期</th>
                <th>应还日期</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map(record => {
                const book = getBookById(record.bookId);
                const customer = getCustomerById(record.customerId);
                
                return (
                  <tr
                    key={record.id}
                    className={`borrow-panel__row ${selectedCustomerId === record.customerId ? 'borrow-panel__row--selected' : ''}`}
                    onClick={() => handleRowClick(record.customerId)}
                  >
                    <td>{customer?.name || '-'}</td>
                    <td>{customer?.memberNo || '-'}</td>
                    <td>{book?.title || '-'}</td>
                    <td>{formatDate(record.borrowDate)}</td>
                    <td>{formatDate(record.dueDate)}</td>
                    <td>
                      <span
                        className="borrow-panel__status-tag"
                        style={{ backgroundColor: getStatusColor(record.status) }}
                      >
                        {getStatusLabel(record.status)}
                      </span>
                    </td>
                    <td>
                      {record.status !== 'returned' && (
                        <button
                          className="borrow-panel__return-btn"
                          onClick={(e) => handleReturnBook(record.id, e)}
                        >
                          归还
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredRecords.length === 0 && (
            <div className="borrow-panel__empty">
              <p>暂无借阅记录</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="borrow-panel__sidebar">
        {selectedCustomer && customerStats ? (
          <div className="customer-stats">
            <div className="customer-stats__header">
              <h3 className="customer-stats__name">{selectedCustomer.name}</h3>
              <p className="customer-stats__member-no">{selectedCustomer.memberNo}</p>
            </div>
            <div className="customer-stats__body">
              <div className="customer-stats__item">
                <span className="customer-stats__label">总借阅数</span>
                <span className="customer-stats__value">{customerStats.totalBorrows}</span>
              </div>
              <div className="customer-stats__item">
                <span className="customer-stats__label">当前在借</span>
                <span className="customer-stats__value">{customerStats.currentBorrows}</span>
              </div>
              <div className="customer-stats__item">
                <span className="customer-stats__label">常借类别</span>
                <span className="customer-stats__value">{customerStats.favoriteCategory}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="borrow-panel__sidebar-empty">
            <p>点击表格行查看顾客统计</p>
          </div>
        )}
      </div>
      
      <style>{`
        .borrow-panel {
          display: flex;
          gap: 24px;
          height: 100%;
        }
        
        .borrow-panel__main {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }
        
        .borrow-panel__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 16px;
        }
        
        .borrow-panel__title {
          font-size: 22px;
          font-weight: 600;
          color: #2D3436;
          margin: 0;
        }
        
        .borrow-panel__search {
          flex-shrink: 0;
        }
        
        .borrow-panel__search-input {
          width: 280px;
          padding: 10px 16px;
          border: 1px solid #E8D8C8;
          border-radius: 4px;
          font-size: 14px;
          color: #2D3436;
          background: #FFFFFF;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          outline: none;
        }
        
        .borrow-panel__search-input:focus {
          border-color: #2A9D8F;
          box-shadow: 0 0 0 3px rgba(42, 157, 143, 0.1);
        }
        
        .borrow-panel__table-container {
          flex: 1;
          overflow: auto;
          background: #FFFFFF;
          border: 1px solid #E8D8C8;
          border-radius: 4px;
        }
        
        .borrow-panel__table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .borrow-panel__table th,
        .borrow-panel__table td {
          padding: 12px 16px;
          text-align: left;
          border-bottom: 1px solid #E8D8C8;
          font-size: 14px;
        }
        
        .borrow-panel__table th {
          background: #F4F1EA;
          font-weight: 600;
          color: #2D3436;
          position: sticky;
          top: 0;
          z-index: 1;
        }
        
        .borrow-panel__row {
          cursor: pointer;
          transition: background-color 0.2s ease;
        }
        
        .borrow-panel__row:hover {
          background: #F9F6F0;
        }
        
        .borrow-panel__row--selected {
          background: #E6F5F3 !important;
        }
        
        .borrow-panel__status-tag {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 4px;
          color: #FFFFFF;
          font-size: 12px;
          font-weight: 500;
        }
        
        .borrow-panel__return-btn {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          background: #2A9D8F;
          color: #FFFFFF;
          font-size: 12px;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }
        
        .borrow-panel__return-btn:hover {
          background: #21867A;
        }
        
        .borrow-panel__empty {
          padding: 40px;
          text-align: center;
          color: #888;
        }
        
        .borrow-panel__empty p {
          margin: 0;
        }
        
        .borrow-panel__sidebar {
          width: 280px;
          flex-shrink: 0;
        }
        
        .customer-stats {
          background: #264653;
          color: #FFFFFF;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .customer-stats__header {
          padding: 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .customer-stats__name {
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 4px 0;
        }
        
        .customer-stats__member-no {
          font-size: 13px;
          opacity: 0.7;
          margin: 0;
        }
        
        .customer-stats__body {
          padding: 16px 20px;
        }
        
        .customer-stats__item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        .customer-stats__item:last-child {
          border-bottom: none;
        }
        
        .customer-stats__label {
          font-size: 13px;
          opacity: 0.7;
        }
        
        .customer-stats__value {
          font-size: 20px;
          font-weight: 600;
          color: #2A9D8F;
        }
        
        .borrow-panel__sidebar-empty {
          background: #FFFFFF;
          border: 1px solid #E8D8C8;
          border-radius: 8px;
          padding: 40px 20px;
          text-align: center;
          color: #888;
        }
        
        .borrow-panel__sidebar-empty p {
          margin: 0;
          font-size: 14px;
        }
        
        @media (max-width: 900px) {
          .borrow-panel {
            flex-direction: column;
          }
          
          .borrow-panel__sidebar {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default BorrowPanel;
