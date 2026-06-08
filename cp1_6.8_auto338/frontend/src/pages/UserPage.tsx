import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getUserProfile } from '@/utils/api';
import type { UserProfile } from '@/utils/api';

export default function UserPage() {
  const { anonymousId } = useParams<{ anonymousId: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!anonymousId) return;
    setLoading(true);
    getUserProfile(anonymousId)
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [anonymousId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-night-100 animate-pulse">加载中...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-night-100">未找到该用户</p>
        <Link to="/" className="glass-button text-sm">返回首页</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <section className="glass-button p-6 space-y-4">
        <h1 className="gold-text text-2xl font-bold">诗人档案</h1>
        <div className="flex gap-8 text-sm text-night-100">
          <span>匿名ID: {profile.anonymous_id}</span>
          <span>诗句 {profile.total_lines} 行</span>
          <span>被缝合 {profile.total_stitched} 次</span>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-night-100 text-sm">TA 的诗句</h2>
        {profile.lines.length === 0 ? (
          <p className="text-center text-night-100 py-8">暂无诗句</p>
        ) : (
          profile.lines.map((line, i) => (
            <div
              key={line.id}
              className="card-enter glass-button p-4"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <p className="poem-line-anim text-night-50 text-lg">{line.content}</p>
              <p className="text-xs text-night-100 mt-2">缝合 {line.stitch_count} 次</p>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
