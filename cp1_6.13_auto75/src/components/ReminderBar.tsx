import { useState } from 'react';
import type { Reminder } from '../types';
import './ReminderBar.css';

interface ReminderBarProps {
  reminders: Reminder[];
  onReturn: (id: string) => Promise<boolean>;
}

export function ReminderBar({ reminders, onReturn }: ReminderBarProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [returning, setReturning] = useState(false);

  if (reminders.length === 0) return null;

  const handleConfirm = async (id: string) => {
    setReturning(true);
    const ok = await onReturn(id);
    setReturning(false);
    if (ok) setConfirmId(null);
  };

  return (
    <>
      <div className="reminder-bar">
        <div className="reminder-scroll">
          {reminders.map(r => (
            <div
              key={r.id}
              className="reminder-item"
              onClick={() => setConfirmId(r.id)}
            >
              《{r.title}》应于（{r.dueDate}）归还，已逾期{r.overdueDays}天
            </div>
          ))}
        </div>
      </div>

      {confirmId && (
        <div className="modal-overlay" onClick={() => setConfirmId(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <p className="modal-text">确认归还此图书？</p>
            <div className="modal-actions">
              <button
                className="modal-btn modal-btn-cancel"
                onClick={() => setConfirmId(null)}
                disabled={returning}
              >
                取消
              </button>
              <button
                className="modal-btn modal-btn-confirm"
                onClick={() => handleConfirm(confirmId)}
                disabled={returning}
              >
                {returning ? '处理中...' : '确认还书'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
