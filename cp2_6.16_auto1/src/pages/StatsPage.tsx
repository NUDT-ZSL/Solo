import EmotionChart from '../components/EmotionChart';

export default function StatsPage() {
  return (
    <div className="w-full">
      <h2 className="text-xl font-bold mb-6" style={{ color: '#5d4037' }}>
        阅读统计分析
      </h2>
      <EmotionChart />
    </div>
  );
}
