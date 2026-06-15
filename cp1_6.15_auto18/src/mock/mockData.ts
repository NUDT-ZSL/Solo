import { v4 as uuidv4 } from 'uuid';

export interface Book {
  id: string;
  title: string;
  author: string;
  color: string;
  description: string;
}

export interface Review {
  id: string;
  bookId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  rating: number;
  comment: string;
  timestamp: number;
  likes: number;
}

const books: Book[] = [
  {
    id: 'book-1',
    title: '百年孤独',
    author: '加西亚·马尔克斯',
    color: '#8B4513',
    description: '魔幻现实主义文学代表作'
  },
  {
    id: 'book-2',
    title: '活着',
    author: '余华',
    color: '#CD853F',
    description: '讲述了一个人和他的命运之间的友情'
  },
  {
    id: 'book-3',
    title: '小王子',
    author: '圣埃克苏佩里',
    color: '#DAA520',
    description: '一本写给大人的童话'
  },
  {
    id: 'book-4',
    title: '人类简史',
    author: '尤瓦尔·赫拉利',
    color: '#A0522D',
    description: '从动物到上帝的人类进化史'
  },
  {
    id: 'book-5',
    title: '三体',
    author: '刘慈欣',
    color: '#B8860B',
    description: '中国科幻文学的里程碑之作'
  }
];

const userNames = [
  '书虫小明', '阅读达人', '文艺青年', '咖啡与书',
  '夜读者', '书香门第', '漫步书林', '字里行间',
  '书页翻动', '墨香四溢', '书卷多情', '灯下读书人'
];

const avatarColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8B500', '#E74C3C'
];

const comments = [
  '这本书让我重新思考了人生的意义，强烈推荐给每一个迷茫的人。',
  '作者的笔触太细腻了，每个角色都栩栩如生。',
  '读完之后久久不能平静，这就是好书的力量。',
  '非常棒的阅读体验，情节紧凑，人物丰满。',
  '虽然是老书，但今天读来依然震撼人心。',
  '书中的哲学思考很深刻，值得反复品味。',
  '故事结构精巧，伏笔回收让人拍案叫绝。',
  '语言优美，像诗一样的散文。',
  '这本书改变了我的世界观，太有启发性了。',
  '读起来很轻松，但背后的深意值得细品。',
  '人物刻画入木三分，每个配角都有故事。',
  '想象力太丰富了，完全沉浸在作者构建的世界里。',
  '情感真挚，好几次都被感动到落泪。',
  '节奏把握得很好，越到后面越精彩。',
  '思想深邃，每次重读都有新的感悟。',
  '文笔流畅自然，读起来一气呵成。',
  '视角独特，从没想过可以这样看问题。',
  '细节描写很到位，画面感极强。',
  '这是一本需要慢慢读、细细品的好书。',
  '读完后收获满满，不虚此读。'
];

function generateReviews(): Review[] {
  const reviews: Review[] = [];
  const predefinedRatings = [4.8, 3.5, 2.3, 4.1, 4.6, 3.2, 1.8, 4.9, 2.7, 3.9, 4.3, 5.0, 3.6, 2.5, 4.7, 1.5, 3.8, 4.2, 4.5, 3.1];
  
  for (let i = 0; i < 20; i++) {
    const bookIndex = i % books.length;
    const userNameIndex = i % userNames.length;
    
    reviews.push({
      id: uuidv4(),
      bookId: books[bookIndex].id,
      userId: `user-${userNameIndex}`,
      userName: userNames[userNameIndex],
      userAvatar: avatarColors[userNameIndex],
      rating: predefinedRatings[i],
      comment: comments[i % comments.length],
      timestamp: Date.now() - (i + 1) * 60 * 60 * 1000 - Math.random() * 30 * 60 * 1000,
      likes: Math.floor(Math.random() * 50) + 5
    });
  }
  
  return reviews.sort((a, b) => b.timestamp - a.timestamp);
}

let mockReviews: Review[] = generateReviews();

export function getMockBooks(): Book[] {
  return [...books];
}

export function getMockReviews(filter?: { bookId?: string; starRatings?: number[]; sortBy?: 'latest' | 'hottest' }): Review[] {
  let result = [...mockReviews];
  
  if (filter?.bookId) {
    result = result.filter(r => r.bookId === filter.bookId);
  }
  
  if (filter?.starRatings && filter.starRatings.length > 0) {
    result = result.filter(r => {
      return filter.starRatings!.some(star => {
        const min = star === 1 ? 1 : star - 0.5;
        const max = star === 5 ? 5 : star + 0.5;
        return r.rating >= min && r.rating < max;
      });
    });
  }
  
  if (filter?.sortBy === 'latest') {
    result.sort((a, b) => b.timestamp - a.timestamp);
  } else if (filter?.sortBy === 'hottest') {
    result.sort((a, b) => b.likes - a.likes);
  }
  
  return result;
}

export function updateReviewLikes(reviewId: string, liked: boolean): Review | null {
  const review = mockReviews.find(r => r.id === reviewId);
  if (review) {
    review.likes += liked ? 1 : -1;
    if (review.likes < 0) review.likes = 0;
    return { ...review };
  }
  return null;
}
