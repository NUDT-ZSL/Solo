import { useState } from 'react';
import { Member } from '../types';
import { registerMember } from '../services/api';
import { getCreditScoreLevel } from '../services/memberService';

interface MemberListProps {
  members: Member[];
  onRefresh: () => void;
}

function MemberList({ members, onRefresh }: MemberListProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const validate = () => {
    const newErrors: { name?: string; phone?: string } = {};
    if (!name.trim()) {
      newErrors.name = '姓名为必填项';
    }
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phone.trim()) {
      newErrors.phone = '电话为必填项';
    } else if (!phoneRegex.test(phone)) {
      newErrors.phone = '电话号码格式不正确（应为11位手机号）';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setServerError('');

    try {
      const result = await registerMember(name.trim(), phone.trim());
      if (result.error) {
        setServerError(result.error);
      } else {
        setName('');
        setPhone('');
        setErrors({});
        setShowForm(false);
        onRefresh();
      }
    } catch {
      setServerError('网络错误，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const getLevelClass = (score: number) => {
    const level = getCreditScoreLevel(score);
    return level;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>会员管理</h1>
        <button className="btn" onClick={() => setShowForm(!showForm)}>
          {showForm ? '取消注册' : '注册会员'}
        </button>
      </div>

      {showForm && (
        <div className="member-register-form">
          <h2 style={{ fontSize: 18, color: '#8B4513', marginBottom: 16 }}>新会员注册</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>姓名 <span style={{ color: '#DC143C' }}>*</span></label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入姓名"
              />
              {errors.name && <div className="error-msg">{errors.name}</div>}
            </div>
            <div className="form-group">
              <label>电话 <span style={{ color: '#DC143C' }}>*</span></label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="请输入手机号码"
              />
              {errors.phone && <div className="error-msg">{errors.phone}</div>}
            </div>
            {serverError && <div style={{ color: '#DC143C', fontSize: 14, marginBottom: 12 }}>{serverError}</div>}
            <div className="modal-actions">
              <button type="submit" className="btn" disabled={submitting}>
                {submitting ? '注册中...' : '确认注册'}
              </button>
            </div>
          </form>
        </div>
      )}

      <table className="member-table">
        <thead>
          <tr>
            <th>姓名</th>
            <th>电话</th>
            <th>当前借阅</th>
            <th>信用分</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => {
            const level = getLevelClass(member.creditScore);
            const isWarning = member.creditScore < 60;
            return (
              <tr key={member.id} className={isWarning ? 'warning' : ''}>
                <td>{member.name}</td>
                <td>{member.phone}</td>
                <td>{member.currentBorrows}</td>
                <td>
                  <span className={`credit-badge ${level}`}>
                    {member.creditScore}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default MemberList;
