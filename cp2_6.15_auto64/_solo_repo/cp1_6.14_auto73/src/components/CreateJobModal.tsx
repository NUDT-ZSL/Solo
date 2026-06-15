import React, { useState } from 'react';
import { jobsApi } from '../utils/api';
import type { CreateJobPayload } from '../types';

interface CreateJobModalProps {
  onClose: () => void;
  onCreated: () => void;
}

const CreateJobModal: React.FC<CreateJobModalProps> = ({ onClose, onCreated }) => {
  const [form, setForm] = useState<CreateJobPayload>({
    title: '',
    department: '',
    headcount: 1,
    skills: [],
    salaryRange: '',
  });
  const [skillInput, setSkillInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAddSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !form.skills.includes(trimmed)) {
      setForm({ ...form, skills: [...form.skills, trimmed] });
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setForm({ ...form, skills: form.skills.filter((s) => s !== skill) });
  };

  const handleSubmit = async () => {
    if (!form.title || !form.department) {
      alert('请填写职位名称和部门');
      return;
    }
    setSubmitting(true);
    try {
      await jobsApi.create(form);
      onCreated();
    } catch (err) {
      console.error('Create job failed:', err);
      alert('创建职位失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>创建职位</h2>
        <div className="modal-field">
          <label>职位名称 *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="例如：前端工程师"
          />
        </div>
        <div className="modal-field">
          <label>部门 *</label>
          <input
            type="text"
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
            placeholder="例如：技术部"
          />
        </div>
        <div className="modal-field">
          <label>招聘人数</label>
          <input
            type="number"
            min={1}
            value={form.headcount}
            onChange={(e) => setForm({ ...form, headcount: parseInt(e.target.value) || 1 })}
          />
        </div>
        <div className="modal-field">
          <label>薪资范围</label>
          <input
            type="text"
            value={form.salaryRange}
            onChange={(e) => setForm({ ...form, salaryRange: e.target.value })}
            placeholder="例如：15-25K"
          />
        </div>
        <div className="modal-field">
          <label>技能要求</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSkill();
                }
              }}
              placeholder="输入技能后按回车添加"
              style={{ flex: 1 }}
            />
            <button className="btn-secondary" onClick={handleAddSkill}>添加</button>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
            {form.skills.map((s) => (
              <span
                key={s}
                className="skill-tag"
                style={{ cursor: 'pointer' }}
                onClick={() => handleRemoveSkill(s)}
              >
                {s} ×
              </span>
            ))}
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? '创建中...' : '创建职位'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateJobModal;
