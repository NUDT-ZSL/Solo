export default function HomePage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center max-w-3xl">
        <h1 className="text-4xl sm:text-5xl font-bold mb-6" style={{ fontFamily: 'var(--font-family-serif)' }}>
          时光信件
        </h1>
        <p className="text-lg text-[var(--color-text-secondary)] mb-8">
          给未来的自己写一封信，让时光珍藏此刻的心情
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <a
            href="/create"
            className="px-8 py-3 rounded-xl text-white font-medium shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
            style={{
              background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
            }}
          >
            开始写信
          </a>
          <a
            href="/dashboard"
            className="px-8 py-3 rounded-xl glass-button font-medium"
          >
            查看我的信件
          </a>
        </div>
      </div>
    </div>
  );
}
