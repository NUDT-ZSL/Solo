import React from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { ArrowRight, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface CreditPanelProps {
  userId: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  date: string;
  reviewer: string;
}

interface HistoryItem {
  id: string;
  type: 'lent' | 'borrowed';
  toolName: string;
  date: string;
  status: 'returned' | 'in-progress' | 'overdue';
}

const mockReviews: Review[] = [
  { id: '1', rating: 5, comment: '非常靠谱，工具保养得很好！', date: '2024-01-10', reviewer: '张大哥' },
  { id: '2', rating: 4, comment: '按时归还，沟通顺畅', date: '2024-01-05', reviewer: '李阿姨' },
  { id: '3', rating: 3, comment: '归还稍晚，下次注意', date: '2023-12-28', reviewer: '王叔叔' },
  { id: '4', rating: 5, comment: '非常感谢，工具很实用', date: '2023-12-15', reviewer: '赵姐' },
];

const mockHistory: HistoryItem[] = [
  { id: '1', type: 'borrowed', toolName: '电钻', date: '01/12', status: 'in-progress' },
  { id: '2', type: 'lent', toolName: '梯子', date: '01/08', status: 'returned' },
  { id: '3', type: 'borrowed', toolName: '螺丝刀套装', date: '01/03', status: 'returned' },
  { id: '4', type: 'lent', toolName: '电锯', date: '12/28', status: 'overdue' },
  { id: '5', type: 'borrowed', toolName: '扳手', date: '12/20', status: 'returned' },
];

const statusColor = {
  returned: 'bg-green-500',
  'in-progress': 'bg-orange-500',
  overdue: 'bg-gray-400',
};

const ratingColor = {
  5: 'bg-green-500',
  4: 'bg-green-400',
  3: 'bg-orange-500',
  2: 'bg-orange-400',
  1: 'bg-red-500',
};

export const CreditPanel: React.FC<CreditPanelProps> = ({ userId }) => {
  const creditScore = 78;

  const data = [
    { name: 'score', value: creditScore },
    { name: 'remaining', value: 100 - creditScore },
  ];

  const gradientId = `creditGradient-${userId}`;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">信用评分</h3>
        <div className="flex items-center gap-8">
          <div className="relative w-48 h-48">
            <svg className="absolute inset-0 w-full h-full">
              <defs>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#22c55e" />
                </linearGradient>
              </defs>
            </svg>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                  animationDuration={1000}
                  animationBegin={0}
                >
                  <Cell fill={`url(#${gradientId})`} />
                  <Cell fill="#f3f4f6" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                className="text-4xl font-bold"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                style={{
                  background: `linear-gradient(135deg, #ef4444 0%, #f59e0b 50%, #22c55e 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {creditScore}
              </motion.span>
              <span className="text-sm text-gray-500">信用分</span>
            </div>
          </div>

          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle size={16} className="text-green-500" />
              <span className="text-gray-600">按时归还率</span>
              <span className="font-semibold text-gray-800 ml-auto">92%</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle size={16} className="text-green-500" />
              <span className="text-gray-600">平均评分</span>
              <span className="font-semibold text-gray-800 ml-auto">4.3/5</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle size={16} className="text-green-500" />
              <span className="text-gray-600">累计借出</span>
              <span className="font-semibold text-gray-800 ml-auto">12 次</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle size={16} className="text-green-500" />
              <span className="text-gray-600">累计借用</span>
              <span className="font-semibold text-gray-800 ml-auto">18 次</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">近期评价</h3>
        <div className="space-y-3">
          {mockReviews.map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="flex rounded-xl bg-gray-50 overflow-hidden"
            >
              <div className={`w-1.5 ${ratingColor[review.rating as keyof typeof ratingColor]}`} />
              <div className="flex-1 p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-800">{review.reviewer}</span>
                  <span className="text-xs text-gray-400">{review.date}</span>
                </div>
                <div className="flex items-center gap-0.5 mb-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span
                      key={i}
                      className={`text-sm ${i < review.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <p className="text-sm text-gray-600">{review.comment}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">借出/借用历史</h3>
        <div className="relative">
          <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-200" />
          <div className="flex justify-between items-start">
            {mockHistory.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="relative flex flex-col items-center z-10"
              >
                <div className={`w-4 h-4 rounded-full ${statusColor[item.status]} border-2 border-white shadow-sm mb-3`} />
                <div className="text-center">
                  <span className={`inline-block px-2 py-0.5 text-xs rounded-full mb-1 ${item.type === 'lent' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                    {item.type === 'lent' ? '借出' : '借用'}
                  </span>
                  <p className="text-sm font-medium text-gray-800">{item.toolName}</p>
                  <p className="text-xs text-gray-400">{item.date}</p>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="flex justify-between mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>已归还</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <span>进行中</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-2 h-2 rounded-full bg-gray-400" />
              <span>已逾期</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
