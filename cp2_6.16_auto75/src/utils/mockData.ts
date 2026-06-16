import { Contributor, RepoData, SkillData } from '../types';

function generateSkills(base: Partial<SkillData> = {}): SkillData {
  return {
    codeContribution: base.codeContribution ?? Math.floor(Math.random() * 60) + 30,
    issueManagement: base.issueManagement ?? Math.floor(Math.random() * 60) + 20,
    codeReview: base.codeReview ?? Math.floor(Math.random() * 60) + 25,
    documentation: base.documentation ?? Math.floor(Math.random() * 50) + 15,
    communityEngagement: base.communityEngagement ?? Math.floor(Math.random() * 50) + 20,
    projectManagement: base.projectManagement ?? Math.floor(Math.random() * 40) + 10
  };
}

function generateTimeline() {
  const events = [];
  const types = ['commit', 'issue', 'pr', 'review', 'comment'];
  const descriptions: Record<string, string> = {
    commit: '提交了代码',
    issue: '创建了 Issue',
    pr: '提交了 Pull Request',
    review: '进行了代码审查',
    comment: '发表了评论'
  };

  for (let i = 0; i < 15; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const daysAgo = Math.floor(Math.random() * 180);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    events.push({
      id: `event-${i}-${Date.now()}-${Math.random()}`,
      type,
      date: date.toISOString().split('T')[0],
      description: descriptions[type],
      isActive: Math.random() > 0.3
    });
  }

  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

const smallNames = [
  'alice', 'bob', 'charlie', 'david', 'eve', 'frank', 'grace', 'henry',
  'ivy', 'jack', 'kate', 'leo', 'mia', 'noah', 'olivia'
];

function createContributor(username: string, index: number): Contributor {
  const commits = Math.floor(500 - index * 30 + Math.random() * 20);
  const pullRequests = Math.floor(commits * 0.15) + 2;
  const prMerged = Math.floor(pullRequests * (0.6 + Math.random() * 0.35));

  return {
    username,
    avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${username}`,
    commits,
    linesAdded: Math.floor(commits * 80 + Math.random() * 2000),
    linesDeleted: Math.floor(commits * 35 + Math.random() * 800),
    issues: Math.floor(commits * 0.15 + Math.random() * 5),
    pullRequests,
    prMerged,
    prMergeRate: pullRequests > 0 ? prMerged / pullRequests : 0,
    skills: generateSkills(),
    timeline: generateTimeline()
  };
}

const smallRepoContributors: Contributor[] = smallNames.map((name, i) =>
  createContributor(name, i)
);

export const smallRepoData: RepoData = {
  name: 'awesome-project',
  owner: 'opensource-org',
  totalCommits: smallRepoContributors.reduce((sum, c) => sum + c.commits, 0),
  contributors: smallRepoContributors
};

const largeNames = [
  'alice', 'bob', 'charlie', 'david', 'eve', 'frank', 'grace', 'henry',
  'ivy', 'jack', 'kate', 'leo', 'mia', 'noah', 'olivia', 'peter',
  'queen', 'rose', 'sam', 'tina', 'uma', 'victor', 'wendy', 'xavier',
  'yara', 'zack', 'amy', 'brian', 'cindy', 'derek', 'emma', 'felix',
  'gina', 'harry', 'iris', 'jason', 'kelly', 'larry', 'monica', 'nathan',
  'olga', 'patrick', 'quinn', 'rachel', 'steve', 'tracy', 'ulysses', 'vicky',
  'walter', 'xenia', 'young', 'zoe', 'adam', 'beth', 'carl', 'diana',
  'edward', 'fiona', 'george', 'hannah', 'ian', 'julia', 'kevin', 'lily',
  'mike', 'nancy', 'oscar', 'penny', 'quincy', 'randy', 'susan', 'tom',
  'ursula', 'vince', 'wanda', 'xander', 'yvonne', 'zane', 'arthur', 'bella',
  'caleb', 'daisy', 'elliot', 'flora', 'gabriel', 'hope', 'isaac', 'jade',
  'kyle', 'lucy', 'matthew', 'nina', 'owen', 'phoebe', 'quentin', 'ruby',
  'seth', 'tanya', 'Uriah', 'vanessa', 'wayne', 'xena', 'yasmin', 'zed'
];

function generateLargeRepo(): RepoData {
  const contributors: Contributor[] = [];

  for (let i = 0; i < 120; i++) {
    const name = i < largeNames.length
      ? largeNames[i]
      : `contributor_${i + 1}`;
    contributors.push(createContributor(name, i));
  }

  contributors.sort((a, b) => b.commits - a.commits);

  return {
    name: 'large-repo',
    owner: 'big-org',
    totalCommits: contributors.reduce((sum, c) => sum + c.commits, 0),
    contributors
  };
}

export const largeRepoData: RepoData = generateLargeRepo();

export function getMockRepoData(owner: string, repo: string): RepoData {
  if (repo.includes('big') || repo.includes('large')) {
    return { ...largeRepoData, name: repo, owner };
  }
  return { ...smallRepoData, name: repo, owner };
}
