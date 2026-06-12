import { motion } from 'framer-motion';
import { useState } from 'react';
import axios from 'axios';

export interface Proposal {
  id: string;
  songName: string;
  artist: string;
  submitter: string;
  upvotes: number;
  downvotes: number;
  userVote?: 'up' | 'down' | null;
  duration?: number;
}

interface SongCardProps {
  proposal: Proposal;
  rank?: number;
  onVoteChange?: (id: string, type: 'up' | 'down') => void;
}

function SongCard({ proposal, rank, onVoteChange }: SongCardProps) {
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(proposal.userVote || null);
  const [upvotes, setUpvotes] = useState(proposal.upvotes);
  const [downvotes, setDownvotes] = useState(proposal.downvotes);
  const [isAnimating, setIsAnimating] = useState<'up' | 'down' | null>(null);

  const handleVote = async (type: 'up' | 'down') => {
    setIsAnimating(type);
    setTimeout(() => setIsAnimating(null), 200);

    const wasVoted = userVote === type;

    if (type === 'up') {
      if (wasVoted) {
        setUpvotes(prev => prev - 1);
        setUserVote(null);
      } else {
        setUpvotes(prev => prev + 1);
        if (userVote === 'down') {
          setDownvotes(prev => prev - 1);
        }
        setUserVote('up');
      }
    } else {
      if (wasVoted) {
        setDownvotes(prev => prev - 1);
        setUserVote(null);
      } else {
        setDownvotes(prev => prev + 1);
        if (userVote === 'up') {
          setUpvotes(prev => prev - 1);
        }
        setUserVote('down');
      }
    }

    try {
      await axios.post('/api/vote', {
        proposalId: proposal.id,
        voteType: type,
      });
      if (onVoteChange) {
        onVoteChange(proposal.id, type);
      }
    } catch (error) {
      console.error('投票失败:', error);
      setUpvotes(proposal.upvotes);
      setDownvotes(proposal.downvotes);
      setUserVote(proposal.userVote || null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: '0 12px 30px rgba(15, 52, 96, 0.4)' }}
      transition={{ duration: 0.3 }}
      style={{
        background: '#16213e',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
        border: '1px solid #0f3460',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {rank !== undefined && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          style={{
            position: 'absolute',
            top: '-10px',
            left: '-10px',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #4a9eff 0%, #9b59b6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '18px',
            color: 'white',
            boxShadow: '0 4px 15px rgba(155, 89, 182, 0.4)',
            zIndex: 1,
          }}
        >
          {rank}
        </motion.div>
      )}

      <div style={{ flex: 1, marginLeft: rank !== undefined ? '30px' : '0' }}>
        <h3 style={{
          fontSize: '20px',
          fontWeight: 600,
          color: '#e0e0e0',
          marginBottom: '6px',
        }}>
          {proposal.songName}
        </h3>
        <p style={{
          fontSize: '14px',
          color: '#8899aa',
          marginBottom: '8px',
        }}>
          🎤 艺术家：{proposal.artist}
        </p>
        <p style={{
          fontSize: '13px',
          color: '#667788',
        }}>
          ✍️ 提交者：{proposal.submitter}
        </p>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
      }}>
        <motion.button
          animate={isAnimating === 'up' ? { scale: [1, 0.8, 1.1, 1] } : {}}
          transition={{ duration: 0.2 }}
          onClick={() => handleVote('up')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: userVote === 'up' ? '#4a9eff' : '#666',
            fontSize: '24px',
            padding: '8px 16px',
            borderRadius: '12px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (userVote !== 'up') {
              e.currentTarget.style.background = 'rgba(74, 158, 255, 0.1)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.9)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          👍
          <span style={{ fontSize: '14px', fontWeight: 600 }}>{upvotes}</span>
        </motion.button>

        <motion.button
          animate={isAnimating === 'down' ? { scale: [1, 0.8, 1.1, 1] } : {}}
          transition={{ duration: 0.2 }}
          onClick={() => handleVote('down')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: userVote === 'down' ? '#e94560' : '#666',
            fontSize: '24px',
            padding: '8px 16px',
            borderRadius: '12px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (userVote !== 'down') {
              e.currentTarget.style.background = 'rgba(233, 69, 96, 0.1)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.9)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          👎
          <span style={{ fontSize: '14px', fontWeight: 600 }}>{downvotes}</span>
        </motion.button>
      </div>
    </motion.div>
  );
}

export default SongCard;
