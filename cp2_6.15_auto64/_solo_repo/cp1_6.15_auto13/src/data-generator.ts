import { v4 as uuidv4 } from 'uuid';
import { AuctionItem, User } from './types';

const AVATAR_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12'];

export function generateUsers(): User[] {
  return [
    { id: uuidv4(), name: 'Alice', avatarColor: AVATAR_COLORS[0], balance: 1000, initialBalance: 1000, bidCount: 0 },
    { id: uuidv4(), name: 'Bob', avatarColor: AVATAR_COLORS[1], balance: 1000, initialBalance: 1000, bidCount: 0 },
    { id: uuidv4(), name: 'Carol', avatarColor: AVATAR_COLORS[2], balance: 1000, initialBalance: 1000, bidCount: 0 },
    { id: uuidv4(), name: 'Dave', avatarColor: AVATAR_COLORS[3], balance: 1000, initialBalance: 1000, bidCount: 0 },
  ];
}

export function generateItems(): AuctionItem[] {
  const itemsData = [
    {
      name: '明代青花瓷瓶',
      startingPrice: 100,
      imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=beautiful%20Chinese%20ming%20dynasty%20blue%20and%20white%20porcelain%20vase%20on%20dark%20background%20museum%20quality&image_size=square',
      description: '明代永乐年制青花缠枝莲纹瓶，釉色温润，工艺精湛',
    },
    {
      name: '梵高星空版画',
      startingPrice: 150,
      imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Van%20Gogh%20Starry%20Night%20fine%20art%20print%20on%20wall%20dark%20gallery&image_size=square',
      description: '梵高《星月夜》限量复刻版画，带认证编号',
    },
    {
      name: '劳力士古董腕表',
      startingPrice: 200,
      imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=vintage%20Rolex%20watch%20on%20dark%20velvet%20luxury%20close%20up&image_size=square',
      description: '1960年代劳力士Submariner，品相优良，原装表盘',
    },
    {
      name: '和田玉雕摆件',
      startingPrice: 120,
      imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Chinese%20Hetian%20jade%20carving%20sculpture%20on%20dark%20background%20elegant&image_size=square',
      description: '新疆和田羊脂白玉雕龙凤呈祥摆件，大师作品',
    },
    {
      name: '稀世红酒套装',
      startingPrice: 80,
      imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=rare%20vintage%20red%20wine%20bottles%20collection%20dark%20cellar%20luxury&image_size=square',
      description: '1982年拉菲古堡等三支珍藏红酒组合，原木箱装',
    },
  ];

  return itemsData.map((d) => ({
    id: uuidv4(),
    name: d.name,
    startingPrice: d.startingPrice,
    imageUrl: d.imageUrl,
    description: d.description,
    status: 'pending' as const,
    currentHighestBid: d.startingPrice,
    currentHighestBidder: null,
    bidHistory: [],
    countdown: 120,
  }));
}
