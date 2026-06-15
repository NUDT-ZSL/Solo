import { BarChart3 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  type TooltipProps,
} from 'recharts';

interface ResultChartProps {
  poll: {
    options: string[];
    votes: number[];
  };
}

interface ChartData {
  name: string;
  fullName: string;
  votes: number;
}

const COLORS = ['#4facfe', '#00f2fe', '#43e97b', '#fa709a', '#fee140', '#30cfd0'];

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const data = item?.payload as ChartData | undefined;
  return (
    <div
      className="bg-white rounded-lg px-3 py-2 shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
    >
      <p className="text-sm font-medium text-gray-800">{data?.fullName ?? label}</p>
      <p className="text-sm text-gray-600">{item.value} 票</p>
    </div>
  );
}

export default function ResultChart({ poll }: ResultChartProps) {
  const data = poll.options.map((option, index) => ({
    name: option.length > 10 ? option.slice(0, 10) + '…' : option,
    fullName: option,
    votes: poll.votes[index] || 0,
  }));

  const totalVotes = poll.votes.reduce((a, b) => a + b, 0);

  return (
    <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] p-6">
      <h3 className="flex items-center gap-2 font-bold text-gray-900 text-lg mb-4">
        <BarChart3 className="w-5 h-5 text-blue-500" />
        投票结果
      </h3>

      {totalVotes === 0 ? (
        <div className="text-center text-gray-400 py-8">暂无投票数据</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: '#666' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#666' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="votes" radius={[6, 6, 0, 0]} animationDuration={1000} animationEasing="ease">
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
