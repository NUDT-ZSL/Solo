import { useState } from 'react';
import type { FC } from 'react';
import { createCourse } from '../logic/courseManager';
import type { Course } from '../data';

interface CreateCourseModalProps {
  onClose: () => void;
  onCreate: (course: Course) => void;
}

const colorOptions = [
  '#5C6BC0', '#EF5350', '#66BB6A', '#FFA726',
  '#AB47BC', '#26C6DA', '#EC407A', '#78909C'
];

const scheduleOptions = [
  '周一 08:00-09:40', '周一 10:00-11:40', '周一 14:00-15:40',
  '周二 08:00-09:40', '周二 10:00-11:40', '周二 14:00-15:40',
  '周三 08:00-09:40', '周三 10:00-11:40', '周三 14:00-15:40',
  '周四 08:00-09:40', '周四 10:00-11:40', '周四 14:00-15:40',
  '周五 08:00-09:40', '周五 10:00-11:40', '周五 14:00-15:40'
];

const CreateCourseModal: FC<CreateCourseModalProps> = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(colorOptions[0]);
  const [schedule, setSchedule] = useState(scheduleOptions[0]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    const newCourse = createCourse(name.trim(), color, schedule);
    onCreate(newCourse);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content fade-in" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>创建新课程</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="form-row">
            <label>课程名称</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="请输入课程名称"
              autoFocus
            />
          </div>

          <div className="form-row">
            <label>封面颜色</label>
            <div className="color-picker">
              {colorOptions.map(c => (
                <button
                  key={c}
                  className={`color-option ${color === c ? 'selected' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <div className="form-row">
            <label>上课时间</label>
            <select value={schedule} onChange={e => setSchedule(e.target.value)}>
              {scheduleOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>取消</button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={!name.trim()}
          >
            创建
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateCourseModal;
