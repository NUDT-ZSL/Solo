import { HistoryEntry } from './types'

const sites = [
  { domain: 'github.com', name: 'GitHub', tags: ['开发', '代码', '开源'] },
  { domain: 'stackoverflow.com', name: 'Stack Overflow', tags: ['编程', '问答', '技术'] },
  { domain: 'developer.mozilla.org', name: 'MDN Web Docs', tags: ['文档', '前端', 'API'] },
  { domain: 'react.dev', name: 'React 官方文档', tags: ['React', '前端', '框架'] },
  { domain: 'vitejs.dev', name: 'Vite', tags: ['构建工具', '前端', '开发'] },
  { domain: 'typescriptlang.org', name: 'TypeScript', tags: ['TypeScript', '语言', '前端'] },
  { domain: 'baidu.com', name: '百度', tags: ['搜索', '引擎', '资讯'] },
  { domain: 'zhihu.com', name: '知乎', tags: ['问答', '知识', '社区'] },
  { domain: 'bilibili.com', name: '哔哩哔哩', tags: ['视频', '娱乐', '学习'] },
  { domain: 'weibo.com', name: '微博', tags: ['社交', '资讯', '热点'] },
  { domain: 'taobao.com', name: '淘宝', tags: ['购物', '电商', '商品'] },
  { domain: 'jd.com', name: '京东', tags: ['购物', '电商', '数码'] },
  { domain: 'douban.com', name: '豆瓣', tags: ['读书', '电影', '音乐'] },
  { domain: 'news.qq.com', name: '腾讯新闻', tags: ['新闻', '资讯', '热点'] },
  { domain: 'sina.com.cn', name: '新浪', tags: ['新闻', '体育', '财经'] },
  { domain: 'csdn.net', name: 'CSDN', tags: ['技术', '博客', '开发'] },
  { domain: 'juejin.cn', name: '掘金', tags: ['技术', '前端', '社区'] },
  { domain: 'segmentfault.com', name: '思否', tags: ['技术', '问答', '编程'] },
  { domain: 'medium.com', name: 'Medium', tags: ['博客', '技术', '文章'] },
  { domain: 'dev.to', name: 'DEV Community', tags: ['开发', '社区', '技术'] },
  { domain: 'figma.com', name: 'Figma', tags: ['设计', 'UI', '协作'] },
  { domain: 'dribbble.com', name: 'Dribbble', tags: ['设计', '灵感', 'UI'] },
  { domain: 'behance.net', name: 'Behance', tags: ['设计', '作品集', '创意'] },
  { domain: 'notion.so', name: 'Notion', tags: ['笔记', '效率', '工具'] },
  { domain: 'trello.com', name: 'Trello', tags: ['任务', '管理', '协作'] },
  { domain: 'slack.com', name: 'Slack', tags: ['沟通', '团队', '协作'] },
  { domain: 'discord.com', name: 'Discord', tags: ['聊天', '社区', '游戏'] },
  { domain: 'spotify.com', name: 'Spotify', tags: ['音乐', '流媒体', '娱乐'] },
  { domain: 'youtube.com', name: 'YouTube', tags: ['视频', '娱乐', '学习'] },
  { domain: 'netflix.com', name: 'Netflix', tags: ['影视', '流媒体', '娱乐'] },
  { domain: 'leetcode.com', name: 'LeetCode', tags: ['算法', '面试', '编程'] },
  { domain: 'hackerrank.com', name: 'HackerRank', tags: ['编程', '竞赛', '算法'] },
  { domain: 'codeforces.com', name: 'Codeforces', tags: ['竞赛', '算法', '编程'] },
  { domain: 'atcoder.jp', name: 'AtCoder', tags: ['竞赛', '算法', '编程'] },
  { domain: 'npmjs.com', name: 'npm', tags: ['包管理', 'Node.js', '前端'] },
  { domain: 'docker.com', name: 'Docker', tags: ['容器', '部署', '运维'] },
  { domain: 'kubernetes.io', name: 'Kubernetes', tags: ['容器', '编排', '云原生'] },
  { domain: 'aws.amazon.com', name: 'AWS', tags: ['云服务', '云计算', '基础设施'] },
  { domain: 'cloud.tencent.com', name: '腾讯云', tags: ['云服务', '云计算', '中国'] },
  { domain: 'aliyun.com', name: '阿里云', tags: ['云服务', '云计算', '中国'] }
]

const titleTemplates = [
  '首页 - {name}',
  '{name} - 发现有趣的内容',
  '关于我们 - {name}',
  '{name} 官方网站',
  '{name} - 探索更多',
  '帮助中心 - {name}',
  '{name} 社区',
  '{name} 最新动态',
  '{name} 产品介绍',
  '{name} - 开始你的旅程'
]

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}

export function generateMockData(count: number = 200): HistoryEntry[] {
  const entries: HistoryEntry[] = []
  const now = Date.now()
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000

  for (let i = 0; i < count; i++) {
    const site = pickRandom(sites)
    const timestamp = getRandomInt(thirtyDaysAgo, now)
    const title = pickRandom(titleTemplates).replace('{name}', site.name)
    const numTags = getRandomInt(1, 3)
    const entryTags: string[] = []
    const shuffledTags = [...site.tags].sort(() => Math.random() - 0.5)
    for (let j = 0; j < numTags && j < shuffledTags.length; j++) {
      entryTags.push(shuffledTags[j])
    }

    entries.push({
      id: generateId(),
      title,
      url: `https://${site.domain}/${Math.random().toString(36).substring(2, 8)}`,
      favicon: `https://www.google.com/s2/favicons?domain=${site.domain}&sz=64`,
      timestamp,
      visitCount: getRandomInt(1, 50),
      tags: entryTags
    })
  }

  return entries.sort((a, b) => b.timestamp - a.timestamp)
}

export const mockHistoryData = generateMockData(200)
