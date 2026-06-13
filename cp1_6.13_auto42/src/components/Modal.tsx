import React, { useState, useEffect } from 'react';
import { Task, GroupId } from '../types';
import { useAppContext } from '../App';
import './Modal.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  defaultGroup: GroupId;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, task, defaultGroup }) => {
  const { members, groupMap, createTask, updateTask } = useAppContext();

  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');
  const [group, setGroup] = useState<GroupId>(defaultGroup);
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [errors, setErrors] = useState<{ title?: string; description?: string }>({});

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setAssignee(task.assignee);
      setGroup(task.group);
      setDescription(task.description);
      setTagsInput(task.tags.join(', '));
    } else {
      setTitle('');
      setAssignee(members[0]?.id || '');
      setGroup(defaultGroup);
      setDescription('');
      setTagsInput('');
    }
    setErrors({});
  }, [task, defaultGroup, members, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { title?: string; description?: string } = {};

    if (!title.trim()) {
      newErrors.title = '请输入需求标题';
    } else if (title.trim().length > 50) {
      newErrors.title = '标题不能超过50字';
    }

    if (description.trim().length > 200) {
      newErrors.description = '描述不能超过200字';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    if (task) {
      updateTask(task.id, {
        title: title.trim(),
        description: description.trim(),
        assignee,
        group,
        tags
      });
    } else {
      createTask({
        title: title.trim(),
        description: description.trim(),
        assignee,
        group,
        tags
      });
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{task ? '编辑需求' : '新建需求'}</h2>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label className="form-label">
              标题 <span className="required">*</span>
            </label>
            <input
              type="text"
              className={`form-input ${errors.title ? 'has-error' : ''}`}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="请输入需求标题"
              maxLength={50}
              autoFocus
            />
            <div className="form-hint">
              {errors.title ? (
                <span className="error-text">{errors.title}</span>
              ) : (
                <span className="char-count">{title.length}/50</span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">负责人</label>
            <div className="assignee-select-wrapper">
              <select
                className="form-select"
                value={assignee}
                onChange={e => setAssignee(e.target.value)}
              >
                {members.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
              {assignee && (() => {
                const m = members.find(x => x.id === assignee);
                return m ? (
                  <span
                    className="assignee-preview"
                    style={{ background: m.color }}
                  >
                    {m.name[0]}
                  </span>
                ) : null;
              })()}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">分组</label>
            <div className="group-radio-group">
              {Object.entries(groupMap).map(([key, label]) => (
                <label
                  key={key}
                  className={`group-radio-label ${group === key ? 'active' : ''}`}
                >
                  <input
                    type="radio"
                    name="group"
                    value={key}
                    checked={group === key}
                    onChange={e => setGroup(e.target.value as GroupId)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">标签（用逗号分隔）</label>
            <input
              type="text"
              className="form-input"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              placeholder="例如：前端, 高优先级, Bug"
            />
          </div>

          <div className="form-group">
            <label className="form-label">描述</label>
            <textarea
              className={`form-textarea ${errors.description ? 'has-error' : ''}`}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="请输入需求详细描述..."
              maxLength={200}
              rows={4}
            />
            <div className="form-hint">
              {errors.description ? (
                <span className="error-text">{errors.description}</span>
              ) : (
                <span className="char-count">{description.length}/200</span>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-cancel" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              {task ? '保存修改' : '创建需求'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Modal;
