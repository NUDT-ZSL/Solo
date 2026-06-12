export interface Photo {
  id: string;
  url: string;
  title: string;
  date: string;
  camera: string;
}

export interface Album {
  id: string;
  title: string;
  cover: string;
  photos: Photo[];
}

const IMG = (seed: string, w: number = 800, h: number = 600) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

export const albums: Album[] = [
  {
    id: 'portrait',
    title: '人像',
    cover: IMG('portrait-cover', 600, 450),
    photos: [
      { id: 'p1', url: IMG('portrait-1', 1200, 900), title: '午后阳光', date: '2024-03-15', camera: 'Sony A7IV' },
      { id: 'p2', url: IMG('portrait-2', 1200, 900), title: '窗边侧影', date: '2024-04-02', camera: 'Canon R5' },
      { id: 'p3', url: IMG('portrait-3', 1200, 900), title: '柔光肖像', date: '2024-04-18', camera: 'Sony A7IV' },
      { id: 'p4', url: IMG('portrait-4', 1200, 900), title: '街头邂逅', date: '2024-05-05', camera: 'Fujifilm X-T5' },
      { id: 'p5', url: IMG('portrait-5', 1200, 900), title: '黑白记忆', date: '2024-05-20', camera: 'Leica Q2' },
      { id: 'p6', url: IMG('portrait-6', 1200, 900), title: '微笑时刻', date: '2024-06-08', camera: 'Sony A7IV' },
    ],
  },
  {
    id: 'landscape',
    title: '风光',
    cover: IMG('landscape-cover', 600, 450),
    photos: [
      { id: 'l1', url: IMG('landscape-1', 1200, 900), title: '山川晨曦', date: '2024-02-10', camera: 'Nikon Z8' },
      { id: 'l2', url: IMG('landscape-2', 1200, 900), title: '海边日落', date: '2024-03-05', camera: 'Canon R5' },
      { id: 'l3', url: IMG('landscape-3', 1200, 900), title: '森林小径', date: '2024-03-22', camera: 'Sony A7R V' },
      { id: 'l4', url: IMG('landscape-4', 1200, 900), title: '星空银河', date: '2024-04-14', camera: 'Sony A7S III' },
      { id: 'l5', url: IMG('landscape-5', 1200, 900), title: '雪山倒影', date: '2024-05-01', camera: 'Nikon Z8' },
      { id: 'l6', url: IMG('landscape-6', 1200, 900), title: '秋色斑斓', date: '2024-05-18', camera: 'Fujifilm GFX 100' },
      { id: 'l7', url: IMG('landscape-7', 1200, 900), title: '雾绕山峦', date: '2024-06-02', camera: 'Sony A7R V' },
    ],
  },
  {
    id: 'street',
    title: '街拍',
    cover: IMG('street-cover', 600, 450),
    photos: [
      { id: 's1', url: IMG('street-1', 1200, 900), title: '城市脉动', date: '2024-03-08', camera: 'Ricoh GR III' },
      { id: 's2', url: IMG('street-2', 1200, 900), title: '雨中漫步', date: '2024-03-25', camera: 'Leica Q2' },
      { id: 's3', url: IMG('street-3', 1200, 900), title: '光影交错', date: '2024-04-12', camera: 'Fujifilm X100V' },
      { id: 's4', url: IMG('street-4', 1200, 900), title: '街角故事', date: '2024-04-28', camera: 'Ricoh GR III' },
      { id: 's5', url: IMG('street-5', 1200, 900), title: '地铁一瞬', date: '2024-05-15', camera: 'Leica Q2' },
      { id: 's6', url: IMG('street-6', 1200, 900), title: '霓虹夜色', date: '2024-06-05', camera: 'Sony A7C' },
      { id: 's7', url: IMG('street-7', 1200, 900), title: '市场喧嚣', date: '2024-06-18', camera: 'Fujifilm X100V' },
      { id: 's8', url: IMG('street-8', 1200, 900), title: '独行身影', date: '2024-06-25', camera: 'Ricoh GR III' },
    ],
  },
  {
    id: 'still-life',
    title: '静物',
    cover: IMG('still-cover', 600, 450),
    photos: [
      { id: 'st1', url: IMG('still-1', 1200, 900), title: '咖啡时光', date: '2024-02-20', camera: 'Sony A7IV' },
      { id: 'st2', url: IMG('still-2', 1200, 900), title: '书香雅韵', date: '2024-03-12', camera: 'Canon R6' },
      { id: 'st3', url: IMG('still-3', 1200, 900), title: '花艺小品', date: '2024-04-01', camera: 'Nikon Z6' },
      { id: 'st4', url: IMG('still-4', 1200, 900), title: '光影游戏', date: '2024-04-22', camera: 'Sony A7IV' },
      { id: 'st5', url: IMG('still-5', 1200, 900), title: '复古物件', date: '2024-05-10', camera: 'Fujifilm X-T5' },
      { id: 'st6', url: IMG('still-6', 1200, 900), title: '水果拼盘', date: '2024-05-28', camera: 'Canon R6' },
    ],
  },
];
