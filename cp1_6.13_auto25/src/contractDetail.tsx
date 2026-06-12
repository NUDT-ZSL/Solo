import React, { useEffect, useRef, useState } from 'react';
import { Contract, Attachment } from './types';
import { v4 as uuidv4 } from 'uuid';

interface ContractDetailProps {
  contract: Contract;
  autoOpenRenew?: boolean;
  onBack: () => void;
  onUpdate: (contract: Contract) => void;
  isMobile: boolean;
}

const ContractDetail: React.FC<ContractDetailProps> = ({ contract, autoOpenRenew, onBack, onUpdate, isMobile }) => {
  const [showRenewModal, setShowRenewModal] = useState<boolean>(!!autoOpenRenew);
  const [renewDuration, setRenewDuration] = useState<string>('6');
  const [renewAmount, setRenewAmount] = useState<string>(contract.amount.toString());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoOpenRenew) {
      setShowRenewModal(true);
      setRenewAmount(contract.amount.toString());
    }
  }, [autoOpenRenew, contract.amount]);

  const totalPaid = contract.payments.reduce((sum, p) => sum + p.amount, 0);
  const paymentProgress = contract.amount > 0 ? (totalPaid / contract.amount) * 100 : 0;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const isPdf = file.type === 'application/pdf';
      const newAttachment: Attachment = {
        id: uuidv4(),
        name: file.name,
        type: isPdf ? 'pdf' : 'image',
        dataUrl: dataUrl
      };
      const updated = {
        ...contract,
        attachments: [...contract.attachments, newAttachment]
      };
      onUpdate(updated);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRenewSubmit = () => {
    const months = parseInt(renewDuration, 10);
    const newEndDate = new Date();
    newEndDate.setMonth(newEndDate.getMonth() + months);

    const updated: Contract = {
      ...contract,
      amount: parseFloat(renewAmount) || contract.amount,
      endDate: newEndDate.toISOString().split('T')[0],
      stage: 'in_progress'
    };
    onUpdate(updated);
    setShowRenewModal(false);
  };

  const allDates = contract.milestones.map(m => new Date(m.date).getTime());
  const minDate = allDates.length > 0 ? Math.min(...allDates) : Date.now();
  const maxDate = allDates.length > 0 ? Math.max(...allDates) : Date.now();
  const dateRange = Math.max(maxDate - minDate, 1);

  const panelStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
    padding: '24px'
  };

  return (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <button
          onClick={onBack}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '8px 12px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#64748b',
            fontSize: '14px',
            fontWeight: 500
          }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5"></path>
            <path d="M12 19l-7-7 7-7"></path>
          </svg>
          返回仪表板
        </button>
        <h2 style={{ marginLeft: '16px', color: '#1e293b', fontSize: '22px', fontWeight: 600 }}>
          {contract.clientName} - 合同详情
        </h2>
        <button
          onClick={() => setShowRenewModal(true)}
          style={{
            marginLeft: 'auto',
            backgroundColor: '#22c55e',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            fontSize: '14px',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          续签合同
        </button>
      </div>

      <div style={{
        display: 'flex',
        gap: '20px',
        flexWrap: isMobile ? 'wrap' : 'nowrap',
        minHeight: 'calc(100vh - 200px)'
      }}>
        <div style={{
          width: isMobile ? '100%' : '40%',
          ...panelStyle,
          overflow: 'auto'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: '0 0 20px 0' }}>
            合同信息
          </h3>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>合同金额</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#1e293b' }}>
              ¥{contract.amount.toLocaleString()}
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>合同周期</div>
            <div style={{ fontSize: '14px', color: '#334155' }}>
              {contract.startDate} 至 {contract.endDate}
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>双方签名</div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1, padding: '16px', border: '2px dashed #cbd5e1', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', fontFamily: 'cursive' }}>
                  {contract.freelancerSignature}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>自由职业者</div>
              </div>
              <div style={{ flex: 1, padding: '16px', border: '2px dashed #cbd5e1', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', fontFamily: 'cursive' }}>
                  {contract.clientSignature}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>客户方</div>
              </div>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', color: '#64748b' }}>附件列表</div>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                + 上传附件
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/*"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </div>
            {contract.attachments.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
                暂无附件，点击上方按钮上传PDF或图片
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {contract.attachments.map(att => (
                  <a
                    key={att.id}
                    href={att.dataUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      color: '#334155',
                      fontSize: '13px'
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={att.type === 'pdf' ? '#ef4444' : '#3b82f6'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>{att.type.toUpperCase()}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{
          width: isMobile ? '100%' : '60%',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div style={{ height: '35vh', ...panelStyle, overflow: 'auto' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: '0 0 20px 0' }}>
              甘特图 - 里程碑时间线
            </h3>
            <div style={{ position: 'relative', paddingLeft: '160px', minWidth: '500px' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '150px', borderRight: '1px solid #e2e8f0' }}>
                {contract.milestones.map((_, i) => (
                  <div key={i} style={{ height: '48px', display: 'flex', alignItems: 'center', paddingRight: '12px', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '12px', color: '#64748b', textAlign: 'right' }}>
                      {contract.milestones[i].name}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ position: 'relative', height: `${contract.milestones.length * 48}px`, minWidth: '400px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', position: 'absolute', top: '-24px', left: 0, right: 0, padding: '0 8px' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(minDate).toISOString().split('T')[0]}</span>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(maxDate).toISOString().split('T')[0]}</span>
                </div>

                {contract.milestones.map((m) => {
                  const left = ((new Date(m.date).getTime() - minDate) / dateRange) * 100;
                  return (
                    <div key={m.id} style={{ position: 'relative', height: '48px' }}>
                      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', backgroundColor: '#f1f5f9' }}></div>
                      <div
                        style={{
                          position: 'absolute',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          left: `${Math.min(Math.max(left, 2), 90)}%`,
                          width: '90px',
                          height: '32px',
                          borderRadius: '8px',
                          backgroundColor: m.completed ? '#22c55e' : 'transparent',
                          border: m.completed ? 'none' : '2px solid #f97316',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 500,
                          color: m.completed ? '#ffffff' : '#f97316',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {m.date.slice(5)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: '#22c55e' }}></div>
                <span style={{ fontSize: '12px', color: '#64748b' }}>已完成</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: '2px solid #f97316' }}></div>
                <span style={{ fontSize: '12px', color: '#64748b' }}>待办</span>
              </div>
            </div>
          </div>

          <div style={{ height: '25vh', ...panelStyle, overflow: 'auto' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: '0 0 20px 0' }}>
              收款进度
            </h3>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b' }}>
                  ¥{totalPaid.toLocaleString()}
                </span>
                <span style={{ fontSize: '14px', color: '#94a3b8', marginLeft: '8px' }}>
                  / ¥{contract.amount.toLocaleString()}
                </span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: '#3b82f6' }}>
                {paymentProgress.toFixed(1)}%
              </div>
            </div>

            <div style={{
              height: '24px',
              borderRadius: '12px',
              backgroundColor: '#e2e8f0',
              overflow: 'hidden',
              marginBottom: '16px'
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(paymentProgress, 100)}%`,
                backgroundImage: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)',
                borderRadius: '12px',
                transition: 'width 0.5s ease-out'
              }}></div>
            </div>

            {contract.nextPaymentDueDate && (
              <div style={{
                padding: '12px 16px',
                backgroundColor: '#f8fafc',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span style={{ fontSize: '13px', color: '#475569' }}>
                  下一笔款项到期日：
                  <strong style={{ color: '#f97316' }}>{contract.nextPaymentDueDate}</strong>
                </span>
              </div>
            )}

            {contract.payments.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>收款记录</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '80px', overflowY: 'auto' }}>
                  {contract.payments.map(p => (
                    <div key={p.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '6px',
                      fontSize: '12px'
                    }}>
                      <span style={{ color: '#475569' }}>{p.description}</span>
                      <span style={{ fontWeight: 600, color: '#22c55e' }}>¥{p.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showRenewModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowRenewModal(false)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '520px',
              height: '320px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '32px',
              boxSizing: 'border-box',
              boxShadow: '0 20px 50px rgba(0,0,0,0.15)'
            }}
          >
            <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#1e293b', margin: '0 0 8px 0' }}>
              续签合同
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 28px 0' }}>
              {contract.clientName}
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#475569', marginBottom: '8px', fontWeight: 500 }}>
                续签期限
              </label>
              <select
                value={renewDuration}
                onChange={e => setRenewDuration(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  color: '#1e293b',
                  outline: 'none',
                  cursor: 'pointer',
                  backgroundColor: '#ffffff',
                  boxSizing: 'border-box'
                }}
              >
                <option value="3">3 个月</option>
                <option value="6">6 个月</option>
                <option value="12">12 个月</option>
                <option value="24">24 个月</option>
              </select>
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#475569', marginBottom: '8px', fontWeight: 500 }}>
                新合同金额 (¥)
              </label>
              <input
                type="number"
                value={renewAmount}
                onChange={e => setRenewAmount(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  color: '#1e293b',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowRenewModal(false)}
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  color: '#64748b',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                取消
              </button>
              <button
                onClick={handleRenewSubmit}
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#22c55e',
                  color: '#ffffff',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                确认续签
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractDetail;
