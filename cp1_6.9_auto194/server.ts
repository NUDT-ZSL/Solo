import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3000;

app.use(express.json());

export interface Fragment {
  id: string;
  text: string;
  color: string;
  createdAt: number;
}

const fragments: Fragment[] = [];
const MAX_FRAGMENTS = 50;

const abstractTemplates = [
  '{keyword}在时光的裂隙中闪烁，意识如晨雾般消散又凝结，那些未曾说出口的话语，化作了天边最后一抹{adj}的光影。',
  '我们沿着记忆的走廊前行，{keyword}像一面破碎的镜子，每片碎片都映照出{adj}的过往，而我们，只是镜中人。',
  '当呼吸与脉搏同步，{keyword}便成为连接此岸与彼岸的桥梁，所有{adj}的思绪，在这一刻找到了归处。',
  '{keyword}漂浮在意识的深海，被遗忘的名字像气泡一样上升，带着{adj}的温度，在水面破裂成无数细小的光斑。',
  '在梦与醒的边界，{keyword}以{adj}的姿态伫立，时间在这里失去了意义，只有心跳在永恒地回响。',
  '那些被风吹散的{keyword}，总会以另一种形式归来，就像{adj}的星子，即使陨落也会在黑暗中留下轨迹。',
  '{keyword}织成一张无形的网，捕捉着每一个{adj}的瞬间，我们在网中起舞，不知疲倦，不问归期。',
  '如果声音有形状，{keyword}便是最{adj}的几何，在无形的空间里延展，勾勒出我们未曾抵达的彼岸。',
  '穿过层层叠叠的云雾，{keyword}显现出{adj}的轮廓，那是我们每个人心中最深的渴望与恐惧。',
  '在城市的霓虹深处，{keyword}以{adj}的频率共振，陌生人之间交换着眼神，交换着彼此不知的秘密。',
  '{keyword}是时间刻下的纹路，每一道都蕴含着{adj}的故事，我们沿着纹路行走，寻找着自己的坐标。',
  '当宇宙还只是一个光点，{keyword}便已存在，以{adj}的方式渗透万物，在每一个原子中呼吸。',
  '在图书馆的最深处，{keyword}夹在泛黄的书页间，散发着{adj}的气息，等待着某个有缘人的指尖触碰。',
  '{keyword}沿着血管流动，在心脏处汇聚成{adj}的潮汐，我们随波逐流，又在浪尖起舞。',
  '如果遗忘是一种颜色，那么{keyword}便是它的补色，以{adj}的姿态对抗着时间的侵蚀。'
];

const adjectives = [
  '温柔', '炽烈', '寂静', '璀璨', '朦胧',
  '深邃', '轻盈', '静谧', '绚烂', '幽远',
  '澄澈', '迷离', '和煦', '凛冽', '缱绻',
  '空灵', '苍茫', '潋滟', '婆娑', '逶迤'
];

function generateRandomColor(): string {
  const h = Math.floor(Math.random() * 360);
  const s = 55 + Math.floor(Math.random() * 25);
  const l = 45 + Math.floor(Math.random() * 20);
  return `hsl(${h}, ${s}%, ${l}%)`;
}

function generateText(keywords: string[]): string {
  const template = abstractTemplates[Math.floor(Math.random() * abstractTemplates.length)];
  const keywordStr = keywords.join('、');
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  let text = template.replace('{keyword}', keywordStr).replace('{adj}', adj);
  
  if (text.length < 30) {
    text += '这一切，都在无声中诉说着永恒的秘密。';
  }
  if (text.length > 80) {
    text = text.slice(0, 78) + '…';
  }
  return text;
}

app.post('/api/fragment', (req, res) => {
  try {
    const { keywords } = req.body;
    const keywordArray = Array.isArray(keywords) ? keywords : [];
    const text = generateText(keywordArray);
    const color = generateRandomColor();
    
    const fragment: Fragment = {
      id: uuidv4(),
      text,
      color,
      createdAt: Date.now()
    };

    fragments.unshift(fragment);
    
    if (fragments.length > MAX_FRAGMENTS) {
      fragments.pop();
    }

    res.json({
      id: fragment.id,
      text: fragment.text,
      color: fragment.color,
      createdAt: fragment.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate fragment' });
  }
});

app.get('/api/fragments', (_req, res) => {
  res.json(fragments);
});

app.delete('/api/fragment', (req, res) => {
  try {
    const { id } = req.query;
    const index = fragments.findIndex(f => f.id === id);
    
    if (index === -1) {
      res.status(404).json({ error: 'Fragment not found' });
      return;
    }

    fragments.splice(index, 1);
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete fragment' });
  }
});

app.listen(PORT, () => {
  console.log(`[server] 意识碎片服务器运行在 http://localhost:${PORT}`);
});
