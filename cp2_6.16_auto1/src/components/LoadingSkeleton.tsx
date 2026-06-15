interface LoadingSkeletonProps {
  count?: number;
  height?: string;
}

export default function LoadingSkeleton({ count = 3, height = '80px' }: LoadingSkeletonProps) {
  return (
    <div className="w-full flex flex-col gap-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="w-full rounded-lg bg-gray-300"
          style={{
            height,
            animation: 'pulse-skeleton 1.5s ease-in-out infinite',
            animationDelay: `${index * 0.2}s`,
          }}
        />
      ))}
    </div>
  );
}
