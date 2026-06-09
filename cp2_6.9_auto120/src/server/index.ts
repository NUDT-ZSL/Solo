import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { URL } from 'url';
import type { Hall, Artwork } from '../types';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const PORT = 3001;
const MAX_USERS_PER_HALL = 10;

const modernArtworks: Artwork[] = [
  {
    id: 'm1',
    title: '抽象构成No.7',
    artist: '瓦西里·康定斯基',
    year: '1923',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=abstract%20modern%20art%20geometric%20shapes%20blue%20purple%20colors&image_size=square',
    description: '这幅作品展现了康定斯基对几何形式与色彩关系的深刻探索。画面中的圆形、三角形和方形以一种近乎音乐般的节奏排列，传达出艺术家对内在精神世界的视觉化表达。'
  },
  {
    id: 'm2',
    title: '构成VIII',
    artist: '瓦西里·康定斯基',
    year: '1923',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=abstract%20modern%20art%20colorful%20lines%20shapes%20bauhaus&image_size=square',
    description: '在包豪斯时期创作的这幅作品体现了艺术家对形式语言的系统化研究。每一个元素的位置、大小和颜色都经过精确计算，构建出一个动态平衡的视觉空间。'
  },
  {
    id: 'm3',
    title: '蓝色时期的记忆',
    artist: '巴勃罗·毕加索',
    year: '1903',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20art%20blue%20monochrome%20melancholy%20figure%20painting&image_size=square',
    description: '这幅蓝色调的作品反映了艺术家在人生低谷时期的情感状态。冷蓝色调不仅是一种色彩选择，更是孤独、贫困和对人类苦难深刻同情的视觉表达。'
  },
  {
    id: 'm4',
    title: '立体主义肖像',
    artist: '巴勃罗·毕加索',
    year: '1910',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cubism%20portrait%20multiple%20perspectives%20geometric%20deconstruction&image_size=square',
    description: '这幅立体主义代表作打破了传统单点透视的束缚，将对象从多个视角同时展现。观者看到的不再是一个固定角度的形象，而是对事物本质的多维度探索。'
  },
  {
    id: 'm5',
    title: '红与黑的对话',
    artist: '卡齐米尔·马列维奇',
    year: '1915',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=suprematism%20art%20black%20red%20square%20minimal%20geometric&image_size=square',
    description: '至上主义的标志性作品。艺术家宣称这不是一个空洞的方块，而是纯粹情感的表达。红色方块代表革命的能量，黑色则象征着深邃的精神空间。'
  },
  {
    id: 'm6',
    title: '黄色的呐喊',
    artist: '爱德华·蒙克',
    year: '1895',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=expressionism%20screaming%20figure%20swirling%20sky%20yellow%20orange&image_size=square',
    description: '这幅表现主义杰作捕捉了现代人的焦虑与存在主义恐惧。扭曲的形态和浓烈的色彩共同构建了一个心理风景，反映了艺术家对时代精神的敏锐感知。'
  }
];

const impressionistArtworks: Artwork[] = [
  {
    id: 'i1',
    title: '日出·印象',
    artist: '克劳德·莫奈',
    year: '1872',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=impressionist%20sunrise%20harbor%20orange%20blue%20soft%20brushstrokes&image_size=square',
    description: '这幅作品是印象派的开山之作。画家没有描绘港口的精确轮廓，而是捕捉了清晨日出那一刻的光影印象。松散的笔触和颤动的色彩正是对"瞬间"的艺术诠释。'
  },
  {
    id: 'i2',
    title: '睡莲池',
    artist: '克劳德·莫奈',
    year: '1906',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=impressionist%20water%20lilies%20pond%20soft%20pastel%20colors%20reflection&image_size=square',
    description: '莫奈晚年在吉维尼花园创作的系列作品之一。水面倒影与真实景物的边界在画面中消失了，色彩和光线成为画面的真正主角，创造出一种如梦似幻的视觉体验。'
  },
  {
    id: 'i3',
    title: '星夜',
    artist: '文森特·梵高',
    year: '1889',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=post%20impressionist%20starry%20night%20swirling%20sky%20village%20blue%20yellow&image_size=square',
    description: '在圣雷米精神病院期间创作的这幅作品展现了梵高内心世界的强烈情感。旋转的夜空和燃烧的柏树是艺术家精神状态的视觉外化，充满了生命的张力。'
  },
  {
    id: 'i4',
    title: '向日葵',
    artist: '文森特·梵高',
    year: '1888',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=impressionist%20sunflowers%20vase%20yellow%20orange%20thick%20brushstrokes&image_size=square',
    description: '这幅以黄色为主调的作品是画家对阳光和生命的礼赞。厚重的笔触赋予花瓣近乎雕塑般的质感，每一朵向日葵都仿佛在向着光明顽强地生长。'
  },
  {
    id: 'i5',
    title: '舞蹈课',
    artist: '埃德加·德加',
    year: '1874',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=impressionist%20ballet%20dancers%20rehearsal%20soft%20light%20pastel&image_size=square',
    description: '德加以独特的视角和构图捕捉了芭蕾舞者的优雅瞬间。画面中不对称的构图和被切割的边缘体现了艺术家对摄影艺术的借鉴，赋予传统题材以现代感。'
  },
  {
    id: 'i6',
    title: '船上的午餐',
    artist: '皮埃尔·奥古斯特·雷诺阿',
    year: '1881',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=impressionist%20people%20boating%20lunch%20party%20sunlight%20warm%20colors&image_size=square',
    description: '这幅作品描绘了一群朋友在塞纳河畔泛舟午餐的欢乐场景。斑驳的阳光洒在人物身上，温暖的色调和轻松的氛围完美体现了印象派对快乐生活的捕捉与赞美。'
  }
];

const digitalArtworks: Artwork[] = [
  {
    id: 'd1',
    title: '数据之海',
    artist: 'Refik Anadol',
    year: '2021',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=digital%20art%20data%20visualization%20flowing%20particles%20ocean%20cyan%20blue&image_size=square',
    description: '这件基于机器学习算法创作的作品将海量数据转化为流动的视觉形态。每一个像素都是算法对数据的解读，呈现出技术美学与信息时代的诗意表达。'
  },
  {
    id: 'd2',
    title: '量子花园',
    artist: 'teamLab',
    year: '2019',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=digital%20interactive%20art%20flowers%20garden%20glowing%20particles%20neon&image_size=square',
    description: '一件沉浸式数字装置作品。虚拟花朵会根据观者的互动实时绽放或凋零，打破了艺术作品与观众之间的传统边界，创造出一个不断变化的共享空间。'
  },
  {
    id: 'd3',
    title: '神经网络梦境',
    artist: 'Mario Klingemann',
    year: '2020',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=generative%20art%20neural%20network%20dreamlike%20surreal%20faces%20distorted&image_size=square',
    description: '使用生成对抗网络(GAN)创作的这件作品探索了机器"想象"的边界。算法在学习了数千幅肖像画后生成的这些面孔，既熟悉又陌生，引发关于创造力本质的思考。'
  },
  {
    id: 'd4',
    title: '无限镜像室',
    artist: '草间弥生',
    year: '2013',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=digital%20infinity%20room%20led%20lights%20mirrors%20dots%20colorful%20space&image_size=square',
    description: '在LED灯光和镜面的无限反射中，观者仿佛置身于宇宙深处。艺术家标志性的波点在此空间中获得了全新的维度，个人与宇宙的界限在迷幻的光影中消融。'
  },
  {
    id: 'd5',
    title: '像素革命',
    artist: 'Beeple',
    year: '2021',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=digital%20pixel%20art%20everydays%20futuristic%20surreal%20collage&image_size=square',
    description: '这件由5000幅每日创作拼合而成的NFT作品标志着数字艺术进入主流视野的里程碑。从第一幅到最后一幅，见证了一位数字艺术家十余年的坚持与进化。'
  },
  {
    id: 'd6',
    title: '赛博自然',
    artist: 'Jonathan Zawada',
    year: '2022',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cyberpunk%20digital%20nature%203d%20render%20glowing%20plants%20futuristic&image_size=square',
    description: '这件3D渲染作品探讨了自然与技术的融合。发光的植物、晶体结构和有机形态共同构建了一个未来主义的生态系统，暗示着人类与科技关系的多种可能性。'
  }
];

const halls: Hall[] = [
  {
    id: 'modern',
    name: '现代艺术厅',
    theme: '20世纪现代主义与抽象艺术',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20art%20gallery%20blue%20purple%20abstract%20ambient&image_size=landscape_16_9',
    gradientFrom: '#2C3E50',
    gradientTo: '#3498DB',
    particleType: 'dots',
    artworks: modernArtworks
  },
  {
    id: 'impressionist',
    name: '印象派厅',
    theme: '19世纪光影与色彩的革命',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=impressionist%20art%20gallery%20warm%20yellow%20orange%20soft%20light&image_size=landscape_16_9',
    gradientFrom: '#F39C12',
    gradientTo: '#E74C3C',
    particleType: 'petals',
    artworks: impressionistArtworks
  },
  {
    id: 'digital',
    name: '数字媒体厅',
    theme: '当代数字艺术与生成艺术',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=digital%20media%20art%20gallery%20neon%20cyberpunk%20glowing&image_size=landscape_16_9',
    gradientFrom: '#8E44AD',
    gradientTo: '#E91E63',
    particleType: 'pixels',
    artworks: digitalArtworks
  }
];

interface ClientConnection {
  ws: WebSocket;
  hallId: string;
  userName: string;
}

const clients = new Map<string, Set<ClientConnection>>();

app.use(express.json());

app.get('/api/halls', (_req, res) => {
  const summary = halls.map(({ id, name, theme, thumbnail, gradientFrom, gradientTo, particleType }) => ({
    id,
    name,
    theme,
    thumbnail,
    gradientFrom,
    gradientTo,
    particleType
  }));
  res.json(summary);
});

app.get('/api/halls/:id', (req, res) => {
  const hall = halls.find((h) => h.id === req.params.id);
  if (!hall) {
    res.status(404).json({ error: 'Hall not found' });
    return;
  }
  res.json(hall);
});

function broadcastToHall(hallId: string, message: string, excludeWs?: WebSocket) {
  const hallClients = clients.get(hallId);
  if (!hallClients) return;
  for (const client of hallClients) {
    if (client.ws !== excludeWs && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  }
}

function getOnlineCount(hallId: string): number {
  return clients.get(hallId)?.size ?? 0;
}

wss.on('connection', (ws, req) => {
  let currentHallId: string | null = null;
  let currentUserName: string = '访客';

  try {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const hallId = url.searchParams.get('hallId');
    const userName = url.searchParams.get('userName') || '访客';

    if (!hallId) {
      ws.close(4000, 'Missing hallId');
      return;
    }

    const onlineCount = getOnlineCount(hallId);
    if (onlineCount >= MAX_USERS_PER_HALL) {
      ws.close(4001, 'Hall is full');
      return;
    }

    currentHallId = hallId;
    currentUserName = userName;

    if (!clients.has(hallId)) {
      clients.set(hallId, new Set());
    }

    const hallClients = clients.get(hallId)!;
    hallClients.add({ ws, hallId, userName });

    const joinMessage = JSON.stringify({
      type: 'online',
      count: getOnlineCount(hallId),
      userName,
      action: 'join'
    });

    ws.send(JSON.stringify({
      type: 'online',
      count: getOnlineCount(hallId)
    }));

    broadcastToHall(hallId, joinMessage, ws);
  } catch (err) {
    console.error('WebSocket connection error:', err);
    ws.close();
    return;
  }

  ws.on('message', (data) => {
    if (!currentHallId) return;

    let parsed;
    try {
      parsed = JSON.parse(data.toString());
    } catch {
      return;
    }

    if (parsed.type === 'chat' && parsed.content && typeof parsed.content === 'string') {
      const content = parsed.content.slice(0, 100);
      const chatMessage = JSON.stringify({
        type: 'chat',
        userName: currentUserName,
        userColor: parsed.userColor || currentUserName,
        content,
        timestamp: Date.now()
      });
      broadcastToHall(currentHallId, chatMessage);
    }
  });

  ws.on('close', () => {
    if (!currentHallId) return;

    const hallClients = clients.get(currentHallId);
    if (hallClients) {
      for (const client of hallClients) {
        if (client.ws === ws) {
          hallClients.delete(client);
          break;
        }
      }

      const newCount = getOnlineCount(currentHallId);
      const leaveMessage = JSON.stringify({
        type: 'online',
        count: newCount,
        userName: currentUserName,
        action: 'leave'
      });
      broadcastToHall(currentHallId, leaveMessage, ws);

      if (hallClients.size === 0) {
        clients.delete(currentHallId);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API: http://localhost:${PORT}/api/halls`);
  console.log(`WebSocket: ws://localhost:${PORT}/ws`);
});
