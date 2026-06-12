import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import type {
  Project,
  User,
  Chapter,
  Character,
  Annotation,
  ConflictItem,
  SentenceSentiment,
  CharacterGraphData,
} from '../../frontend/src/types';

const app = express();
app.use(cors());
app.use(bodyParser.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

const DEMO_CHAPTERS: Chapter[] = [
  {
    id: 'ch1',
    title: '第一章 · 暮色归来',
    description: '林川在雨夜回到阔别十年的故乡，在老咖啡馆遇到了旧友苏雨，两人之间弥漫着未说出口的往事。',
    content: `雨丝像银色的针，斜斜地扎进青石街道。林川站在咖啡馆的玻璃门外，指尖微微发颤。十年了，这座小镇几乎没什么变化——还是那盏歪歪扭扭的霓虹灯，还是那扇吱吱作响的木门。

"你回来了。"

苏雨的声音从身后传来，平静得像一潭深水。林川转过身，看见她站在雨幕里，黑色的风衣下摆被风掀起一角。她的眼神比十年前更沉静，但眼底那点倔强的光芒，一点也没变。

"我以为你不会再见我。"林川的声音有些沙哑。

苏雨笑了笑，那笑容里藏着太多说不清的东西："有些人，躲是躲不掉的。你想找的东西，或许从来就不在远方。"

林川握紧了行李箱的把手。他这次回来，是为了寻找父亲留下的那本旧日记。但他隐约觉得，自己真正要面对的，远不止一本日记那么简单。

咖啡馆里的老式留声机开始转动，传出一段模糊的爵士乐。雨夜、旧友、未完成的故事——一切仿佛又回到了十年前的那个夏天。`,
    characterTags: ['林川', '苏雨'],
    order: 0,
    expanded: true,
  },
  {
    id: 'ch2',
    title: '第二章 · 阁楼的秘密',
    description: '林川在老宅阁楼翻找日记时，意外发现了一封署名陈默的威胁信，揭露了父辈之间不为人知的纠葛。',
    content: `老宅的木楼梯在脚下吱呀作响，仿佛随时会塌陷。林川推开阁楼的门，灰尘在午后的阳光里跳着舞。

父亲的旧物都堆在这里——泛黄的书籍、磨损的怀表、还有那本他找了很久的皮面日记。

然而，比日记更让他震惊的，是压在玻璃镜框后面的那封信。

"如果你继续追查十年前的事，下一个消失的就是你。——陈默"

陈默。这个名字像一根冰锥扎进林川的心脏。他父亲十年前离奇失踪，所有人都说他是自己走的。但这封信说明——有人在害怕真相。

林川攥紧了信纸，指节泛白。就在这时，楼下传来门铃声。

是苏雨。她站在门口，手里举着一份旧报纸："我找到了一些东西，关于你父亲……还有陈默。"

报纸上的头条已经褪色，但标题依然触目惊心："城南仓库大火——富商陈守业葬身火海，其子陈默失踪。"

"陈默没有死。"苏雨的声音很轻，"他一直在这个镇上。而且，他和你父亲的失踪，绝对有关系。"`,
    characterTags: ['林川', '苏雨', '陈默'],
    order: 1,
    expanded: false,
  },
  {
    id: 'ch3',
    title: '第三章 · 河面上的灯',
    description: '林川和苏雨在河边遭遇神秘人跟踪，冲突中林川受伤，两人之间的情感开始重新浮出水面。',
    content: `夜色像墨汁一样化开在河面上。林川和苏雨沿着旧码头慢慢走着，远处有几点渔火明明灭灭。

"有人在跟着我们。"苏雨忽然压低声音。

林川没有回头。他从眼角的余光里看见，十几米外的树影里，有一个黑色的身影始终保持着同样的距离。

"走。"林川抓住苏雨的手腕，快步拐进一条小巷。

但是太晚了。那人已经堵住了巷口。逆光中，林川看不清他的脸，只能看见他手里握着的东西——一把闪着寒光的短刀。

"把日记交出来。"那人的声音沙哑，像是故意压低的。

林川把苏雨挡在身后："你是谁？陈默派来的？"

那人没有回答，直接扑了上来。混乱中，刀刃划破了林川的左臂。苏雨尖叫着抄起墙边的木棍，狠狠砸向那人的后背。

那人闷哼一声，转身消失在黑暗里。

"你流血了！"苏雨扶住林川，声音里带着哭腔。

"没事……小伤。"林川看着她慌乱的样子，忽然笑了，"你还是和以前一样，凶起来像只小野猫。"

苏雨的眼圈红了，但还是嘴硬："都什么时候了，你还有心情开玩笑。"

她扶着他慢慢往回走。河面上的灯一盏盏亮起来，映在水里，像一条流动的星河。有些东西，就像这些灯火——隔着十年的距离，依然温柔。`,
    characterTags: ['林川', '苏雨', '陈默'],
    order: 2,
    expanded: false,
  },
];

const DEMO_CHARACTERS: Character[] = [
  {
    id: 'char1',
    name: '林川',
    bio: '离家十年的归乡者，性格内敛坚韧，为寻找父亲失踪的真相而回到小镇。',
    tags: ['沉稳', '执着', '外冷内热'],
  },
  {
    id: 'char2',
    name: '苏雨',
    bio: '林川的旧友，经营着镇上唯一的咖啡馆，聪慧果敢，藏着不为人知的秘密。',
    tags: ['聪慧', '勇敢', '嘴硬心软'],
  },
  {
    id: 'char3',
    name: '陈默',
    bio: '十年前大火中消失的神秘人物，似乎与林川父亲的失踪有千丝万缕的联系。',
    tags: ['神秘', '危险', '隐忍'],
  },
];

const projects: Map<string, Project> = new Map();

const demoProject: Project = {
  id: 'demo-project',
  title: '《河上灯火》 · 悬疑小说',
  type: 'novel',
  chapters: DEMO_CHAPTERS,
  characters: DEMO_CHARACTERS,
  annotations: [],
  users: [],
};

projects.set('demo-project', demoProject);

const projectSockets: Map<string, Set<string>> = new Map();
const socketUserMap: Map<string, { id: string; name: string; color: string; projectId: string }> = new Map();

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('join-project', ({ projectId, userId, userName, color }: { projectId: string; userId: string; userName: string; color: string }) => {
    socket.join(projectId);
    socketUserMap.set(socket.id, { id: userId, name: userName, color, projectId });

    if (!projectSockets.has(projectId)) {
      projectSockets.set(projectId, new Set());
    }
    projectSockets.get(projectId)!.add(userId);

    const project = projects.get(projectId);
    if (project) {
      const existingIdx = project.users.findIndex((u) => u.id === userId);
      if (existingIdx === -1) {
        project.users.push({ id: userId, name: userName, color });
      } else {
        project.users[existingIdx] = { id: userId, name: userName, color };
      }
    }

    socket.to(projectId).emit('user-joined', { id: userId, name: userName, color });
    socket.emit('project-state', projects.get(projectId));
  });

  socket.on('edit', ({ projectId, chapterId, content }: { projectId: string; chapterId: string; content: string }) => {
    const user = socketUserMap.get(socket.id);
    if (!user) return;
    const project = projects.get(projectId);
    if (!project) return;
    const chapter = project.chapters.find((c) => c.id === chapterId);
    if (chapter) {
      chapter.content = content;
    }
    socket.to(projectId).emit('edit-broadcast', { userId: user.id, chapterId, content });
  });

  socket.on('cursor-move', ({ projectId, chapterId, cursor }: { projectId: string; chapterId: string; cursor: any }) => {
    const user = socketUserMap.get(socket.id);
    if (!user) return;
    socket.to(projectId).emit('cursor-broadcast', { userId: user.id, chapterId, cursor });
  });

  socket.on('leave-project', ({ projectId, userId }: { projectId: string; userId: string }) => {
    const project = projects.get(projectId);
    if (project) {
      project.users = project.users.filter((u) => u.id !== userId);
    }
    projectSockets.get(projectId)?.delete(userId);
    socket.to(projectId).emit('user-left', { userId });
  });

  socket.on('disconnect', () => {
    const user = socketUserMap.get(socket.id);
    if (user) {
      const project = projects.get(user.projectId);
      if (project) {
        project.users = project.users.filter((u) => u.id !== user.id);
      }
      projectSockets.get(user.projectId)?.delete(user.id);
      socket.to(user.projectId).emit('user-left', { userId: user.id });
      socketUserMap.delete(socket.id);
    }
    console.log('Socket disconnected:', socket.id);
  });
});

app.get('/api/projects/:id', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  res.json(project);
});

app.post('/api/projects/:id/characters', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  const character: Character = { ...req.body, id: uuidv4() };
  project.characters.push(character);
  io.to(req.params.id).emit('project-state', project);
  res.json(character);
});

app.post('/api/projects/:id/annotations', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  const annotation: Annotation = { ...req.body, id: uuidv4() };
  project.annotations.push(annotation);
  io.to(req.params.id).emit('project-state', project);
  res.json(annotation);
});

const POSITIVE_STRONG = [
  '爱', '深爱', '热爱', '狂喜', '幸福', '完美', '精彩', '伟大', '太棒了', '最美',
  '欣慰', '感激', '荣耀', '胜利', '成功', '壮丽', '璀璨', '辉煌', '陶醉', '狂欢',
  '珍惜', '敬仰', '崇拜', '自豪', '骄傲', '恩赐', '天赐', '奇迹', '无比', '极度',
];
const POSITIVE_MEDIUM = [
  '喜欢', '开心', '快乐', '高兴', '愉快', '温柔', '温暖', '美好', '希望', '勇敢',
  '光明', '善良', '真诚', '信任', '安心', '欣慰', '满足', '欣慰', '感动', '心动',
  '倾心', '思念', '牵挂', '守护', '陪伴', '眷恋', '期待', '向往', '坚定', '执着',
  '明亮', '柔和', '灿烂', '清澈', '纯真', '天真', '善良', '慈祥', '宽容', '豁达',
];
const POSITIVE_WEAK = [
  '笑', '微笑', '不错', '挺好', '还行', '舒服', '轻松', '平静', '安宁', '和谐',
  '灯', '星', '暖', '安静', '温和', '细腻', '淡然', '从容', '宁静', '悠闲',
  '熟悉', '亲切', '自然', '随意', '寻常', '平淡', '安稳', '踏实', '朴素', '简单',
];

const NEGATIVE_STRONG = [
  '恨', '痛恨', '仇恨', '痛苦', '绝望', '死亡', '杀戮', '毁灭', '恐怖', '噩梦',
  '残忍', '恶毒', '暴怒', '崩溃', '心碎', '撕裂', '焚烧', '吞噬', '诅咒', '折磨',
  '窒息', '绞杀', '血腥', '惨烈', '惨绝', '灭绝', '褫夺', '凌迟', '丧尽', '万劫',
];
const NEGATIVE_MEDIUM = [
  '悲伤', '难过', '愤怒', '害怕', '恐惧', '危险', '伤害', '疼痛', '哭泣', '流泪',
  '黑暗', '冰冷', '威胁', '孤独', '寂寞', '失落', '迷茫', '彷徨', '无助', '无奈',
  '惆怅', '哀伤', '忧伤', '凄凉', '苍凉', '荒凉', '萧瑟', '沉寂', '压抑', '窒息',
  '惨白', '阴暗', '阴沉', '凝重', '沉重', '紧张', '威胁', '警告', '胁迫', '逼迫',
];
const NEGATIVE_WEAK = [
  '痛', '冷', '黑', '忧愁', '烦恼', '焦虑', '担心', '不安', '紧张', '疲惫',
  '伤', '血', '沙哑', '皱眉', '叹息', '沉默', '迟疑', '犹豫', '恍惚', '困倦',
  '酸涩', '苦涩', '寡淡', '黯淡', '模糊', '褪色', '斑驳', '残破', '破碎', '支离',
];

const NEGATION_WORDS = ['不', '没', '没有', '无', '非', '否', '别', '莫', '勿', '未', '毫不', '绝不', '从不', '决不', '难以', '无法', '不能', '不会'];

const INTENSIFIERS: Record<string, number> = {
  '很': 1.4, '非常': 1.6, '极其': 1.8, '特别': 1.5, '格外': 1.5,
  '十分': 1.5, '相当': 1.3, '无比': 1.7, '极度': 1.8, '万分': 1.7,
  '太': 1.5, '真': 1.3, '好': 1.2, '最': 1.6, '更': 1.3,
  '越': 1.3, '甚': 1.4, '颇为': 1.4, '着实': 1.4, '深深': 1.5,
};

const RHETORICAL_PATTERNS = [
  /难道.{1,8}吗/, /岂.{1,6}能/, /怎.{1,6}能/, /何.{1,6}曾/,
  /岂不是/, /怎么会/, /怎能/, /焉能/, /莫非/, /不是.{0,4}吗/,
];

function isRhetoricalQuestion(sentence: string): boolean {
  return RHETORICAL_PATTERNS.some(p => p.test(sentence));
}

function countNegationsBefore(text: string, position: number): number {
  let count = 0;
  for (const neg of NEGATION_WORDS) {
    let idx = text.lastIndexOf(neg, position - 1);
    while (idx !== -1 && position - idx <= neg.length + 10) {
      count++;
      if (idx === 0) break;
      idx = text.lastIndexOf(neg, idx - 1);
    }
  }
  return count;
}

function findIntensifierBefore(text: string, position: number): number {
  let maxMult = 1.0;
  for (const [word, mult] of Object.entries(INTENSIFIERS)) {
    const idx = text.lastIndexOf(word, position - 1);
    if (idx !== -1 && position - idx <= word.length + 4) {
      maxMult = Math.max(maxMult, mult);
    }
  }
  return maxMult;
}

function calcSentiment(text: string): number {
  const isRhet = isRhetoricalQuestion(text);

  let total = 0;
  let wordCount = 0;

  const allPositive: { word: string; score: number }[] = [
    ...POSITIVE_STRONG.map((w) => ({ word: w, score: 0.7 })),
    ...POSITIVE_MEDIUM.map((w) => ({ word: w, score: 0.4 })),
    ...POSITIVE_WEAK.map((w) => ({ word: w, score: 0.2 })),
  ];
  const allNegative: { word: string; score: number }[] = [
    ...NEGATIVE_STRONG.map((w) => ({ word: w, score: -0.7 })),
    ...NEGATIVE_MEDIUM.map((w) => ({ word: w, score: -0.4 })),
    ...NEGATIVE_WEAK.map((w) => ({ word: w, score: -0.2 })),
  ];

  const found: { pos: number; score: number; len: number }[] = [];

  allPositive.forEach(({ word, score }) => {
    let idx = text.indexOf(word);
    while (idx !== -1) {
      found.push({ pos: idx, score, len: word.length });
      idx = text.indexOf(word, idx + 1);
    }
  });

  allNegative.forEach(({ word, score }) => {
    let idx = text.indexOf(word);
    while (idx !== -1) {
      found.push({ pos: idx, score, len: word.length });
      idx = text.indexOf(word, idx + 1);
    }
  });

  found.sort((a, b) => a.pos - b.pos);

  const used = new Set<number>();
  found.forEach((item) => {
    if (used.has(item.pos)) return;
    let overlaps = false;
    for (let i = item.pos; i < item.pos + item.len; i++) {
      if (used.has(i)) { overlaps = true; break; }
    }
    if (overlaps) return;
    for (let i = item.pos; i < item.pos + item.len; i++) {
      used.add(i);
    }

    let score = item.score;

    const negCount = countNegationsBefore(text, item.pos);
    if (negCount > 0) {
      if (negCount % 2 === 1) {
        score = -score;
      }
    }

    const intensMult = findIntensifierBefore(text, item.pos);
    score *= intensMult;

    if (isRhet && score > 0) {
      score *= -0.6;
    }

    total += score;
    wordCount++;
  });

  if (wordCount === 0) return 0;

  const avg = total / Math.sqrt(wordCount);
  return Math.max(-1, Math.min(1, avg));
}

app.post('/api/analysis/sentiment', (req, res) => {
  const { content } = req.body as { content: string };
  if (!content) return res.json({ sentences: [] });

  const rawSentences = content.split(/(?<=[。！？!?\n])/g).filter((s) => s.trim().length > 0);

  const sentences: SentenceSentiment[] = rawSentences.map((text, index) => {
    const value = calcSentiment(text);
    return { index, value: Number(value.toFixed(3)), text: text.trim().slice(0, 30) };
  });

  res.json({ sentences });
});

const OPPOSITION_VERBS = ['拒绝', '反对', '挡', '躲', '追', '打', '刺', '砸', '挣扎', '反抗', '抵抗', '对抗', '拦住', '推开', '甩开', '怒斥', '指责', '威胁', '攻击', '反击'];
const TRANSITION_WORDS = ['但是', '然而', '可是', '不过', '却', '偏偏', '竟然', '居然', '不料', '谁知', '反倒'];
const NEGATIVE_INTENT = ['不想', '不愿', '不肯', '不要', '不行', '不准', '不许', '不能', '不会', '不可能'];
const CHARACTER_GOALS: Record<string, string[]> = {
  林川: ['寻找', '追查', '找到', '真相', '日记', '父亲', '失踪', '回来', '面对'],
  苏雨: ['帮助', '保护', '告诉', '隐瞒', '秘密', '担心', '关心'],
  陈默: ['威胁', '阻止', '消失', '隐藏', '灭口', '真相', '掩盖', '害怕'],
};
const DEFAULT_CHARACTERS = ['林川', '苏雨', '陈默'];

function extractDialogues(text: string): string[] {
  const dialogues: string[] = [];
  const regex = /"([^"]+)"/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    dialogues.push(match[1]);
  }
  return dialogues;
}

function hasOppositeIntent(dialogue: string): boolean {
  let hasOpposite = false;
  NEGATIVE_INTENT.forEach((w) => {
    if (dialogue.includes(w)) hasOpposite = true;
  });
  TRANSITION_WORDS.forEach((w) => {
    if (dialogue.includes(w)) hasOpposite = true;
  });
  return hasOpposite;
}

function findCharactersInText(text: string, charList: string[]): string[] {
  const found: string[] = [];
  charList.forEach((c) => {
    if (text.includes(c) && !found.includes(c)) {
      found.push(c);
    }
  });
  return found;
}

function calcConflictScore(para: string, charsInPara: string[]): { score: number; reason: string } {
  let score = 0;
  let reasonParts: string[] = [];

  let oppositionCount = 0;
  OPPOSITION_VERBS.forEach((w) => {
    if (para.includes(w)) oppositionCount++;
  });
  if (oppositionCount > 0) {
    score += oppositionCount * 2;
    reasonParts.push(`存在对立动作词（${OPPOSITION_VERBS.filter((w) => para.includes(w)).slice(0, 3).join('、')}）`);
  }

  let transitionCount = 0;
  TRANSITION_WORDS.forEach((w) => {
    if (para.includes(w)) transitionCount++;
  });
  if (transitionCount > 0) {
    score += transitionCount * 1.5;
    reasonParts.push('有转折关系词暗示冲突');
  }

  const dialogues = extractDialogues(para);
  let dialogueConflict = 0;
  dialogues.forEach((d) => {
    if (hasOppositeIntent(d)) dialogueConflict++;
  });
  if (dialogueConflict > 0) {
    score += dialogueConflict * 2.5;
    reasonParts.push('对话中存在相反意图表达');
  }

  if (charsInPara.length >= 2) {
    score += 1;

    let goalConflict = 0;
    for (let i = 0; i < charsInPara.length; i++) {
      for (let j = i + 1; j < charsInPara.length; j++) {
        const goals1 = CHARACTER_GOALS[charsInPara[i]] || [];
        const goals2 = CHARACTER_GOALS[charsInPara[j]] || [];
        const has1 = goals1.some((g) => para.includes(g));
        const has2 = goals2.some((g) => para.includes(g));
        if (has1 && has2) {
          goalConflict++;
        }
      }
    }
    if (goalConflict > 0) {
      score += goalConflict * 2;
      reasonParts.push('角色目标关键词呈现对立关系');
    }
  }

  if (reasonParts.length === 0) {
    reasonParts.push('检测到潜在情节冲突');
  }

  return { score, reason: reasonParts.join('；') };
}

app.post('/api/analysis/conflict', (req, res) => {
  const { content, characters } = req.body as { content: string; characters?: Character[] };
  const conflicts: ConflictItem[] = [];

  if (!content) return res.json({ conflicts });

  const charList = characters && characters.length > 0 ? characters.map((c) => c.name) : DEFAULT_CHARACTERS;

  const paragraphs = content.split(/\n\n+/g);
  let globalPos = 0;

  const scoredConflicts: { conflict: ConflictItem; score: number }[] = [];

  paragraphs.forEach((para) => {
    const charsInPara = findCharactersInText(para, charList);

    if (charsInPara.length >= 2) {
      const { score, reason } = calcConflictScore(para, charsInPara);

      if (score >= 2) {
        const firstCharIdx = para.indexOf(charsInPara[0]);
        const start = globalPos + Math.max(0, firstCharIdx - 5);
        const end = globalPos + para.length;

        scoredConflicts.push({
          conflict: {
            start,
            end,
            characters: [charsInPara[0], charsInPara[1]] as [string, string],
            reason,
          },
          score,
        });
      }
    }
    globalPos += para.length + 2;
  });

  scoredConflicts.sort((a, b) => b.score - a.score);
  res.json({ conflicts: scoredConflicts.slice(0, 3).map((s) => s.conflict) });
});

app.post('/api/analysis/characters', (req, res) => {
  const { content, characters } = req.body as { content: string; characters: Character[] };

  if (!characters || characters.length === 0) {
    return res.json({ nodes: [], links: [] });
  }

  const nodeFrequency: Record<string, number> = {};
  characters.forEach((c) => {
    const matches = content.match(new RegExp(c.name, 'g'));
    nodeFrequency[c.id] = matches ? matches.length : 0;
  });

  const linkStrength: Record<string, number> = {};
  const sentences = content.split(/[。！？!?\n]+/g).filter((s) => s.trim().length > 0);

  sentences.forEach((sentence) => {
    const present: string[] = [];
    characters.forEach((c) => {
      if (sentence.includes(c.name)) present.push(c.id);
    });
    for (let i = 0; i < present.length; i++) {
      for (let j = i + 1; j < present.length; j++) {
        const key = [present[i], present[j]].sort().join('|');
        linkStrength[key] = (linkStrength[key] || 0) + 1;
      }
    }
  });

  const nodes = characters.map((c) => ({
    id: c.id,
    name: c.name,
    frequency: Math.max(1, nodeFrequency[c.id] || 1),
    tags: c.tags,
    bio: c.bio,
  }));

  const links = Object.entries(linkStrength).map(([key, strength]) => {
    const [source, target] = key.split('|');
    return { source, target, strength };
  });

  const result: CharacterGraphData = { nodes, links };
  res.json(result);
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket ready on ws://localhost:${PORT}`);
});
