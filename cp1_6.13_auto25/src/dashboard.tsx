import React, { useEffect, useState } from 'react';
import { Contract, ContractStage } from './types';

interface DashboardProps {
  contracts: Contract[];
  searchQuery: string;
  onContractClick: (id: string) => void;
  onRenewClick: (id: string) => void;
}

const stageLabels: Record<ContractStage, string> = {
  not_started: '未开始',
  in_progress: '进行中',
  overdue: '逾期',
  completed: '已完结'
};

const stageGradients: Record<ContractStage, string> = {
  not_started: 'linear-gradient(135deg, #f9fafb 0%, #9ca3af 100%)',
  in_progress: 'linear-gradient(135deg, #ecfdf5 0%, #10b981 100%)',
  overdue: 'linear-gradient(135deg, #fef2f2 0%, #ef4444 100%)',
  completed: 'linear-gradient(135deg, #f9fafb 0%, #9ca3af 100%)'
};

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} style={{ backgroundColor: '#fef08a', color: '#1e293b', padding: '0 2px', borderRadius: '2px' }}>
        {part}
      </mark>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}

function getNextMilestoneDate(contract: Contract): string {
  const sorted = [...contract.milestones]
    .filter(m => !m.completed)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return sorted.length > 0 ? sorted[0].date : '-';
}

function isExpiringSoon(contract: Contract): boolean {
  if (contract.stage === 'completed') return false;
  const endDate = new Date(contract.endDate);
  const now = new Date();
  const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 7;
}

function getDaysUntilExpiry(contract: Contract): number {
  const endDate = new Date(contract.endDate);
  const now = new Date();
  return Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

const Dashboard: React.FC<DashboardProps> = ({ contracts, searchQuery, onContractClick, onRenewClick }) => {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [expiringContracts, setExpiringContracts] = useState<Contract[]>([]);

  useEffect(() => {
    const expiring = contracts.filter(c => isExpiringSoon(c) && !dismissedIds.has(c.id));
    setExpiringContracts(expiring);
  }, [contracts, dismissedIds]);

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => new Set(prev).add(id));
  };

  const filteredContracts = contracts.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchClient = c.clientName.toLowerCase().includes(q);
    const matchMilestone = c.milestones.some(m => m.name.toLowerCase().includes(q));
    return matchClient || matchMilestone;
  });

  const cardStyle: React.CSSProperties = {
    borderRadius: '16px',
    padding: '24px',
    cursor: 'pointer',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
    transition: 'transform 0.2s ease-out, box-shadow 0.2s ease-out',
    color: '#1e293b'
  };

  return (
    <div style={{ padding: '24px' }}>
      {expiringContracts.map(contract => (
        <div
          key={contract.id}
          style={{
            height: '48px',
            backgroundColor: '#fef9c3',
            borderRadius: '8px',
            marginBottom: '16px',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#854d0e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span style={{ color: '#854d0e', fontSize: '14px', fontWeight: 500 }}>
              合同「{contract.clientName}」将于{getDaysUntilExpiry(contract)}天后到期，请确认是否续签
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => onRenewClick(contract.id)}
              style={{
                backgroundColor: '#22c55e',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 16px',
                fontSize: '13px',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              续签
            </button>
            <button
              onClick={() => handleDismiss(contract.id)}
              style={{
                backgroundColor: '#9ca3af',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 16px',
                fontSize: '13px',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              忽略
            </button>
          </div>
        </div>
      ))}

      <h2 style={{ color: '#1e293b', fontSize: '20px', fontWeight: 600, marginBottom: '20px' }}>
        活跃合同 ({filteredContracts.length})
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '20px'
        }}
      >
        {filteredContracts.map(contract => (
          <div
            key={contract.id}
            onClick={() => onContractClick(contract.id)}
            style={{
              ...cardStyle,
              background: stageGradients[contract.stage]
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-6px)';
              e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#1e293b' }}>
                {highlightText(contract.clientName, searchQuery)}
              </h3>
              <span
                style={{
                  backgroundColor: contract.stage === 'overdue' ? 'rgba(239,68,68,0.2)' :
                    contract.stage === 'in_progress' ? 'rgba(34,197,94,0.2)' :
                    contract.stage === 'completed' ? 'rgba(156,163,175,0.3)' :
                    'rgba(156,163,175,0.2)',
                  color: contract.stage === 'overdue' ? '#991b1b' :
                    contract.stage === 'in_progress' ? '#166534' :
                    '#374151',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 500
                }}
              >
                {stageLabels[contract.stage]}
              </span>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', color: '#475569', marginBottom: '4px' }}>合同金额</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b' }}>
                ¥{contract.amount.toLocaleString()}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: '#475569', marginBottom: '4px' }}>下一个里程碑</div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>
                {getNextMilestoneDate(contract)}
              </div>
            </div>

            {searchQuery && contract.milestones.some(m => m.name.toLowerCase().includes(searchQuery.toLowerCase())) && (
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>匹配里程碑:</div>
                {contract.milestones
                  .filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(m => (
                    <div key={m.id} style={{ fontSize: '12px', color: '#334155' }}>
                      {highlightText(m.name, searchQuery)}
                    </div>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredContracts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <p style={{ fontSize: '16px' }}>没有找到匹配的合同</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
