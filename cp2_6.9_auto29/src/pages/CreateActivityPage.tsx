import React, { useState } from 'react';
import { createActivity, getUserName } from '../utils';

interface Props {
  onBack: () => void;
  onCreated: (activityId: string) => void;
}

interface TimeOptionInput {
  name: string;
  date: string;
  startTime: string;
  endTime: string;
}

const CreateActivityPage: React.FC<Props> = ({ onBack, onCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('18:00');
  const [timeOptions, setTimeOptions] = useState<TimeOptionInput[]>([
    { name: '', date: '', startTime: '', endTime: '' },
    { name: '', date: '', startTime: '', endTime: '' },
  ]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const addTimeOption = () => {
    setTimeOptions([...timeOptions, { name: '', date: '', startTime: '', endTime: '' }]);
  };

  const removeTimeOption = (index: number) => {
    if (timeOptions.length <= 2) return;
    setTimeOptions(timeOptions.filter((_, i) => i !== index));
  };

  const updateTimeOption = (index: number, field: keyof TimeOptionInput, value: string) => {
    const newOptions = [...timeOptions];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setTimeOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('请填写活动名称');
      return;
    }
    if (!description.trim()) {
      setError('请填写活动描述');
      return;
    }
    if (!location.trim()) {
      setError('请填写活动地点');
      return;
    }
    if (!deadlineDate || !deadlineTime) {
      setError('请填写投票截止时间');
      return;
    }

    const validOptions = timeOptions.filter(
      (opt) => opt.name.trim() && opt.date && opt.startTime && opt.endTime
    );
    if (validOptions.length < 2) {
      setError('至少需要两个完整的时间选项');
      return;
    }

    const deadline = new Date(`${deadlineDate}T${deadlineTime}`).getTime();
    if (isNaN(deadline)) {
      setError('截止时间格式不正确');
      return;
    }

    setSubmitting(true);
    try {
      const newActivity = await createActivity({
        name: name.trim(),
        description: description.trim(),
        creator: getUserName(),
        deadline,
        location: location.trim(),
        timeOptions: validOptions.map((opt) => ({
          name: opt.name.trim(),
          date: opt.date,
          startTime: opt.startTime,
          endTime: opt.endTime,
        })),
      });
      onCreated(newActivity.id);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('创建失败，请重试');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <button className="back-button" onClick={onBack}>
        ← 返回列表
      </button>

      <div className="form-page">
        <div className="form-card">
          <h2 className="form-title">发起新活动</h2>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">活动名称 *</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：周末户外徒步"
                maxLength={50}
              />
            </div>

            <div className="form-group">
              <label className="form-label">活动描述 *</label>
              <textarea
                className="form-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="简单介绍一下活动内容、流程、注意事项等"
                maxLength={500}
              />
            </div>

            <div className="form-group">
              <label className="form-label">活动地点 *</label>
              <input
                type="text"
                className="form-input"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="例如：社区活动中心二楼"
                maxLength={100}
              />
            </div>

            <div className="form-group">
              <label className="form-label">投票截止时间 *</label>
              <div className="time-option-row">
                <input
                  type="date"
                  className="form-input"
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                />
                <input
                  type="time"
                  className="form-input"
                  value={deadlineTime}
                  onChange={(e) => setDeadlineTime(e.target.value)}
                />
                <div />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">时间选项（至少2个）*</label>
              {timeOptions.map((opt, index) => (
                <div key={index} className="time-option-card">
                  <div className="time-option-row">
                    <input
                      type="text"
                      className="form-input"
                      placeholder="名称，如周六上午"
                      value={opt.name}
                      onChange={(e) => updateTimeOption(index, 'name', e.target.value)}
                      maxLength={20}
                    />
                    <input
                      type="date"
                      className="form-input"
                      value={opt.date}
                      onChange={(e) => updateTimeOption(index, 'date', e.target.value)}
                    />
                  </div>
                  <div className="time-option-row">
                    <input
                      type="time"
                      className="form-input"
                      value={opt.startTime}
                      onChange={(e) => updateTimeOption(index, 'startTime', e.target.value)}
                    />
                    <input
                      type="time"
                      className="form-input"
                      value={opt.endTime}
                      onChange={(e) => updateTimeOption(index, 'endTime', e.target.value)}
                    />
                    {timeOptions.length > 2 && (
                      <button
                        type="button"
                        className="remove-option-btn"
                        onClick={() => removeTimeOption(index)}
                      >
                        删除
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button type="button" className="add-option-btn" onClick={addTimeOption}>
                + 添加更多时间选项
              </button>
            </div>

            {error && (
              <div style={{ color: '#E74C3C', fontSize: '14px', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <button type="submit" className="form-submit" disabled={submitting}>
              {submitting ? '创建中...' : '创建活动'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateActivityPage;
