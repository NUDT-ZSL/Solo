import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { initDatabase, setVotingLocked, isVotingLockedStatus } from './database';
import { getAllProposals, createProposal, getResults } from './services/proposalService';
import { handleVote } from './services/voteService';

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '音乐投票服务运行中', isLocked: isVotingLockedStatus() });
});

app.get('/api/proposals', (req, res) => {
  try {
    const voterId = req.headers['x-voter-id'] as string || 'default-voter';
    const proposals = getAllProposals(voterId);

    const formatted = proposals.map(p => ({
      id: p.id,
      songName: p.songName,
      artist: p.artist,
      submitter: p.submitter,
      upvotes: p.upvotes,
      downvotes: p.downvotes,
      duration: p.duration,
      userVote: (p as any).userVote || null,
    }));

    res.json(formatted);
  } catch (error) {
    console.error('获取提案失败:', error);
    res.status(500).json({ error: '获取提案失败' });
  }
});

app.post('/api/proposals', (req, res) => {
  try {
    const { songName, artist, submitter } = req.body;

    if (!songName || !artist || !submitter) {
      return res.status(400).json({ error: '缺少必要字段' });
    }

    if (songName.length > 30) {
      return res.status(400).json({ error: '歌曲名不能超过30字' });
    }

    const proposal = createProposal(
      songName.trim(),
      artist.trim(),
      submitter.trim()
    );

    res.status(201).json({
      id: proposal.id,
      songName: proposal.songName,
      artist: proposal.artist,
      submitter: proposal.submitter,
      upvotes: proposal.upvotes,
      downvotes: proposal.downvotes,
      duration: proposal.duration,
    });
  } catch (error) {
    console.error('创建提案失败:', error);
    res.status(500).json({ error: '创建提案失败' });
  }
});

app.post('/api/vote', (req, res) => {
  try {
    const { proposalId, voteType } = req.body;
    const voterId = req.headers['x-voter-id'] as string || 'default-voter';

    if (!proposalId || !voteType) {
      return res.status(400).json({ error: '缺少必要字段' });
    }

    if (voteType !== 'up' && voteType !== 'down') {
      return res.status(400).json({ error: '无效的投票类型' });
    }

    const result = handleVote(proposalId, voteType, voterId);

    if (result.message === '投票已锁定') {
      return res.status(403).json(result);
    }

    res.json(result);
  } catch (error: any) {
    console.error('投票失败:', error);
    if (error.message === '提案不存在') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: '投票失败' });
  }
});

app.post('/api/lock-voting', (req, res) => {
  try {
    setVotingLocked(true);
    res.json({ success: true, message: '投票已锁定' });
  } catch (error) {
    console.error('锁定投票失败:', error);
    res.status(500).json({ error: '锁定投票失败' });
  }
});

app.get('/api/results', (req, res) => {
  try {
    const results = getResults();

    const formatted = results.map((p, index) => ({
      id: p.id,
      songName: p.songName,
      artist: p.artist,
      submitter: p.submitter,
      upvotes: p.upvotes,
      downvotes: p.downvotes,
      duration: p.duration,
      rank: index + 1,
    }));

    res.json({
      isLocked: isVotingLockedStatus(),
      data: formatted,
    });
  } catch (error) {
    console.error('获取结果失败:', error);
    res.status(500).json({ error: '获取结果失败' });
  }
});

async function startServer() {
  try {
    await initDatabase();
    console.log('📊 数据库初始化完成');

    app.listen(PORT, () => {
      console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
      console.log(`📡 API 端点: /api/proposals, /api/vote, /api/results, /api/lock-voting`);
    });
  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
}

startServer();

export default app;
