import React, { useState } from 'react';
import { useAppContext } from '../App';
import { createFamily, getFamilyDetails } from '../api/taskApi';

const AVATAR_OPTIONS = ['👨', '👩', '👧', '👦', '🧑', '👴', '👵', '🧒', '👱', '👸', '🤴', '🧔'];

const CreateFamily: React.FC = () => {
  const { showToast, setPage, setFamilyData } = useAppContext();
  const [name, setName] = useState('');
  const [memberList, setMemberList] = useState([
    { name: '', avatar: '👨' },
    { name: '', avatar: '👩' },
    { name: '', avatar: '👧' },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const updateMember = (index: number, field: 'name' | 'avatar', value: string) => {
    setMemberList(prev => {
      const newList = [...prev];
      newList[index] = { ...newList[index], [field]: value };
      return newList;
    });
  };

  const addMember = () => {
    setMemberList(prev => [...prev, { name: '', avatar: '🧑' }]);
  };

  const removeMember = (index: number) => {
    if (memberList.length <= 3) {
      showToast('至少需要3名成员', 'error');
      return;
    }
    setMemberList(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('请输入家庭名称', 'error');
      return;
    }
    const validMembers = memberList.filter(m => m.name.trim());
    if (validMembers.length < 3) {
      showToast('请至少添加3名成员', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const result = await createFamily(
        name.trim(),
        validMembers.map(m => ({ name: m.name.trim(), avatar: m.avatar }))
      );
      localStorage.setItem('familyId', result.family.id);
      const details = await getFamilyDetails(result.family.id);
      setFamilyData({
        familyId: details.family.id,
        familyName: details.family.name,
        members: details.members,
        tasks: details.tasks,
        rewards: details.rewards,
      });
      showToast('家庭创建成功！', 'success');
      setPage('board');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '创建失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="content">
      <h1 className="page-title" style={{ textAlign: 'center' }}>创建你的家庭</h1>
      <form className="card form-card" onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">家庭名称</label>
          <input
            type="text"
            className="form-input"
            placeholder="例如：快乐一家人"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={30}
          />
        </div>
        <div className="form-group">
          <label className="form-label">家庭成员（至少3人）</label>
          {memberList.map((member, index) => (
            <div key={index}>
              <div className="member-item">
                <input
                  type="text"
                  className="form-input"
                  placeholder={`成员 ${index + 1} 姓名`}
                  value={member.name}
                  onChange={e => updateMember(index, 'name', e.target.value)}
                  maxLength={20}
                />
                <button
                  type="button"
                  className="remove-member-btn"
                  onClick={() => removeMember(index)}
                  title="移除成员"
                >
                  ×
                </button>
              </div>
              <div className="avatar-picker" style={{ marginBottom: 12 }}>
                {AVATAR_OPTIONS.map(avatar => (
                  <div
                    key={avatar}
                    className={`avatar-option ${member.avatar === avatar ? 'selected' : ''}`}
                    onClick={() => updateMember(index, 'avatar', avatar)}
                  >
                    {avatar}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button type="button" className="add-member-btn" onClick={addMember}>
            + 添加成员
          </button>
        </div>
        <button
          type="submit"
          className="btn btn-primary submit-btn"
          disabled={submitting}
        >
          {submitting ? '创建中...' : '创建家庭'}
        </button>
      </form>
    </div>
  );
};

export default CreateFamily;
