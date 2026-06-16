import React, { useState } from 'react';
import type { Activity, Skill } from '../types';
import { ALL_SKILLS, SKILL_COLORS } from '../types';

interface VolunteerFormProps {
  activities: Activity[];
  onSubmit: (data: {
    volunteerName: string;
    activityId: string;
    date: string;
    hours: number;
    skills: Skill[];
  }) => void;
  loading?: boolean;
}

const VolunteerForm: React.FC<VolunteerFormProps> = ({ activities, onSubmit, loading }) => {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [volunteerName, setVolunteerName] = useState<string>('');
  const [activityId, setActivityId] = useState<string>('');
  const [hours, setHours] = useState<string>('1');
  const [selectedSkills, setSelectedSkills] = useState<Skill[]>([]);

  const toggleSkill = (skill: Skill) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!volunteerName.trim() || !activityId || !hours || selectedSkills.length === 0) {
      return;
    }

    onSubmit({
      volunteerName: volunteerName.trim(),
      activityId,
      date,
      hours: Math.round(parseFloat(hours) * 2) / 2,
      skills: [...selectedSkills],
    });

    setVolunteerName('');
    setHours('1');
    setSelectedSkills([]);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">服务日期</label>
        <input
          type="date"
          className="form-input"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">志愿者姓名</label>
        <input
          type="text"
          className="form-input"
          value={volunteerName}
          onChange={(e) => setVolunteerName(e.target.value)}
          placeholder="请输入姓名"
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">参与活动</label>
        <select
          className="form-select"
          value={activityId}
          onChange={(e) => setActivityId(e.target.value)}
          required
        >
          <option value="">请选择活动</option>
          {activities.map((activity) => (
            <option key={activity.id} value={activity.id}>
              {activity.name}（{activity.date}）
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">服务时长（小时）</label>
        <input
          type="number"
          className="form-input"
          min="0.5"
          step="0.5"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">技能贡献（多选）</label>
        <div className="skills-container">
          {ALL_SKILLS.map((skill) => (
            <div
              key={skill}
              className={`skill-tag ${selectedSkills.includes(skill) ? 'selected' : 'unselected'}`}
              style={{ backgroundColor: SKILL_COLORS[skill] }}
              onClick={() => toggleSkill(skill)}
            >
              {skill}
            </div>
          ))}
        </div>
      </div>

      <button type="submit" className="submit-btn" disabled={loading}>
        {loading ? '提交中...' : '提交服务记录'}
      </button>
    </form>
  );
};

export default VolunteerForm;
