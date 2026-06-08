import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Lock, Heart, Calendar, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCapsuleStore } from '@/store/capsuleStore';
import CountdownBar from '@/components/CountdownBar';
import FriendList from '@/components/FriendList';
import { generateShareLink } from '@/utils/api';

const MOOD_LABELS: Record<string, string> = {
  happy: '开心',
  calm: '平静',
  nostalgic: '怀念',
  sad: '忧伤',
  excited: '激动',
};

export default function CapsuleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { current, loading, fetchOne, inviteFriend: invite } = useCapsuleStore();
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (id) fetchOne(id);
  }, [id, fetchOne]);

  if (loading || !current) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-vintage-gradient">
        <p className="text-vintage-brown/60">加载中...</p>
      </div>
    );
  }

  const { capsule, isUnlocked, countdown } = current;

  const handleShare = async () => {
    if (!id) return;
    const shareId = await generateShareLink(id);
    const url = `${window.location.origin}/share/${shareId}`;
    setShareUrl(url);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInvite = (email: string) => {
    if (id) invite(id, email);
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-vintage-gradient px-4 py-12">
        <button
          onClick={() => navigate('/')}
          className="mb-8 flex items-center gap-1 text-sm text-vintage-brown transition-opacity hover:opacity-70"
        >
          <ArrowLeft className="h-4 w-4" /> 返回
        </button>

        <div className="mx-auto max-w-lg rounded-lg border border-vintage-brown/20 bg-vintage-paper p-8 text-center shadow-md bg-paper-texture">
          <Lock className="mx-auto mb-4 h-12 w-12 text-vintage-ink/40" />
          <h2 className="mb-2 font-serif-heading text-2xl text-vintage-ink/50">{capsule.title}</h2>
          <p className="mb-6 text-sm text-vintage-brown/60">此胶囊尚未解锁</p>
          <CountdownBar unlockYear={capsule.unlockYear} progress={countdown.progress} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vintage-gradient px-4 py-12">
      <button
        onClick={() => navigate('/')}
        className="mb-8 flex items-center gap-1 text-sm text-vintage-brown transition-opacity hover:opacity-70"
      >
        <ArrowLeft className="h-4 w-4" /> 返回
      </button>

      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-lg border border-vintage-brown/20 bg-vintage-paper p-8 shadow-md bg-paper-texture">
          <div className="mb-6 flex items-start justify-between">
            <h2 className="font-serif-heading text-3xl text-vintage-ink">{capsule.title}</h2>
            <span className="flex items-center gap-1 rounded-full bg-vintage-brown/10 px-3 py-1 text-sm text-vintage-brown">
              <Calendar className="h-3.5 w-3.5" /> {capsule.year}
            </span>
          </div>

          <div className="mb-6">
            <h4 className="mb-2 text-sm font-medium text-vintage-brown">事件记录</h4>
            <ul className="space-y-2">
              {capsule.events.map((event, i) => (
                <li key={i} className="text-vintage-ink/80 before:mr-2 before:text-vintage-brown before:content-['•']">
                  {event}
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-6 flex items-center gap-2">
            <Heart className="h-4 w-4 text-vintage-brown" />
            <span className="text-sm text-vintage-brown">心情：</span>
            <span className="rounded-full bg-vintage-cream px-3 py-1 text-sm text-vintage-ink">
              {MOOD_LABELS[capsule.mood] ?? capsule.mood}
            </span>
          </div>

          {capsule.photos.length > 0 && (
            <div className="mb-6">
              <h4 className="mb-2 flex items-center gap-1 text-sm font-medium text-vintage-brown">
                <ImageIcon className="h-4 w-4" /> 照片
              </h4>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {capsule.photos.map((photo, i) => (
                  <div key={i} className="photo-faded overflow-hidden rounded-lg">
                    <img
                      src={photo}
                      alt={`照片 ${i + 1}`}
                      className="h-32 w-full object-cover md:h-40"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <CountdownBar unlockYear={capsule.unlockYear} progress={countdown.progress} />
        </div>

        <div className="rounded-lg border border-vintage-brown/20 bg-vintage-paper p-6 shadow-md bg-paper-texture">
          <FriendList
            friends={capsule.invitedFriends}
            capsuleId={capsule.id}
            onInvite={handleInvite}
          />
        </div>

        <div className="rounded-lg border border-vintage-brown/20 bg-vintage-paper p-6 shadow-md bg-paper-texture">
          <h4 className="mb-3 font-serif-heading text-base text-vintage-ink">分享</h4>
          {!shareUrl ? (
            <button
              onClick={handleShare}
              className="flex items-center gap-2 rounded-lg bg-vintage-brown px-4 py-2 text-sm text-vintage-cream transition-opacity hover:opacity-90"
            >
              <Share2 className="h-4 w-4" /> 生成分享链接
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 rounded-lg border border-vintage-brown/20 bg-vintage-cream/50 px-3 py-2 text-sm text-vintage-ink"
              />
              <button
                onClick={handleCopy}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm transition-opacity hover:opacity-90',
                  copied
                    ? 'bg-green-700 text-white'
                    : 'bg-vintage-brown text-vintage-cream',
                )}
              >
                {copied ? '已复制' : '复制'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
