import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, FileText } from 'lucide-react';
import axios from 'axios';

interface ReservationModalProps {
  toolId: string;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReservationModal: React.FC<ReservationModalProps> = ({
  toolId,
  userId,
  onClose,
  onSuccess,
}) => {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [remark, setRemark] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const availableSlots = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date.toISOString().split('T')[0];
  }).filter((_, i) => i % 2 === 0 || i % 3 === 0);

  const handleDateChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') {
      setStartDate(value);
      if (endDate && new Date(endDate) < new Date(value)) {
        setEndDate('');
      }
    } else {
      if (!startDate) return;
      const start = new Date(startDate);
      const end = new Date(value);
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 7) {
        setEndDate(value);
      }
    }
  };

  const handleSubmit = async () => {
    if (!startDate || !endDate) return;
    setIsSubmitting(true);
    try {
      await axios.post('/api/reservations', {
        toolId,
        userId,
        startDate,
        endDate,
        remark,
      });
      setIsSubmitted(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 800);
    } catch (error) {
      console.error('Reservation failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDateDisabled = (date: string) => !availableSlots.includes(date);

  const renderCalendar = () => {
    const today = new Date();
    const days = [];
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const startDay = firstDay.getDay();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-10" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isAvailable = availableSlots.includes(dateStr);
      const isSelected = startDate === dateStr || endDate === dateStr;
      const isInRange = startDate && endDate && dateStr >= startDate && dateStr <= endDate;
      const isDisabled = isDateDisabled(dateStr) || day < today.getDate();

      days.push(
        <button
          key={day}
          disabled={isDisabled}
          onClick={() => {
            if (!startDate || (startDate && endDate)) {
              handleDateChange('start', dateStr);
            } else {
              handleDateChange('end', dateStr);
            }
          }}
          className={`h-10 w-10 rounded-lg text-sm font-medium transition-all duration-200
            ${isSelected ? 'bg-secondary text-white' : ''}
            ${isInRange && !isSelected ? 'bg-secondary/20' : ''}
            ${isAvailable && !isDisabled && !isSelected ? 'bg-green-100 text-green-700 hover:bg-green-200' : ''}
            ${isDisabled ? 'text-gray-300 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {day}
        </button>
      );
    }
    return days;
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <motion.div
          className="relative w-full max-w-md backdrop-blur-md bg-white/80 rounded-2xl shadow-2xl overflow-hidden"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.3, type: 'spring', damping: 25, stiffness: 300 }}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">预约工具</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={18} className="text-secondary" />
                  <span className="font-medium text-gray-700">选择日期</span>
                  <span className="text-xs text-gray-400">(最多7天)</span>
                </div>
                <div className="bg-white/50 rounded-xl p-4">
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
                      <div key={d} className="h-8 flex items-center justify-center text-xs text-gray-400">
                        {d}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {renderCalendar()}
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={16} className="text-secondary" />
                    <span className="text-sm text-gray-600">开始日期</span>
                  </div>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleDateChange('start', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-secondary/30"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={16} className="text-secondary" />
                    <span className="text-sm text-gray-600">结束日期</span>
                  </div>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => handleDateChange('end', e.target.value)}
                    min={startDate}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-secondary/30"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={18} className="text-secondary" />
                  <span className="font-medium text-gray-700">借用用途</span>
                </div>
                <textarea
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="请填写借用用途..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-secondary/30 resize-none"
                />
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!startDate || !endDate || isSubmitting || isSubmitted}
              className={`w-full mt-6 py-3 rounded-xl font-semibold transition-all duration-200
                ${isSubmitted
                  ? 'bg-green-500 text-white cursor-not-allowed'
                  : isSubmitting || !startDate || !endDate
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-secondary to-secondary-light text-white hover:shadow-lg hover:-translate-y-0.5'
                }`}
            >
              {isSubmitted ? '已预约' : isSubmitting ? '提交中...' : '确认预约'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
