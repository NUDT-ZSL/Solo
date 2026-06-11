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

  socket.on('cursor-move', ({ projectId, cursor }: { projectId: string; cursor: any }) => {
    const user = socketUserMap.get(socket.id);
    if (!user) return;
    socket.to(projectId).emit('cursor-broadcast', { userId: user.id, cursor });
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

const POSITIVE_WORDS = ['笑', '喜欢', '爱', '温柔', '希望', '光', '温暖', '开心', '快乐', '勇敢', '美好', '星', '灯'];
const NEGATIVE_WORDS = ['痛', '死', '哭', '恨', '恐惧', '黑', '冷', '悲伤', '愤怒', '害怕', '血', '危险', '伤', '杀'];

app.post('/api/analyze/sentiment', (req, res) => {
  const { content } = req.body as { content: string };
  if (!content) return res.json({ sentences: [] });

  const rawSentences = content.split(/(?<=[。！？!?\n])/g).filter((s) => s.trim().length > 0);

  const sentences: SentenceSentiment[] = rawSentences.map((text, index) => {
    let value = 0;
    POSITIVE_WORDS.forEach((w) => {
      if (text.includes(w)) value += 0.3;
    });
    NEGATIVE_WORDS.forEach((w) => {
      if (text.includes(w)) value -= 0.3;
    });
    value = Math.max(-1, Math.min(1, value + (Math.random() - 0.5) * 0.2));
    return { index, value: Number(value.toFixed(3)), text: text.trim().slice(0, 30) };
  });

  res.json({ sentences });
});

app.post('/api/analyze/conflict', (req, res) => {
  const { content } = req.body as { content: string };
  const conflicts: ConflictItem[] = [];

  if (!content) return res.json({ conflicts });

  const paragraphs = content.split(/\n\n+/g);
  let globalPos = 0;

  paragraphs.forEach((para) => {
    const hasOpposition = /(但是|然而|可是|不过|却|偏偏|竟然|居然|不想|不愿|拒绝|反对|挡|躲|追|打|刺|砸|叫|挣扎)/.test(para);
    const mentionsMultipleChars = (para.match(/[\u4e00-\u9fa5]{2,3}(?=[，。！？、：；\s])/g) || []).filter((w, i, arr) => {
      const chars = ['林川', '苏雨', '陈默'];
      return chars.includes(w) && arr.indexOf(w) === i;
    });

    if (hasOpposition && mentionsMultipleChars.length >= 2) {
      const start = globalPos + para.indexOf(mentionsMultipleChars[0]);
      const end = globalPos + para.length;
      const reasons = [
        '两位角色在此段落中呈现明显的目标对立关系',
        '对话中存在潜在的利益冲突与情感张力',
        '情节暗示双方将在后续剧情中走向对立',
      ];
      conflicts.push({
        start: Math.max(0, start - 5),
        end,
        characters: [mentionsMultipleChars[0], mentionsMultipleChars[1]] as [string, string],
        reason: reasons[Math.floor(Math.random() * reasons.length)],
      });
    }
    globalPos += para.length + 2;
  });

  res.json({ conflicts: conflicts.slice(0, 3) });
});

app.post('/api/analyze/characters', (req, res) => {
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
  const paragraphs = content.split(/\n\n+/g);

  paragraphs.forEach((para) => {
    const present: string[] = [];
    characters.forEach((c) => {
      if (para.includes(c.name)) present.push(c.id);
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
