import React, { useState } from 'react';
import { createCampaign } from '../utils/api';

interface CampaignCreatorProps {
  onClose: () => void;
  onCreated: () => void;
}

const CampaignCreator: React.FC<CampaignCreatorProps> = ({ onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'full_reduction' | 'discount' | 'fixed'>('discount');
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [minPurchase, setMinPurchase] = useState<number>(100);
  const [reductionAmount, setReductionAmount] = useState<number>(20);
  const [totalQuantity, setTotalQuantity] = useState<number>(100);
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('请输入活动名称'); return; }
    if (!validFrom || !validTo) { setError('请选择有效期'); return; }
    if (type === 'discount' && (discountValue < 1 || discountValue > 99)) { setError('折扣百分比须在1-99之间'); return; }
    setError('');
    setSubmitting(true);
    try {
      await createCampaign({
        name: name.trim(),
        type,
        discountValue: type === 'discount' ? discountValue : type === 'fixed' ? discountValue : 0,
        minPurchase: type === 'full_reduction' ? minPurchase : 0,
        reductionAmount: type === 'full_reduction' ? reductionAmount : 0,
        totalQuantity,
        validFrom,
        validTo,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError('创建失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>创建优惠券活动</h2>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={formStyle}>
          <label style={labelStyle}>
            活动名称
            <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="输入活动名称" />
          </label>
          <label style={labelStyle}>
            优惠类型
            <select style={inputStyle} value={type} onChange={e => setType(e.target.value as any)}>
              <option value="full_reduction">满减</option>
              <option value="discount">折扣</option>
              <option value="fixed">立减</option>
            </select>
          </label>
          {type === 'full_reduction' && (
            <>
              <label style={labelStyle}>
                满额（元）
                <input style={inputStyle} type="number" value={minPurchase} onChange={e => setMinPurchase(Number(e.target.value))} min={0} />
              </label>
              <label style={labelStyle}>
                减额（元）
                <input style={inputStyle} type="number" value={reductionAmount} onChange={e => setReductionAmount(Number(e.target.value))} min={0} />
              </label>
            </>
          )}
          {type === 'discount' && (
            <label style={labelStyle}>
              折扣百分比（1-99）
              <input style={inputStyle} type="number" value={discountValue} onChange={e => setDiscountValue(Number(e.target.value))} min={1} max={99} />
            </label>
          )}
          {type === 'fixed' && (
            <label style={labelStyle}>
              立减金额（元）
              <input style={inputStyle} type="number" value={discountValue} onChange={e => setDiscountValue(Number(e.target.value))} min={0} />
            </label>
          )}
          <label style={labelStyle}>
            发放总量
            <input style={inputStyle} type="number" value={totalQuantity} onChange={e => setTotalQuantity(Number(e.target.value))} min={1} />
          </label>
          <label style={labelStyle}>
            有效期开始
            <input style={inputStyle} type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} />
          </label>
          <label style={labelStyle}>
            有效期结束
            <input style={inputStyle} type="date" value={validTo} onChange={e => setValidTo(e.target.value)} />
          </label>
          {error && <div style={{ color: '#FF5722', fontSize: '14px' }}>{error}</div>}
          <button type="submit" disabled={submitting} style={submitBtnStyle}>
            {submitting ? '创建中...' : '创建活动'}
          </button>
        </form>
      </div>
    </div>
  );
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  background: '#00000066',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: '12px',
  padding: '32px',
  width: '480px',
  maxWidth: '90vw',
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '24px',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: '20px',
  cursor: 'pointer',
  color: '#666',
  padding: '4px 8px',
};

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  fontSize: '14px',
  fontWeight: 500,
  color: '#333',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #ddd',
  borderRadius: '8px',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box',
};

const submitBtnStyle: React.CSSProperties = {
  padding: '12px',
  background: '#4CAF50',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  fontSize: '16px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'transform 0.2s, box-shadow 0.2s',
};

export default CampaignCreator;
