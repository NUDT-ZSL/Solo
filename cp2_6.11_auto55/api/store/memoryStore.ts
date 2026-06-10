import type { Game, Comment, Rating } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

const gamesMap = new Map<string, Game>();
const commentsMap = new Map<string, Comment[]>();

const createBase64Svg = (bgColor: string, textColor: string, title: string): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
    <rect width="400" height="300" fill="${bgColor}"/>
    <text x="200" y="140" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="${textColor}" text-anchor="middle" dominant-baseline="middle">${title}</text>
    <text x="200" y="180" font-family="Arial, sans-serif" font-size="14" fill="${textColor}" text-anchor="middle" opacity="0.8">BOARD GAME</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
};

const mockRatings: Record<string, Rating[]> = {
  game1: [
    { userId: 'user1', score: 5, createdAt: '2025-01-15T10:00:00Z' },
    { userId: 'user2', score: 4, createdAt: '2025-01-16T12:30:00Z' },
    { userId: 'user3', score: 5, createdAt: '2025-01-17T09:15:00Z' },
    { userId: 'user4', score: 4, createdAt: '2025-01-18T14:45:00Z' },
    { userId: 'user5', score: 5, createdAt: '2025-01-19T16:20:00Z' },
    { userId: 'user6', score: 3, createdAt: '2025-01-20T11:00:00Z' },
  ],
  game2: [
    { userId: 'user1', score: 4, createdAt: '2025-02-10T10:00:00Z' },
    { userId: 'user2', score: 5, createdAt: '2025-02-11T12:30:00Z' },
    { userId: 'user3', score: 4, createdAt: '2025-02-12T09:15:00Z' },
    { userId: 'user7', score: 5, createdAt: '2025-02-13T14:45:00Z' },
    { userId: 'user8', score: 4, createdAt: '2025-02-14T16:20:00Z' },
  ],
  game3: [
    { userId: 'user2', score: 5, createdAt: '2025-03-05T10:00:00Z' },
    { userId: 'user3', score: 5, createdAt: '2025-03-06T12:30:00Z' },
    { userId: 'user4', score: 4, createdAt: '2025-03-07T09:15:00Z' },
    { userId: 'user5', score: 5, createdAt: '2025-03-08T14:45:00Z' },
    { userId: 'user6', score: 4, createdAt: '2025-03-09T16:20:00Z' },
    { userId: 'user9', score: 5, createdAt: '2025-03-10T11:00:00Z' },
    { userId: 'user10', score: 5, createdAt: '2025-03-11T13:30:00Z' },
  ],
  game4: [
    { userId: 'user1', score: 3, createdAt: '2025-04-01T10:00:00Z' },
    { userId: 'user2', score: 4, createdAt: '2025-04-02T12:30:00Z' },
    { userId: 'user7', score: 3, createdAt: '2025-04-03T09:15:00Z' },
    { userId: 'user8', score: 4, createdAt: '2025-04-04T14:45:00Z' },
  ],
  game5: [
    { userId: 'user1', score: 4, createdAt: '2025-05-10T10:00:00Z' },
    { userId: 'user2', score: 4, createdAt: '2025-05-11T12:30:00Z' },
    { userId: 'user3', score: 5, createdAt: '2025-05-12T09:15:00Z' },
    { userId: 'user4', score: 4, createdAt: '2025-05-13T14:45:00Z' },
    { userId: 'user5', score: 5, createdAt: '2025-05-14T16:20:00Z' },
    { userId: 'user6', score: 4, createdAt: '2025-05-15T11:00:00Z' },
    { userId: 'user9', score: 5, createdAt: '2025-05-16T13:30:00Z' },
    { userId: 'user10', score: 4, createdAt: '2025-05-17T15:00:00Z' },
  ],
};

const calcAvg = (ratings: Rating[]): number => {
  if (ratings.length === 0) return 0;
  return Number((ratings.reduce((s, r) => s + r.score, 0) / ratings.length).toFixed(1));
};

const mockGames: Game[] = [
  {
    id: 'game1',
    name: '星际征途',
    designer: '李明宇',
    coverImage: createBase64Svg('#1e3a5f', '#60a5fa', '星际征途'),
    summary: '一款史诗级太空策略游戏，玩家将扮演星际文明的领导者，探索未知星系，建立帝国。',
    fullRules: `# 星际征途 - 完整规则书\n\n## 游戏简介\n\n《星际征途》是一款支持2-4人的史诗级太空策略桌游。游戏时长约90-120分钟。玩家将扮演不同星际文明的领导者，通过探索、殖民、科研和外交来扩展自己的势力范围。\n\n## 配件清单\n\n- 1张星系地图板\n- 4套文明标志物（每套含母舰1艘、巡洋舰3艘、战斗机6架、殖民船2艘）\n- 资源卡牌60张（能源、矿石、科技点）\n- 事件卡牌30张\n- 科技树图板1张\n- 骰子6颗\n- 玩家帮助卡4张\n\n## 游戏流程\n\n### 回合结构\n\n每回合分为5个阶段：\n\n1. **资源收集阶段**：根据已占领的星球收集资源\n2. **行动阶段**：玩家轮流执行2个行动（移动、建造、研究、攻击）\n3. **事件阶段**：翻开事件卡并结算\n4. **维护阶段**：支付舰队维护费用\n5. **计分阶段**：检查胜利条件\n\n### 行动详解\n\n- **移动**：消耗能源移动舰队\n- **建造**：消耗矿石建造新单位\n- **研究**：消耗科技点解锁新科技\n- **攻击**：与敌方舰队进行战斗\n\n## 胜利条件\n\n满足以下任一条件即可获胜：\n\n1. 控制星系中心的「创世星」并保持3回合\n2. 科技树全部研究完成\n3. 消灭所有其他玩家的母舰\n4. 游戏结束时（第15回合）积分最高\n\n## 策略提示\n\n- 前期优先扩张，占领高产出星球\n- 科技研究选择「推进器升级」可以大幅提升机动性\n- 不要过早暴露军事意图，外交同样重要\n- 保留足够的能源储备以应对突发事件`,
    tags: ['策略', '竞争', '随机'],
    ratings: mockRatings.game1,
    averageRating: calcAvg(mockRatings.game1),
    ratingsCount: mockRatings.game1.length,
    likedBy: ['user1', 'user2', 'user3', 'user4', 'user5', 'user8', 'user9'],
    likeCount: 7,
    commentsCount: 4,
    heat: 0,
    createdAt: '2025-01-10T08:00:00Z',
    updatedAt: '2025-01-20T11:00:00Z',
  },
  {
    id: 'game2',
    name: '迷雾古堡',
    designer: '张晓峰',
    coverImage: createBase64Svg('#2d1b4e', '#a78bfa', '迷雾古堡'),
    summary: '充满悬疑的合作推理游戏，玩家们需要在古堡中寻找线索，揭开幽灵的秘密。',
    fullRules: `# 迷雾古堡 - 完整规则书\n\n## 游戏简介\n\n《迷雾古堡》是一款支持3-6人的合作推理桌游。游戏时长约60-90分钟。深夜的迷雾古堡中发生了一起离奇事件，玩家们扮演侦探团成员，需要在黎明前找出真相。\n\n## 配件清单\n\n- 古堡平面图板（共12个房间）\n- 角色卡6张（各自拥有特殊能力）\n- 线索卡40张\n- 幽灵卡15张\n- 时间指示物1个\n- 迷雾标记30个\n- 手电筒标记6个\n\n## 游戏流程\n\n### 游戏准备\n\n1. 每位玩家选择一张角色卡\n2. 随机放置线索卡到各个房间\n3. 幽灵卡洗混后抽出一张作为「真凶」（只有幽灵知道）\n4. 设置时间指示物为22:00\n\n### 回合结构\n\n每位玩家的回合包含3个行动点：\n\n1. **移动**（1点）：移动到相邻房间\n2. **搜索**（1点）：翻开所在房间的线索卡\n3. **讨论**（1点）：与其他玩家分享信息\n4. **驱散迷雾**（2点）：消除一个房间的迷雾标记\n\n### 特殊机制\n\n- **幽灵玩家**：其中一名玩家秘密扮演幽灵，需要误导其他人\n- **时间压力**：每次翻牌时间推进15分钟，6:00游戏结束\n- **手电筒**：可以驱散迷雾，但每局游戏使用次数有限\n\n## 胜利条件\n\n**侦探胜利**：在6:00前正确指认真凶\n**幽灵胜利**：6:00时未被发现，或成功栽赃其他玩家\n\n## 策略提示\n\n- 侦探们要注意观察谁在隐瞒信息\n- 幽灵要巧妙地引导调查方向\n- 不要急于下结论，收集足够证据再投票\n- 合理使用手电筒，关键时刻可以逆转局势`,
    tags: ['推理', '合作', '派对'],
    ratings: mockRatings.game2,
    averageRating: calcAvg(mockRatings.game2),
    ratingsCount: mockRatings.game2.length,
    likedBy: ['user1', 'user3', 'user6', 'user7', 'user8', 'user10'],
    likeCount: 6,
    commentsCount: 5,
    heat: 0,
    createdAt: '2025-02-05T08:00:00Z',
    updatedAt: '2025-02-14T16:20:00Z',
  },
  {
    id: 'game3',
    name: '商路争霸',
    designer: '王思远',
    coverImage: createBase64Svg('#4a2c0a', '#fbbf24', '商路争霸'),
    summary: '经济策略游戏，玩家在古老丝绸之路上建立贸易网络，与竞争对手争夺市场。',
    fullRules: `# 商路争霸 - 完整规则书\n\n## 游戏简介\n\n《商路争霸》是一款支持2-5人的经济策略桌游。游戏时长约75-100分钟。玩家扮演古代丝绸之路的商队首领，通过贸易、投资和谈判积累财富。\n\n## 配件清单\n\n- 丝绸之路地图板（含20座城市）\n- 商队棋子5套（每套含大篷车3辆、骆驼6只）\n- 货物卡牌100张（丝绸、香料、瓷器、茶叶、宝石）\n- 金币代币（不同面额）\n- 城市契约卡20张\n- 事件卡25张\n\n## 游戏流程\n\n### 回合结构\n\n每回合分为4个阶段：\n\n1. **市场波动阶段**：翻开市场卡调整货物价格\n2. **行动阶段**：玩家按顺序执行3个行动\n   - 购买货物\n   - 出售货物\n   - 移动商队\n   - 签订契约\n3. **事件阶段**：处理事件卡效果\n4. **结算阶段**：支付商队维护费\n\n### 行动详解\n\n- **购买**：在当前城市以市场价购入货物\n- **出售**：在当前城市以市场价卖出货物\n- **移动**：沿着商路移动到下一个城市（耗水）\n- **契约**：与城市签订长期供货合同，获得稳定收益\n\n### 特殊规则\n\n- **商路风险**：部分路段有概率遭遇强盗，损失货物\n- **天气系统**：某些回合可能因暴风雪延误行程\n- **市场垄断**：某城市某货物库存超过80%可操纵价格\n\n## 胜利条件\n\n游戏进行12回合后，资产（现金+货物+契约价值）最多的玩家获胜。\n\n## 策略提示\n\n- 低价买入高价卖出是基本准则\n- 与其他玩家建立贸易同盟可以降低风险\n- 投资契约获得被动收入\n- 控制关键城市的货物供给可以影响市场`,
    tags: ['策略', '竞争', '随机'],
    ratings: mockRatings.game3,
    averageRating: calcAvg(mockRatings.game3),
    ratingsCount: mockRatings.game3.length,
    likedBy: ['user2', 'user3', 'user4', 'user5', 'user6', 'user7', 'user9', 'user10'],
    likeCount: 8,
    commentsCount: 5,
    heat: 0,
    createdAt: '2025-03-01T08:00:00Z',
    updatedAt: '2025-03-11T13:30:00Z',
  },
  {
    id: 'game4',
    name: '记忆碎片',
    designer: '林雨晴',
    coverImage: createBase64Svg('#064e3b', '#34d399', '记忆碎片'),
    summary: '温馨治愈的记忆翻牌游戏，适合亲子和情侣，收集散落在时光中的美好回忆。',
    fullRules: `# 记忆碎片 - 完整规则书\n\n## 游戏简介\n\n《记忆碎片》是一款支持1-4人的记忆翻牌桌游。游戏时长约20-40分钟。玩家需要翻开卡牌寻找配对的记忆碎片，重温那些美好的时光。\n\n## 配件清单\n\n- 记忆卡牌72张（36对不同图案）\n- 时光沙漏计时器1个\n- 积分标记4套\n- 特殊能力卡8张\n- 回忆场景板6张\n\n## 游戏流程\n\n### 基本玩法（经典模式）\n\n1. 将所有卡牌背面朝上，均匀铺开\n2. 玩家轮流翻开两张卡牌\n3. 如果两张卡牌图案相同，则收入囊中，得1分，并可再翻一次\n4. 如果不匹配，则翻回原位，下一位玩家继续\n5. 所有卡牌配对完成后，积分最高者获胜\n\n### 进阶模式（时光挑战）\n\n增加以下机制：\n\n- **时光沙漏**：每次翻牌有30秒时间限制\n- **特殊能力**：可以使用能力卡获得额外翻牌机会、偷看等\n- **场景任务**：完成特定场景的配对获得额外奖励\n\n### 合作模式\n\n所有玩家共同努力，在限定时间内完成所有配对。适合亲子互动。\n\n## 胜利条件\n\n- **经典/进阶模式**：积分最高的玩家获胜\n- **合作模式**：在时间耗尽前完成所有配对即获胜\n\n## 策略提示\n\n- 注意力集中，记住每张牌的位置\n- 不要急于翻牌，先观察整体布局\n- 使用能力卡要选对时机\n- 合作模式下，与队友沟通记忆的位置`,
    tags: ['派对', '随机'],
    ratings: mockRatings.game4,
    averageRating: calcAvg(mockRatings.game4),
    ratingsCount: mockRatings.game4.length,
    likedBy: ['user1', 'user2', 'user7', 'user8', 'user10'],
    likeCount: 5,
    commentsCount: 3,
    heat: 0,
    createdAt: '2025-03-28T08:00:00Z',
    updatedAt: '2025-04-04T14:45:00Z',
  },
  {
    id: 'game5',
    name: '花园派对',
    designer: '陈婉清',
    coverImage: createBase64Svg('#831843', '#f472b6', '花园派对'),
    summary: '轻松欢乐的派对游戏，玩家布置自己的梦幻花园，邀请客人，争夺最美花园称号。',
    fullRules: `# 花园派对 - 完整规则书\n\n## 游戏简介\n\n《花园派对》是一款支持2-6人的轻松欢乐派对桌游。游戏时长约30-45分钟。玩家需要种植花卉、布置装饰、邀请客人来打造最美的梦幻花园。\n\n## 配件清单\n\n- 花园底板6张（含4x4网格）\n- 花卉卡牌60张（玫瑰、郁金香、向日葵、薰衣草、樱花）\n- 装饰卡30张（喷泉、长椅、雕像、灯笼、栅栏）\n- 客人卡24张（每位客人有不同喜好）\n- 阳光/雨水资源标记\n- 评分卡6张\n\n## 游戏流程\n\n### 回合结构\n\n每回合分为3个阶段：\n\n1. **资源阶段**：掷骰子获得阳光和雨水\n2. **种植阶段**：消耗资源种植花卉或放置装饰\n3. **邀请阶段**：根据花园状况邀请客人\n\n### 种植机制\n\n每种花卉需要不同资源：\n- 玫瑰：2阳光 + 1雨水\n- 郁金香：1阳光 + 2雨水\n- 向日葵：3阳光\n- 薰衣草：2阳光 + 2雨水\n- 樱花：1阳光 + 1雨水\n\n### 客人系统\n\n每位客人有不同的喜好，满足条件即可邀请：\n- 花艺师：至少3种不同花卉\n- 摄影师：有喷泉和至少2朵樱花\n- 诗人：有长椅和薰衣草\n- 小朋友：向日葵 + 郁金香组合\n\n## 胜利条件\n\n游戏进行8回合后计算总分：\n- 每种花卉：根据数量递增得分\n- 装饰：每个装饰5分\n- 客人：每位客人根据满意度给分（10-30分）\n- 组合奖励：特定花卉组合额外加分\n\n总分最高者获得「最美花园」称号！\n\n## 策略提示\n\n- 均衡分配阳光和雨水资源\n- 优先种植高分组合的花卉\n- 装饰不仅加分，还能吸引客人\n- 观察其他玩家的花园，错开竞争的花卉类型`,
    tags: ['派对', '策略', '随机'],
    ratings: mockRatings.game5,
    averageRating: calcAvg(mockRatings.game5),
    ratingsCount: mockRatings.game5.length,
    likedBy: ['user1', 'user2', 'user3', 'user4', 'user5', 'user6', 'user8', 'user9', 'user10'],
    likeCount: 9,
    commentsCount: 4,
    heat: 0,
    createdAt: '2025-05-05T08:00:00Z',
    updatedAt: '2025-05-17T15:00:00Z',
  },
];

const mockComments: Comment[] = [
  { id: 'c1', gameId: 'game1', userId: 'user2', userName: '太空迷小张', avatar: '🧑‍🚀', content: '太好玩了！科技树设计得非常有深度，每次玩都能尝试不同的策略路线。强烈推荐！', createdAt: '2025-01-16T14:00:00Z' },
  { id: 'c2', gameId: 'game1', userId: 'user4', userName: '策略王', avatar: '🎯', content: '地图平衡性不错，但是前期能源有点紧张，建议新手优先选扩张型文明。', createdAt: '2025-01-18T16:00:00Z' },
  { id: 'c3', gameId: 'game1', userId: 'user5', userName: '桌游老饕', avatar: '🎲', content: '玩了一下午，和朋友开黑超爽！最后用科技流翻盘，成就感爆棚。', createdAt: '2025-01-19T18:30:00Z' },
  { id: 'c4', gameId: 'game1', userId: 'user6', userName: '新手玩家', avatar: '🌟', content: '规则有点复杂，看了半小时说明书才上手，但学会后真的停不下来。', createdAt: '2025-01-20T12:00:00Z' },
  { id: 'c5', gameId: 'game2', userId: 'user1', userName: '侦探迷', avatar: '🔍', content: '内奸机制太刺激了！上次当幽灵成功栽赃了队友，全场懵了哈哈。', createdAt: '2025-02-10T15:00:00Z' },
  { id: 'c6', gameId: 'game2', userId: 'user3', userName: '脑洞少女', avatar: '💡', content: '氛围营造得很好，配上BGM真的有在古堡探险的感觉。线索设计也很巧妙。', createdAt: '2025-02-12T11:00:00Z' },
  { id: 'c7', gameId: 'game2', userId: 'user7', userName: '逻辑怪', avatar: '🧠', content: '推理部分做得不错，但建议增加更多角色技能，现在有些角色能力偏弱。', createdAt: '2025-02-13T16:30:00Z' },
  { id: 'c8', gameId: 'game2', userId: 'user8', userName: '胆小鬼', avatar: '👻', content: '作为一个胆子很小的人，居然也玩得很开心！不是真的恐怖，是悬疑的那种～', createdAt: '2025-02-14T19:00:00Z' },
  { id: 'c9', gameId: 'game2', userId: 'user10', userName: '派对组织者', avatar: '🎉', content: '已经成为我家聚会的常驻游戏了，6人局最热闹！', createdAt: '2025-02-15T20:00:00Z' },
  { id: 'c10', gameId: 'game3', userId: 'user2', userName: '商人阿杰', avatar: '💰', content: '经济系统设计得很真实，市场波动让人又爱又恨。垄断香料后一夜暴富的感觉太爽了！', createdAt: '2025-03-05T14:00:00Z' },
  { id: 'c11', gameId: 'game3', userId: 'user3', userName: '丝路行者', avatar: '🐪', content: '丝绸之路的题材超赞，一边玩一边还能学到历史知识。强盗机制让人紧张刺激。', createdAt: '2025-03-06T12:00:00Z' },
  { id: 'c12', gameId: 'game3', userId: 'user5', userName: '精算师', avatar: '📊', content: '契约系统是亮点，长期投资的收益真的很高。建议前期攒钱签两三个好契约。', createdAt: '2025-03-08T10:00:00Z' },
  { id: 'c13', gameId: 'game3', userId: 'user6', userName: '新手小白', avatar: '🌱', content: '第一次玩被坑惨了，第二次才明白低买高卖的精髓。非常耐玩！', createdAt: '2025-03-09T17:00:00Z' },
  { id: 'c14', gameId: 'game3', userId: 'user10', userName: '赌神附体', avatar: '🎰', content: '走强盗路线那次差点翻车，结果最后一个回合大逆转。刺激！', createdAt: '2025-03-11T14:30:00Z' },
  { id: 'c15', gameId: 'game4', userId: 'user1', userName: '宝妈小李', avatar: '👩‍👧', content: '和女儿一起玩的，她超喜欢！图案很可爱，还能锻炼记忆力。合作模式很友好。', createdAt: '2025-04-01T15:00:00Z' },
  { id: 'c16', gameId: 'game4', userId: 'user2', userName: '约会达人', avatar: '💕', content: '情侣约会必玩！输的人请吃饭，增加感情的好游戏（笑）', createdAt: '2025-04-02T18:00:00Z' },
  { id: 'c17', gameId: 'game4', userId: 'user8', userName: '记忆大师', avatar: '🧩', content: '作为记忆力爱好者，表示进阶模式的时光挑战真的很有挑战性！', createdAt: '2025-04-04T11:00:00Z' },
  { id: 'c18', gameId: 'game5', userId: 'user1', userName: '花仙子', avatar: '🌸', content: '画风太治愈了！每种花都好漂亮，客人系统也很有趣，邀请到特殊客人超有成就感。', createdAt: '2025-05-10T14:00:00Z' },
  { id: 'c19', gameId: 'game5', userId: 'user3', userName: '园艺爱好者', avatar: '🌻', content: '作为一个喜欢养花的人，这个游戏简直戳中我！玫瑰加薰衣草的组合太美了。', createdAt: '2025-05-12T10:30:00Z' },
  { id: 'c20', gameId: 'game5', userId: 'user4', userName: '派对女王', avatar: '👑', content: '轻松愉快不烧脑，周末和闺蜜一边喝下午茶一边玩超惬意！', createdAt: '2025-05-13T16:00:00Z' },
  { id: 'c21', gameId: 'game5', userId: 'user6', userName: '选择困难症', avatar: '🤔', content: '每次都纠结种什么花好，每种都想种！资源分配让人头秃但很快乐。', createdAt: '2025-05-15T13:00:00Z' },
];

const initStore = (): void => {
  mockGames.forEach((game) => {
    game.heat = game.likeCount * 2 + game.commentsCount * 3 + game.ratingsCount * 1;
    gamesMap.set(game.id, game);
  });

  mockComments.forEach((comment) => {
    const list = commentsMap.get(comment.gameId) || [];
    list.push(comment);
    commentsMap.set(comment.gameId, list);
  });
};

initStore();

export const getGames = (): Game[] => {
  return Array.from(gamesMap.values());
};

export const getGameById = (id: string): Game | undefined => {
  return gamesMap.get(id);
};

export const updateGame = (id: string, game: Game): Game | undefined => {
  game.updatedAt = new Date().toISOString();
  gamesMap.set(id, game);
  return game;
};

export const getComments = (gameId: string): Comment[] => {
  return commentsMap.get(gameId) || [];
};

export const addComment = (gameId: string, data: Omit<Comment, 'id' | 'gameId' | 'createdAt'>): Comment => {
  const comment: Comment = {
    id: uuidv4(),
    gameId,
    ...data,
    createdAt: new Date().toISOString(),
  };
  const list = commentsMap.get(gameId) || [];
  list.push(comment);
  commentsMap.set(gameId, list);

  const game = gamesMap.get(gameId);
  if (game) {
    game.commentsCount = list.length;
    game.heat = game.likeCount * 2 + game.commentsCount * 3 + game.ratingsCount * 1;
    game.updatedAt = new Date().toISOString();
  }

  return comment;
};

export default {
  getGames,
  getGameById,
  updateGame,
  getComments,
  addComment,
};
