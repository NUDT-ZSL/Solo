import { useState, useEffect } from 'react';
import MilestoneList from './components/MilestoneList';
import type { Milestone, CreateMilestoneRequest, FormErrors } from './types';

const App = () => {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<CreateMilestoneRequest>({
    title: '',
    description: '',
    deadline: ''
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [newMilestoneId, setNewMilestoneId] = useState<string | null>(null);

  useEffect(() => {
    fetchMilestones();
  }, []);

  const fetchMilestones = async () => {
    try {
      const response = await fetch('/api/milestones');
      const data = await response.json();
      setMilestones(data);
    } catch (error) {
      console.error('Failed to fetch milestones:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = formData.deadline ? new Date(formData.deadline) : null;
    if (deadlineDate) {
      deadlineDate.setHours(0, 0, 0, 0);
    }

    if (!formData.title.trim()) {
      errors.title = '标题不能为空';
    } else if (formData.title.length > 50) {
      errors.title = '标题不能超过50个字符';
    }

    if (formData.description && formData.description.length > 200) {
      errors.description = '描述不能超过200个字符';
    }

    if (!formData.deadline) {
      errors.deadline = '请选择截止日期';
    } else if (!deadlineDate || isNaN(deadlineDate.getTime())) {
      errors.deadline = '请选择有效的截止日期';
    } else if (deadlineDate < today) {
      errors.deadline = '截止日期必须是未来日期';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const response = await fetch('/api/milestones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const newMilestone = await response.json();
        setNewMilestoneId(newMilestone.id);
        setTimeout(() => setNewMilestoneId(null), 1000);
        await fetchMilestones();
        setShowForm(false);
        setFormData({ title: '', description: '', deadline: '' });
        setFormErrors({});
      } else {
        const errorData = await response.json();
        setFormErrors({ title: errorData.error });
      }
    } catch (error) {
      console.error('Failed to create milestone:', error);
    }
  };

  const handleUpdateMilestone = async (id: string, data: { title?: string; description?: string }) => {
    try {
      const response = await fetch(`/api/milestones/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await fetchMilestones();
      }
    } catch (error) {
      console.error('Failed to update milestone:', error);
    }
  };

  const handleCelebrate = async (id: string) => {
    try {
      const response = await fetch(`/api/milestones/${id}/celebrate`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        setMilestones(prev => prev.map(m => 
          m.id === id ? { ...m, progress: result.newProgress } : m
        ));
        return result;
      }
    } catch (error) {
      console.error('Failed to celebrate:', error);
    }
    return null;
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingText}>加载中...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>动态里程碑</h1>
        <p style={styles.subtitle}>追踪每一个重要时刻，庆祝每一次进步</p>
      </header>

      <main style={styles.main}>
        <MilestoneList
          milestones={milestones}
          newMilestoneId={newMilestoneId}
          onCelebrate={handleCelebrate}
          onUpdate={handleUpdateMilestone}
        />
      </main>

      <div style={styles.addButtonContainer}>
        <button
          onClick={() => setShowForm(true)}
          style={styles.addButton}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.backgroundColor = '#c0392b';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.backgroundColor = '#e94560';
          }}
        >
          + 新增里程碑
        </button>
      </div>

      {showForm && (
        <div style={styles.modalOverlay} onClick={() => setShowForm(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>新增里程碑</h2>
            <form onSubmit={handleSubmit}>
              <div style={styles.formGroup}>
                <label style={styles.label}>标题 <span style={styles.required}>*</span></label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="请输入里程碑标题（最多50字符）"
                  style={{
                    ...styles.input,
                    borderColor: formErrors.title ? '#e94560' : '#0f3460'
                  }}
                  maxLength={50}
                />
                {formErrors.title && <span style={styles.errorText}>{formErrors.title}</span>}
                <span style={styles.charCount}>{formData.title.length}/50</span>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="请输入里程碑描述（最多200字符）"
                  style={{
                    ...styles.textarea,
                    borderColor: formErrors.description ? '#e94560' : '#0f3460'
                  }}
                  maxLength={200}
                />
                {formErrors.description && <span style={styles.errorText}>{formErrors.description}</span>}
                <span style={styles.charCount}>{formData.description?.length || 0}/200</span>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>截止日期 <span style={styles.required}>*</span></label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  style={{
                    ...styles.input,
                    borderColor: formErrors.deadline ? '#e94560' : '#0f3460'
                  }}
                />
                {formErrors.deadline && <span style={styles.errorText}>{formErrors.deadline}</span>}
              </div>

              <div style={styles.modalButtons}>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={styles.cancelButton}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#2a3a5a';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#1e2a45';
                  }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  style={styles.submitButton}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.backgroundColor = '#c0392b';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.backgroundColor = '#e94560';
                  }}
                >
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    paddingBottom: '100px',
  },
  header: {
    textAlign: 'center' as const,
    padding: '40px 20px 30px',
  },
  title: {
    fontSize: '42px',
    fontWeight: '700' as const,
    color: '#ffffff',
    marginBottom: '10px',
    textShadow: '0 0 20px rgba(233, 69, 96, 0.5)',
  },
  subtitle: {
    fontSize: '16px',
    color: '#a0aec0',
    fontWeight: '300' as const,
  },
  main: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '0 20px',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
  },
  loadingText: {
    fontSize: '18px',
    color: '#a0aec0',
  },
  addButtonContainer: {
    position: 'fixed' as const,
    bottom: '30px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 100,
  },
  addButton: {
    padding: '14px 32px',
    fontSize: '16px',
    fontWeight: '600' as const,
    color: '#ffffff',
    backgroundColor: '#e94560',
    border: 'none',
    borderRadius: '30px',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(233, 69, 96, 0.4)',
    transition: 'all 0.3s ease',
  },
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    backgroundColor: '#16213e',
    borderRadius: '16px',
    padding: '32px',
    width: '90%',
    maxWidth: '500px',
    boxShadow: '0 0 30px rgba(233, 69, 96, 0.2)',
    border: '1px solid rgba(233, 69, 96, 0.3)',
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: '600' as const,
    color: '#ffffff',
    marginBottom: '24px',
  },
  formGroup: {
    marginBottom: '20px',
    position: 'relative' as const,
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500' as const,
    color: '#e2e8f0',
    marginBottom: '8px',
  },
  required: {
    color: '#e94560',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    fontSize: '14px',
    color: '#ffffff',
    backgroundColor: '#0f172a',
    border: '2px solid #0f3460',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.3s ease',
    boxSizing: 'border-box' as const,
  },
  textarea: {
    width: '100%',
    padding: '12px 14px',
    fontSize: '14px',
    color: '#ffffff',
    backgroundColor: '#0f172a',
    border: '2px solid #0f3460',
    borderRadius: '8px',
    outline: 'none',
    resize: 'vertical' as const,
    minHeight: '80px',
    transition: 'border-color 0.3s ease',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
  },
  charCount: {
    position: 'absolute' as const,
    right: '10px',
    bottom: '-18px',
    fontSize: '11px',
    color: '#64748b',
  },
  errorText: {
    display: 'block',
    fontSize: '12px',
    color: '#e94560',
    marginTop: '4px',
  },
  modalButtons: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '30px',
  },
  cancelButton: {
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: '500' as const,
    color: '#e2e8f0',
    backgroundColor: '#1e2a45',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
  },
  submitButton: {
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: '600' as const,
    color: '#ffffff',
    backgroundColor: '#e94560',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
};

export default App;
