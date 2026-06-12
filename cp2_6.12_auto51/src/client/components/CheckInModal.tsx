import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { date: string; hours: number; description: string }) => void;
  userId: string;
}

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const CheckInModal = ({ isOpen, onClose, onSubmit, userId }: CheckInModalProps) => {
  const [date, setDate] = useState(getTodayDate());
  const [hours, setHours] = useState<string>('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<{ hours?: string; description?: string }>({});

  useEffect(() => {
    if (isOpen) {
      setDate(getTodayDate());
      setHours('');
      setDescription('');
      setErrors({});
    }
  }, [isOpen]);

  const validateHours = (value: string): string | undefined => {
    if (!value && value !== '0') {
      return '请输入服务时长';
    }
    const num = parseFloat(value);
    if (isNaN(num)) {
      return '请输入有效的数字';
    }
    if (num < 0.5) {
      return '服务时长最少为0.5小时';
    }
    if (num > 12) {
      return '服务时长最多为12小时';
    }
    if (Math.round(num * 2) !== num * 2) {
      return '服务时长必须是0.5的倍数';
    }
    return undefined;
  };

  const validateDescription = (value: string): string | undefined => {
    if (value.length > 100) {
      return '描述不能超过100字';
    }
    return undefined;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hoursError = validateHours(hours);
    const descError = validateDescription(description);

    if (hoursError || descError) {
      setErrors({
        hours: hoursError,
        description: descError,
      });
      return;
    }

    onSubmit({
      date,
      hours: parseFloat(hours),
      description,
    });
  };

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setHours(value);
    if (errors.hours) {
      const newError = validateHours(value);
      setErrors(prev => ({ ...prev, hours: newError }));
    }
  };

  const handleDescChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= 100) {
      setDescription(value);
      if (errors.description) {
        setErrors(prev => ({ ...prev, description: undefined }));
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(45, 45, 45, 0.5)',
              backdropFilter: 'blur(4px)',
              zIndex: 40,
            }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 50,
              width: '100%',
              maxWidth: 440,
              padding: 16,
            }}
          >
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 24,
                boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '24px 24px 0 24px',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 4,
                    background: 'linear-gradient(90deg, #F5A623 0%, #F7E9D7 100%)',
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 20,
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 22,
                      fontWeight: 700,
                      color: '#2D2D2D',
                    }}
                  >
                    服务打卡
                  </h3>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      border: 'none',
                      background: '#F7E9D7',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#8B7355',
                      fontSize: 18,
                      fontWeight: 600,
                    }}
                  >
                    ✕
                  </motion.button>
                </div>
              </div>

              <form onSubmit={handleSubmit} style={{ padding: '0 24px 24px 24px' }}>
                <div style={{ marginBottom: 16 }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#2D2D2D',
                      marginBottom: 8,
                    }}
                  >
                    服务日期
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: 15,
                      borderRadius: 12,
                      border: '2px solid #F7E9D7',
                      background: '#FFFBF5',
                      color: '#2D2D2D',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#F5A623';
                      e.target.style.boxShadow = '0 0 0 3px rgba(245, 166, 35, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#F7E9D7';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#2D2D2D',
                      marginBottom: 8,
                    }}
                  >
                    服务时长（小时）
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="12"
                    value={hours}
                    onChange={handleHoursChange}
                    placeholder="请输入时长，如 2.5"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: 15,
                      borderRadius: 12,
                      border: errors.hours ? '2px solid #E74C3C' : '2px solid #F7E9D7',
                      background: '#FFFBF5',
                      color: '#2D2D2D',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    onFocus={(e) => {
                      if (!errors.hours) {
                        e.target.style.borderColor = '#F5A623';
                        e.target.style.boxShadow = '0 0 0 3px rgba(245, 166, 35, 0.1)';
                      }
                    }}
                    onBlur={(e) => {
                      if (!errors.hours) {
                        e.target.style.borderColor = '#F7E9D7';
                        e.target.style.boxShadow = 'none';
                      }
                    }}
                  />
                  {errors.hours && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        margin: '8px 0 0 0',
                        fontSize: 12,
                        color: '#E74C3C',
                        fontWeight: 500,
                      }}
                    >
                      ⚠ {errors.hours}
                    </motion.p>
                  )}
                  <p
                    style={{
                      margin: '6px 0 0 0',
                      fontSize: 12,
                      color: '#A0896B',
                    }}
                  >
                    提示：以0.5小时为单位，最大12小时
                  </p>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 8,
                    }}
                  >
                    <label
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#2D2D2D',
                      }}
                    >
                      服务描述
                    </label>
                    <span
                      style={{
                        fontSize: 12,
                        color: description.length >= 90 ? '#E74C3C' : '#A0896B',
                        fontWeight: 500,
                      }}
                    >
                      {description.length}/100
                    </span>
                  </div>
                  <textarea
                    value={description}
                    onChange={handleDescChange}
                    maxLength={100}
                    rows={4}
                    placeholder="请简要描述本次服务内容..."
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: 15,
                      borderRadius: 12,
                      border: errors.description ? '2px solid #E74C3C' : '2px solid #F7E9D7',
                      background: '#FFFBF5',
                      color: '#2D2D2D',
                      outline: 'none',
                      boxSizing: 'border-box',
                      resize: 'none',
                      fontFamily: 'inherit',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    onFocus={(e) => {
                      if (!errors.description) {
                        e.target.style.borderColor = '#F5A623';
                        e.target.style.boxShadow = '0 0 0 3px rgba(245, 166, 35, 0.1)';
                      }
                    }}
                    onBlur={(e) => {
                      if (!errors.description) {
                        e.target.style.borderColor = '#F7E9D7';
                        e.target.style.boxShadow = 'none';
                      }
                    }}
                  />
                  {errors.description && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        margin: '8px 0 0 0',
                        fontSize: 12,
                        color: '#E74C3C',
                        fontWeight: 500,
                      }}
                    >
                      ⚠ {errors.description}
                    </motion.p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <motion.button
                    type="button"
                    whileHover={{ backgroundColor: '#F0DCC3' }}
                    whileTap={{ scale: 0.97 }}
                    onClick={onClose}
                    style={{
                      flex: 1,
                      padding: '14px 20px',
                      fontSize: 15,
                      fontWeight: 600,
                      borderRadius: 14,
                      border: 'none',
                      background: '#F7E9D7',
                      color: '#8B7355',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                    }}
                  >
                    取消
                  </motion.button>
                  <motion.button
                    type="submit"
                    whileHover={{ backgroundColor: '#E69514' }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      flex: 1.5,
                      padding: '14px 20px',
                      fontSize: 15,
                      fontWeight: 600,
                      borderRadius: 14,
                      border: 'none',
                      background: '#F5A623',
                      color: '#FFFFFF',
                      cursor: 'pointer',
                      boxShadow: '0 4px 16px rgba(245, 166, 35, 0.35)',
                      transition: 'background-color 0.2s, box-shadow 0.2s',
                    }}
                  >
                    提交打卡
                  </motion.button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CheckInModal;
