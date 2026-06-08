import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import type { TimelineEvent } from '../../shared/types';

const COLORS = [
  '#E74C3C',
  '#3498DB',
  '#2ECC71',
  '#F39C12',
  '#9B59B6',
  '#1ABC9C',
];

const EventModal: React.FC = () => {
  const {
    isModalOpen,
    editingEvent,
    userId,
    setModalOpen,
    setEditingEvent,
    addEvent,
    updateEvent,
    deleteEvent,
  } = useStore();

  const [date, setDate] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLORS[1]);

  useEffect(() => {
    if (editingEvent) {
      setDate(editingEvent.date);
      setTitle(editingEvent.title);
      setDescription(editingEvent.description);
      setColor(editingEvent.color);
    } else {
      setDate(new Date().toISOString().split('T')[0]);
      setTitle('');
      setDescription('');
      setColor(COLORS[1]);
    }
  }, [editingEvent, isModalOpen]);

  if (!isModalOpen) return null;

  const handleSave = () => {
    if (!title.trim() || !date) return;

    const eventData: Omit<TimelineEvent, 'id'> = {
      date,
      title: title.trim(),
      description: description.trim(),
      color,
    };

    if (editingEvent) {
      updateEvent(editingEvent.id, eventData);
    } else {
      addEvent(eventData);
    }

    handleClose();
  };

  const handleDelete = () => {
    if (!editingEvent) return;
    if (confirm('确定删除此事件？')) {
      deleteEvent(editingEvent.id);
      handleClose();
    }
  };

  const handleClose = () => {
    setModalOpen(false);
    setEditingEvent(null);
  };

  const isLocked = Boolean(editingEvent?.lockedBy) && editingEvent?.lockedBy !== userId;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md mx-4 overflow-hidden"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            {editingEvent ? '编辑事件' : '添加事件'}
          </h2>

          {isLocked && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-700">
              此事件正在被 {editingEvent?.lockedByName} 编辑中
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                日期
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4A90D9] focus:border-transparent"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={Boolean(isLocked)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                标题
                <span className="text-gray-400 ml-2">
                  ({title.length}/50)
                </span>
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4A90D9] focus:border-transparent"
                placeholder="请输入事件标题"
                value={title}
                onChange={(e) =>
                  setTitle(e.target.value.slice(0, 50))
                }
                maxLength={50}
                disabled={Boolean(isLocked)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                描述
                <span className="text-gray-400 ml-2">
                  ({description.length}/200)
                </span>
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4A90D9] focus:border-transparent resize-none"
                placeholder="请输入事件描述"
                rows={3}
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value.slice(0, 200))
                }
                maxLength={200}
                disabled={Boolean(isLocked)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                颜色
              </label>
              <div className="flex gap-3">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    className={`
                      w-10 h-10 rounded-full transition-transform duration-200
                      ${color === c ? 'scale-110 ring-2 ring-offset-2' : ''}
                    `}
                    style={{
                      backgroundColor: c,
                      '--tw-ring-color': c,
                    } as React.CSSProperties & { '--tw-ring-color': string }}
                    onClick={() => setColor(c)}
                    disabled={Boolean(isLocked)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
          {editingEvent && !isLocked && (
            <button
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-md font-medium transition-colors"
              onClick={handleDelete}
            >
              删除
            </button>
          )}
          <button
            className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-md font-medium transition-colors"
            onClick={handleClose}
          >
            取消
          </button>
          <button
            className="px-4 py-2 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#4A90D9' }}
            onClick={handleSave}
            disabled={Boolean(!title.trim() || !date || isLocked)}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventModal;
