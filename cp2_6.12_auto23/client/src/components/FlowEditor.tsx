import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Receipt, Briefcase, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { createFlow } from '../api';
import { useStore } from '../store/useStore';
import type { FlowType, LeaveForm, ExpenseForm, BusinessForm } from '../types';

interface TypeCardProps {
  type: FlowType;
  label: string;
  icon: typeof Calendar;
  selected: boolean;
  onClick: () => void;
}

function TypeCard({ type: _type, label, icon: Icon, selected, onClick }: TypeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 transition-all duration-200',
        'hover:shadow-md hover:-translate-y-0.5',
        selected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-gray-300'
      )}
    >
      <div
        className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center transition-colors',
          selected ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
        )}
      >
        <Icon className="w-6 h-6" />
      </div>
      <span
        className={cn(
          'font-medium text-sm transition-colors',
          selected ? 'text-blue-600' : 'text-gray-700'
        )}
      >
        {label}
      </span>
    </button>
  );
}

interface FormInputProps {
  label: string;
  children: React.ReactNode;
}

function FormInput({ label, children }: FormInputProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}

const inputBase =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400';

export default function FlowEditor() {
  const navigate = useNavigate();
  const { user } = useStore();
  const [selectedType, setSelectedType] = useState<FlowType | null>(null);
  const [prevType, setPrevType] = useState<FlowType | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [leaveForm, setLeaveForm] = useState<LeaveForm>({
    type: '年假',
    startDate: '',
    endDate: '',
    reason: '',
    days: 0,
  });

  const [expenseForm, setExpenseForm] = useState<ExpenseForm>({
    amount: 0,
    category: '差旅费',
    description: '',
    date: new Date().toISOString().slice(0, 10),
  });

  const [businessForm, setBusinessForm] = useState<BusinessForm>({
    title: '',
    destination: '',
    startDate: '',
    endDate: '',
    purpose: '',
    budget: 0,
  });

  useEffect(() => {
    if (selectedType && prevType !== selectedType) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [selectedType, prevType]);

  const handleTypeSelect = (type: FlowType) => {
    setPrevType(selectedType);
    setSelectedType(type);
  };

  const calculateLeaveDays = () => {
    if (leaveForm.startDate && leaveForm.endDate) {
      const start = new Date(leaveForm.startDate);
      const end = new Date(leaveForm.endDate);
      const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (diff > 0) {
        setLeaveForm((prev) => ({ ...prev, days: diff }));
      }
    }
  };

  const isFormValid = () => {
    if (!selectedType) return false;
    switch (selectedType) {
      case 'leave':
        return leaveForm.startDate && leaveForm.endDate && leaveForm.days > 0 && leaveForm.reason.trim();
      case 'expense':
        return expenseForm.amount > 0 && expenseForm.category && expenseForm.description.trim();
      case 'business':
        return (
          businessForm.destination.trim() &&
          businessForm.startDate &&
          businessForm.endDate &&
          businessForm.budget >= 0
        );
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    if (!selectedType || !isFormValid() || submitting) return;

    setSubmitting(true);
    try {
      let formData: LeaveForm | ExpenseForm | BusinessForm;
      switch (selectedType) {
        case 'leave':
          formData = leaveForm;
          break;
        case 'expense':
          formData = expenseForm;
          break;
        case 'business':
          formData = businessForm;
          break;
      }

      const response: any = await createFlow(selectedType, formData);
      if (response.success || response.code === 0) {
        navigate('/my-flows');
      }
    } catch (error) {
      console.error('提交失败:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">创建审批</h1>
        <p className="mt-1 text-sm text-gray-500">选择审批类型并填写相应信息</p>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">审批类型</h2>
        <div className="grid grid-cols-3 gap-4">
          <TypeCard
            type="leave"
            label="请假申请"
            icon={Calendar}
            selected={selectedType === 'leave'}
            onClick={() => handleTypeSelect('leave')}
          />
          <TypeCard
            type="expense"
            label="报销申请"
            icon={Receipt}
            selected={selectedType === 'expense'}
            onClick={() => handleTypeSelect('expense')}
          />
          <TypeCard
            type="business"
            label="出差申请"
            icon={Briefcase}
            selected={selectedType === 'business'}
            onClick={() => handleTypeSelect('business')}
          />
        </div>
      </div>

      <div className="relative overflow-hidden">
        {selectedType && (
          <div
            className={cn(
              'bg-white rounded-xl border border-gray-200 p-6 shadow-sm',
              isAnimating && 'animate-collapse'
            )}
            style={{
              maxHeight: isAnimating ? 0 : 1000,
              opacity: isAnimating ? 0 : 1,
              transition: 'max-height 0.3s ease-out, opacity 0.3s ease-out',
              overflow: 'hidden',
            }}
          >
            {selectedType === 'leave' && (
              <div className="space-y-5">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  请假信息
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormInput label="开始日期">
                    <input
                      type="date"
                      className={inputBase}
                      value={leaveForm.startDate}
                      onChange={(e) =>
                        setLeaveForm((prev) => ({ ...prev, startDate: e.target.value }))
                      }
                      onBlur={calculateLeaveDays}
                    />
                  </FormInput>
                  <FormInput label="结束日期">
                    <input
                      type="date"
                      className={inputBase}
                      value={leaveForm.endDate}
                      onChange={(e) =>
                        setLeaveForm((prev) => ({ ...prev, endDate: e.target.value }))
                      }
                      onBlur={calculateLeaveDays}
                    />
                  </FormInput>
                </div>
                <FormInput label="请假天数">
                  <input
                    type="number"
                    min={1}
                    className={inputBase}
                    value={leaveForm.days || ''}
                    onChange={(e) =>
                      setLeaveForm((prev) => ({ ...prev, days: Number(e.target.value) }))
                    }
                    placeholder="请输入天数"
                  />
                </FormInput>
                <FormInput label="请假原因">
                  <textarea
                    rows={4}
                    className={cn(inputBase, 'resize-none')}
                    value={leaveForm.reason}
                    onChange={(e) =>
                      setLeaveForm((prev) => ({ ...prev, reason: e.target.value }))
                    }
                    placeholder="请详细说明请假原因..."
                  />
                </FormInput>
              </div>
            )}

            {selectedType === 'expense' && (
              <div className="space-y-5">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-blue-500" />
                  报销信息
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormInput label="报销金额（元）">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className={inputBase}
                      value={expenseForm.amount || ''}
                      onChange={(e) =>
                        setExpenseForm((prev) => ({ ...prev, amount: Number(e.target.value) }))
                      }
                      placeholder="请输入金额"
                    />
                  </FormInput>
                  <FormInput label="费用分类">
                    <select
                      className={inputBase}
                      value={expenseForm.category}
                      onChange={(e) =>
                        setExpenseForm((prev) => ({ ...prev, category: e.target.value }))
                      }
                    >
                      <option value="差旅费">差旅费</option>
                      <option value="办公费">办公费</option>
                      <option value="餐饮费">餐饮费</option>
                      <option value="其他">其他</option>
                    </select>
                  </FormInput>
                </div>
                <FormInput label="票据描述">
                  <textarea
                    rows={4}
                    className={cn(inputBase, 'resize-none')}
                    value={expenseForm.description}
                    onChange={(e) =>
                      setExpenseForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="请说明费用明细及票据情况..."
                  />
                </FormInput>
              </div>
            )}

            {selectedType === 'business' && (
              <div className="space-y-5">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-blue-500" />
                  出差信息
                </h3>
                <FormInput label="出差地点">
                  <input
                    type="text"
                    className={inputBase}
                    value={businessForm.destination}
                    onChange={(e) =>
                      setBusinessForm((prev) => ({ ...prev, destination: e.target.value }))
                    }
                    placeholder="请输入出差地点"
                  />
                </FormInput>
                <div className="grid grid-cols-2 gap-4">
                  <FormInput label="开始日期">
                    <input
                      type="date"
                      className={inputBase}
                      value={businessForm.startDate}
                      onChange={(e) =>
                        setBusinessForm((prev) => ({ ...prev, startDate: e.target.value }))
                      }
                    />
                  </FormInput>
                  <FormInput label="结束日期">
                    <input
                      type="date"
                      className={inputBase}
                      value={businessForm.endDate}
                      onChange={(e) =>
                        setBusinessForm((prev) => ({ ...prev, endDate: e.target.value }))
                      }
                    />
                  </FormInput>
                </div>
                <FormInput label="预算金额（元）">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className={inputBase}
                    value={businessForm.budget || ''}
                    onChange={(e) =>
                      setBusinessForm((prev) => ({ ...prev, budget: Number(e.target.value) }))
                    }
                    placeholder="请输入预算金额"
                  />
                </FormInput>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedType && (
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              setPrevType(selectedType);
              setSelectedType(null);
            }}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isFormValid() || submitting}
            className={cn(
              'px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-all flex items-center gap-2',
              !isFormValid() || submitting
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
            )}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? '提交中...' : '提交申请'}
          </button>
        </div>
      )}
    </div>
  );
}
