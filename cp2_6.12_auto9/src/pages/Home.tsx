import VotePanel from '@/components/VotePanel';
import ChatBarrage from '@/components/ChatBarrage';
import HostPanel from '@/components/HostPanel';
import EmojiRain from '@/components/EmojiRain';

export default function Home() {
  return (
    <div className="flex h-screen w-screen flex-col bg-dark md:flex-row">
      <div className="flex flex-[7] flex-col gap-3 p-3 md:p-4">
        <div className="flex-[3] min-h-0">
          <VotePanel />
        </div>
        <div className="flex-[7] min-h-0">
          <ChatBarrage />
        </div>
      </div>

      <div className="hidden flex-[3] p-3 md:block md:p-4">
        <HostPanel />
      </div>

      <div className="md:hidden">
        <HostPanel />
      </div>

      <EmojiRain />
    </div>
  );
}
