export default function SkeletonCard() {
  return (
    <div className="rounded-xl border border-white/5 bg-base-700/50 backdrop-blur-glass p-4 skeleton-pulse">
      <div className="h-4 w-24 bg-base-600 rounded mb-4" />
      <div className="w-full aspect-square bg-base-600 rounded-lg mb-4" />
      <div className="flex justify-between items-center">
        <div className="h-4 w-16 bg-base-600 rounded" />
        <div className="h-5 w-5 bg-base-600 rounded" />
      </div>
    </div>
  )
}
