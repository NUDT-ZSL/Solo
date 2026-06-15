import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCapsuleStore } from '@/store/capsuleStore';
import CapsuleCard from '@/components/CapsuleCard';

export default function TimeLine() {
  const navigate = useNavigate();
  const { capsules, loading, fetchAll } = useCapsuleStore();

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return (
    <div className="min-h-screen bg-vintage-gradient px-4 py-12">
      <h1 className="mb-12 text-center font-serif-heading text-4xl text-vintage-ink md:text-5xl">
        时光藏品
      </h1>

      {loading && capsules.length === 0 && (
        <p className="text-center text-vintage-brown/60">加载中...</p>
      )}

      {!loading && capsules.length === 0 && (
        <p className="text-center text-vintage-brown/60">还没有时光胶囊，点击右下角创建一个吧</p>
      )}

      <div className="relative mx-auto max-w-4xl">
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-vintage-brown/20 md:block hidden" />
        <div className="absolute left-4 top-0 h-full w-px bg-vintage-brown/20 md:hidden" />

        <div className="space-y-12">
          {capsules.map((item, index) => {
            const isLeft = index % 2 === 0;

            return (
              <div
                key={item.capsule.id}
                className={cn(
                  'relative md:flex md:justify-center',
                  'pl-10 md:pl-0',
                )}
              >
                <div
                  className={cn(
                    'absolute left-4 top-6 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-vintage-brown/30 bg-vintage-paper md:left-1/2',
                  )}
                />

                <div
                  className={cn(
                    'md:w-[45%]',
                    isLeft ? 'md:pr-8 md:text-right' : 'md:ml-auto md:pl-8 md:text-left',
                  )}
                >
                  <CapsuleCard
                    capsule={item.capsule}
                    isUnlocked={item.isUnlocked}
                    countdown={item.countdown}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={() => navigate('/capsule/new')}
        className={cn(
          'fixed bottom-8 right-8 flex h-14 w-14 items-center justify-center rounded-full',
          'border border-vintage-brown/20 bg-vintage-paper/60 backdrop-blur-md',
          'shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl',
          'text-vintage-ink',
        )}
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}
