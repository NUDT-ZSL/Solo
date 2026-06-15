import StatsPanel from '@/components/StatsPanel'

export default function Stats() {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
        <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-[#fdcb6e] to-[#e17055]" />
        统计看板
      </h2>
      <StatsPanel />
    </div>
  )
}
