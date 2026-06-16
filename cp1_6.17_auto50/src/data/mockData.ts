export interface Artwork {
  id: string;
  title: string;
  thumbnail: string;
  author: {
    name: string;
    avatar: string;
  };
  styles: string[];
}

export interface Commission {
  id: string;
  artworkId: string;
  artworkTitle: string;
  description: string;
  budget: number;
  deadline: string;
  status: CommissionStatus;
  progress: number;
  createdAt: string;
}

export type CommissionStatus = 'pending' | 'negotiating' | 'creating' | 'revising' | 'completed';

export interface Message {
  id: string;
  commissionId: string;
  sender: 'client' | 'designer';
  content: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  title: string;
  content: string;
  read: boolean;
  createdAt: string;
  type: 'status' | 'message';
}

export const styleTags = [
  '水彩', '油画', '扁平插画', '日系', '赛博朋克',
  '极简', '复古', '卡通', '写实', '国潮'
];

export const statusLabels: Record<CommissionStatus, string> = {
  pending: '待接洽',
  negotiating: '协商中',
  creating: '创作中',
  revising: '修改中',
  completed: '已完成'
};

export const mockArtworks: Artwork[] = [
  {
    id: 'a1',
    title: '春日花语',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=watercolor%20painting%20of%20spring%20flowers%20cherry%20blossom%20soft%20pastel%20colors%20artistic&image_size=square_hd',
    author: { name: '林雨桐', avatar: 'https://i.pravatar.cc/80?img=47' },
    styles: ['水彩', '日系']
  },
  {
    id: 'a2',
    title: '城市霓虹',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cyberpunk%20neon%20cityscape%20night%20futuristic%20digital%20art&image_size=portrait_4_3',
    author: { name: '陈墨白', avatar: 'https://i.pravatar.cc/80?img=12' },
    styles: ['赛博朋克', '写实']
  },
  {
    id: 'a3',
    title: '猫咪日常',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cute%20cartoon%20cat%20illustration%20flat%20design%20warm%20colors%20kawaii&image_size=square',
    author: { name: '苏小暖', avatar: 'https://i.pravatar.cc/80?img=23' },
    styles: ['卡通', '扁平插画']
  },
  {
    id: 'a4',
    title: '山水之间',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20chinese%20ink%20painting%20mountain%20landscape%20minimal%20zen&image_size=landscape_4_3',
    author: { name: '王清远', avatar: 'https://i.pravatar.cc/80?img=33' },
    styles: ['国潮', '极简', '水墨']
  },
  {
    id: 'a5',
    title: '复古海报',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=vintage%20retro%20poster%20design%2080s%20style%20warm%20colors%20graphic%20art&image_size=square_hd',
    author: { name: '张艺然', avatar: 'https://i.pravatar.cc/80?img=5' },
    styles: ['复古', '扁平插画']
  },
  {
    id: 'a6',
    title: '深海幻境',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=underwater%20fantasy%20scene%20jellyfish%20bioluminescent%20dreamy%20digital%20art&image_size=portrait_16_9',
    author: { name: '李思海', avatar: 'https://i.pravatar.cc/80?img=68' },
    styles: ['写实', '日系']
  },
  {
    id: 'a7',
    title: '几何之美',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=geometric%20abstract%20art%20minimal%20flat%20design%20earth%20tones%20modern&image_size=square',
    author: { name: '赵千雅', avatar: 'https://i.pravatar.cc/80?img=44' },
    styles: ['极简', '扁平插画']
  },
  {
    id: 'a8',
    title: '少女与蝶',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=anime%20style%20girl%20with%20butterflies%20soft%20lighting%20japanese%20illustration&image_size=portrait_4_3',
    author: { name: '林雪晴', avatar: 'https://i.pravatar.cc/80?img=49' },
    styles: ['日系', '水彩']
  },
  {
    id: 'a9',
    title: '老城记忆',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=oil%20painting%20old%20town%20street%20warm%20sunset%20nostalgic%20artistic&image_size=landscape_16_9',
    author: { name: '周建国', avatar: 'https://i.pravatar.cc/80?img=60' },
    styles: ['油画', '写实']
  },
  {
    id: 'a10',
    title: '食物插画集',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cute%20food%20illustration%20flat%20design%20kawaii%20desserts%20warm%20pastel&image_size=square_hd',
    author: { name: '吴甜甜', avatar: 'https://i.pravatar.cc/80?img=25' },
    styles: ['卡通', '扁平插画']
  },
  {
    id: 'a11',
    title: '敦煌飞天',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=dunhuang%20flying%20apsaras%20chinese%20traditional%20art%20gold%20and%20red%20elegant&image_size=portrait_4_3',
    author: { name: '唐风', avatar: 'https://i.pravatar.cc/80?img=15' },
    styles: ['国潮', '复古']
  },
  {
    id: 'a12',
    title: '星河漫游',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=space%20galaxy%20astronaut%20dreamy%20cosmic%20digital%20illustration%20purple%20blue&image_size=square_hd',
    author: { name: '郑星辰', avatar: 'https://i.pravatar.cc/80?img=8' },
    styles: ['赛博朋克', '写实']
  }
];

export const designerReplies = [
  '您好！感谢您的委托，我已经仔细阅读了您的需求。',
  '这个创意非常棒，我有几个想法想和您进一步沟通。',
  '关于预算，我们可以再商量一下，我会尽力满足您的期望。',
  '初稿已经在构思中，预计3天内可以给您看草图。',
  '收到您的修改意见，我会尽快调整后发送给您确认。',
  '颜色调整已经完成，您看看这个版本是否满意？',
  '作品已经完成，请您验收，有任何问题随时告诉我。'
];
