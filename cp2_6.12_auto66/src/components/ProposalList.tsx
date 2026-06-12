import SongCard, { Proposal } from './SongCard';

interface ProposalListProps {
  proposals: Proposal[];
  onVoteChange?: (id: string, type: 'up' | 'down') => void;
}

function ProposalList({ proposals, onVoteChange }: ProposalListProps) {
  const sortedProposals = [...proposals].sort((a, b) => b.upvotes - a.upvotes);

  if (proposals.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        color: '#667788',
      }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎵</div>
        <p style={{ fontSize: '18px', fontWeight: 500 }}>还没有歌曲提案</p>
        <p style={{ fontSize: '14px', marginTop: '8px' }}>点击右下角按钮提交第一首歌吧！</p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    }}>
      {sortedProposals.map((proposal, index) => (
        <SongCard
          key={proposal.id}
          proposal={proposal}
          rank={index + 1}
          onVoteChange={onVoteChange}
        />
      ))}
    </div>
  );
}

export default ProposalList;
