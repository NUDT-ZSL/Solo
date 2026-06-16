import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

function generateContributor(username, index, total) {
  const commits = Math.floor(Math.random() * 500) + 10;
  const linesAdded = Math.floor(Math.random() * 50000) + 1000;
  const linesDeleted = Math.floor(Math.random() * 30000) + 500;
  const issues = Math.floor(Math.random() * 100) + 1;
  const pullRequests = Math.floor(Math.random() * 80) + 2;
  const prMerged = Math.floor(pullRequests * (0.5 + Math.random() * 0.45));
  const prMergeRate = pullRequests > 0 ? prMerged / pullRequests : 0;

  const skills = {
    codeContribution: Math.min(100, Math.floor(commits / 5 + Math.random() * 20)),
    issueManagement: Math.min(100, Math.floor(issues * 2 + Math.random() * 15)),
    codeReview: Math.min(100, Math.floor(prMerged * 1.5 + Math.random() * 20)),
    documentation: Math.floor(Math.random() * 80) + 10,
    communityEngagement: Math.floor(Math.random() * 70) + 15,
    projectManagement: Math.floor(Math.random() * 60) + 5
  };

  const timeline = [];
  const eventTypes = ['commit', 'issue', 'pr', 'review', 'comment'];
  const eventDescriptions = {
    commit: '提交了代码',
    issue: '创建了 Issue',
    pr: '提交了 Pull Request',
    review: '进行了代码审查',
    comment: '发表了评论'
  };

  for (let i = 0; i < 15; i++) {
    const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const daysAgo = Math.floor(Math.random() * 180);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    timeline.push({
      id: uuidv4(),
      type,
      date: date.toISOString().split('T')[0],
      description: eventDescriptions[type],
      isActive: Math.random() > 0.3
    });
  }

  timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

  return {
    username,
    avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${username}`,
    commits,
    linesAdded,
    linesDeleted,
    issues,
    pullRequests,
    prMerged,
    prMergeRate,
    skills,
    timeline
  };
}

function generateRepoData(owner, repo, contributorCount) {
  const names = [
    'alice', 'bob', 'charlie', 'david', 'eve', 'frank', 'grace', 'henry',
    'ivy', 'jack', 'kate', 'leo', 'mia', 'noah', 'olivia', 'peter',
    'queen', 'rose', 'sam', 'tina', 'uma', 'victor', 'wendy', 'xavier',
    'yara', 'zack', 'amy', 'brian', 'cindy', 'derek', 'emma', 'felix',
    'gina', 'harry', 'iris', 'jason', 'kelly', 'larry', 'monica', 'nathan',
    'olga', 'patrick', 'quinn', 'rachel', 'steve', 'tracy', 'ulysses', 'vicky',
    'walter', 'xenia', 'young', 'zoe', 'adam', 'beth', 'carl', 'diana',
    'edward', 'fiona', 'george', 'hannah', 'ian', 'julia', 'kevin', 'lily',
    'mike', 'nancy', 'oscar', 'penny', 'quincy', 'randy', 'susan', 'tom',
    'ursula', 'vince', 'wanda', 'xander', 'yvonne', 'zane'
  ];

  const contributors = [];
  for (let i = 0; i < contributorCount && i < names.length; i++) {
    contributors.push(generateContributor(names[i], i, contributorCount));
  }

  if (contributorCount > names.length) {
    for (let i = names.length; i < contributorCount; i++) {
      contributors.push(generateContributor(`user_${i + 1}`, i, contributorCount));
    }
  }

  contributors.sort((a, b) => b.commits - a.commits);

  return {
    name: repo,
    owner,
    totalCommits: contributors.reduce((sum, c) => sum + c.commits, 0),
    contributors
  };
}

const reposCache = new Map();

function getRepoData(owner, repo) {
  const key = `${owner}/${repo}`;
  if (reposCache.has(key)) {
    return reposCache.get(key);
  }

  let contributorCount = 15;
  if (repo.includes('big') || repo.includes('large')) {
    contributorCount = 120;
  }

  const data = generateRepoData(owner, repo, contributorCount);
  reposCache.set(key, data);
  return data;
}

function filterContributors(contributors, filter) {
  switch (filter) {
    case 'code':
      return contributors.filter(c => c.commits > 10);
    case 'issue':
      return contributors.filter(c => c.issues > 0);
    case 'pr':
      return contributors.filter(c => c.pullRequests > 0);
    case 'all':
    default:
      return contributors;
  }
}

function sortContributors(contributors, sortBy) {
  const list = [...contributors];
  switch (sortBy) {
    case 'lines':
      return list.sort((a, b) =>
        (b.linesAdded + b.linesDeleted) - (a.linesAdded + a.linesDeleted)
      );
    case 'prMergeRate':
      return list.sort((a, b) => b.prMergeRate - a.prMergeRate);
    case 'commits':
    default:
      return list.sort((a, b) => b.commits - a.commits);
  }
}

app.get('/api/contributors/:owner/:repo', (req, res) => {
  const { owner, repo } = req.params;
  const { filter = 'all', sortBy = 'commits' } = req.query;

  setTimeout(() => {
    try {
      const data = getRepoData(owner, repo);

      let filtered = filterContributors(data.contributors, filter);
      let sorted = sortContributors(filtered, sortBy);
      const maxCommits = Math.max(...data.contributors.map(c => c.commits));

      res.json({
        success: true,
        data: {
          name: data.name,
          owner: data.owner,
          totalCommits: data.totalCommits,
          maxCommits,
          total: sorted.length,
          contributors: sorted.map(c => ({
            username: c.username,
            avatar: c.avatar,
            commits: c.commits,
            linesAdded: c.linesAdded,
            linesDeleted: c.linesDeleted,
            issues: c.issues,
            pullRequests: c.pullRequests,
            prMerged: c.prMerged,
            prMergeRate: c.prMergeRate,
            skills: c.skills
          }))
        }
      });
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch data' });
    }
  }, 300);
});

app.get('/api/contributors/:owner/:repo/:username', (req, res) => {
  const { owner, repo, username } = req.params;

  setTimeout(() => {
    try {
      const data = getRepoData(owner, repo);
      const contributor = data.contributors.find(c => c.username === username);

      if (!contributor) {
        return res.status(404).json({ success: false, error: 'Contributor not found' });
      }

      res.json({
        success: true,
        data: contributor
      });
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch data' });
    }
  }, 200);
});

app.get('/', (req, res) => {
  res.json({ message: 'Contributor Leaderboard API' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
