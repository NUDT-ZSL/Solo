import React, { useState, useEffect } from 'react';
import type { TeamMember, Task } from '../utils/types';

interface ClaimModalProps {
  isOpen: boolean;
  task: Task | null;
  teamMembers: TeamMember[];
  onConfirm: (taskId: string, assigneeId: string) => void;
  onCancel: () => void;
}

const ClaimModal: React.FC<ClaimModalProps> = ({
  isOpen,
  task,
  teamMembers,
  onConfirm,
  onCancel,
}) => {
  const [selectedMember, setSelectedMember] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setSelectedMember(teamMembers[0]?.id || '');
    }
  }, [isOpen, teamMembers]);

  if (!isOpen || !task) return null;

  const handleConfirm = () => {
    if (selectedMember) {
      onConfirm(task.id, selectedMember);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.45)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backdropFilter: 'blur(2px)',
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 400,
          maxWidth: '100%',
          backgroundColor: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          animation: 'fadeIn 0.25s ease-out',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '24px 24px 20px',
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#1e293b',
              marginBottom: 6,
            }}
          >
            认领任务
          </div>
          <div
            style={{
              fontSize: 14,
              color: '#64748b',
            }}
          >
            请选择认领此任务的团队成员
          </div>
        </div>

        <div
          style={{
            padding: 20,
            24,
          }}
        >
          <div
            style={{
              padding: 14,
              backgroundColor: '#f8fafc',
              borderRadius: 10,
              marginBottom: 20,
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: '#1e293b',
                marginBottom: 6,
              }}
            >
              {task.title}
            </div>
            <div
              style={{
                fontSize: 13,
                color: '#64748b',
                lineHeight: 1.5,
              }}
            >
              {task.description}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label
              htmlFor="assignee-select"
              style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 600,
                color: '#334155',
                marginBottom: 8,
              }}
            >
              选择认领人
            </label>
            <select
              id="assignee-select"
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                fontSize: 14,
                color: '#1e293b',
                backgroundColor: '#ffffff',
                border: '2px solid #e2e8f0',
                borderRadius: 10,
                outline: 'none',
                cursor: 'pointer',
                transition: 'border-color 0.2s ease-out',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                paddingRight: 40,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#38bdf8';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            >
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 12,
            }}
          >
            <button
              onClick={onCancel}
              style={{
                flex: 1,
                padding: '12px 20px',
                fontSize: 14,
                fontWeight: 600,
                color: '#475569',
                backgroundColor: '#f1f5f9',
                borderRadius: 10,
                transition: 'all 0.2s ease-out',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e2e8f0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f1f5f9';
              }}
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedMember}
              style={{
                flex: 1,
                padding: '12px 20px',
                fontSize: 14,
                fontWeight: 600,
                color: '#ffffff',
                backgroundColor: selectedMember ? '#38bdf8' : '#94a3b8',
                borderRadius: 10,
                transition: 'all 0.2s ease-out',
                cursor: selectedMember ? 'pointer' : 'not-allowed',
              }}
              onMouseEnter={(e) => {
                if (selectedMember) {
                  e.currentTarget.style.backgroundColor = '#0ea5e9';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = selectedMember
                  ? '#38bdf8'
                  : '#94a3b8';
              }}
            >
              确认认领
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClaimModal;
