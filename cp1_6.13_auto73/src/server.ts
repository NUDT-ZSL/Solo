import express, { Request, Response } from 'express';
import Datastore from 'nedb-promises';
import path from 'path';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const db = {
  photos: Datastore.create({
    filename: path.join(__dirname, '../data/photos.db'),
    autoload: true
  }),
  reviews: Datastore.create({
    filename: path.join(__dirname, '../data/reviews.db'),
    autoload: true
  })
};

interface Photo {
  _id?: string;
  title: string;
  category: 'portrait' | 'landscape' | 'street' | 'still';
  description: string;
  imageBase64: string;
  author: string;
  authorAvatar: string;
  createdAt: number;
  averageRating: number;
  reviewCount: number;
  compositeScore: number;
}

interface Review {
  _id?: string;
  photoId: string;
  reviewer: string;
  reviewerAvatar: string;
  content: string;
  rating: number;
  markerX: number;
  markerY: number;
  createdAt: number;
}

const simulateDelay = (ms: number = 300) =>
  new Promise(resolve => setTimeout(resolve, ms));

const sampleImages = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80',
  'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=800&q=80',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80',
  'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&q=80',
  'https://images.unsplash.com/photo-1465056836041-7f43ac27dcb5?w=800&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80',
  'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=800&q=80',
  'https://images.unsplash.com/photo-1488161628813-04466f872be2?w=800&q=80',
  'https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=800&q=80',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&q=80',
  'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&q=80',
  'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=800&q=80',
  'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80',
  'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800&q=80',
  'https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=800&q=80',
  'https://images.unsplash.com/photo-1421091242698-34f6ad7fc088?w=800&q=80'
];

const sampleAvatars = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=1',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=2',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=3',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=4',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=5'
];

const authorNames = ['张光影', '李焦距', '王快门', '刘光圈', '陈景深', '赵曝光', '孙构图'];
const reviewerNames = ['摄影达人', '光影猎人', '镜头控', '色彩大师', '构图专家', '快门手', '光圈控'];

const categoryNames: Record<string, string> = {
  portrait: '人像',
  landscape: '风光',
  street: '街拍',
  still: '静物'
};

const photoTitles = [
  '晨光中的少女', '山巅云海', '城市脉搏', '静谧时光',
  '秋日私语', '海岸线', '老街记忆', '花间精灵',
  '星空漫步', '雨后彩虹', '都市夜景', '茶烟袅袅',
  '青春不散', '雪山之巅', '巷口微光', '书中黄金',
  '风吹麦浪', '烟雨江南', '霓虹闪烁', '墨韵茶香'
];

const photoDescriptions = [
  '捕捉清晨第一缕阳光洒落在面庞的瞬间，温暖而静谧。',
  '站在山巅俯瞰云海翻涌，感受大自然的壮美。',
  '繁华都市中快节奏的生活，每个人都在为梦想奔波。',
  '午后阳光透过窗帘，营造出宁静祥和的氛围。',
  '金色的秋天，落叶缤纷，诗意盎然。',
  '海浪拍打着礁石，永不停歇的自然乐章。',
  '斑驳的老墙，记录着岁月的痕迹。',
  '花丛中翩翩起舞的精灵，生机盎然。',
  '仰望星空，思考宇宙的奥秘。',
  '风雨过后，彩虹横跨天际，希望永存。'
];

const reviewContents = [
  '构图非常棒，光线运用恰到好处！',
  '色彩处理得很好，整体氛围很棒。',
  '这个角度选得很有创意，学习了！',
  '细节抓拍很到位，瞬间的感觉捕捉得很准。',
  '后期处理很自然，没有过度修饰。',
  '景深控制得很好，主体突出。',
  '画面故事感很强，能让人产生共鸣。',
  '色调很舒服，整体统一性很好。',
  '这个瞬间抓得太妙了，可遇不可求！',
  '视角独特，给人耳目一新的感觉。'
];

async function urlToBase64(url: string): Promise<string> {
  return url;
}

async function initMockData() {
  const existingPhotos = await db.photos.find({});
  if (existingPhotos.length > 0) return;

  console.log('初始化模拟数据...');

  const categories: Array<'portrait' | 'landscape' | 'street' | 'still'> =
    ['portrait', 'landscape', 'street', 'still'];

  for (let i = 0; i < 25; i++) {
    const category = categories[i % 4];
    const imageUrl = sampleImages[i % sampleImages.length];
    const imageBase64 = await urlToBase64(imageUrl);

    const photo: Photo = {
      _id: uuidv4(),
      title: photoTitles[i % photoTitles.length],
      category,
      description: photoDescriptions[i % photoDescriptions.length],
      imageBase64,
      author: authorNames[i % authorNames.length],
      authorAvatar: sampleAvatars[i % sampleAvatars.length],
      createdAt: Date.now() - i * 3600000,
      averageRating: 0,
      reviewCount: 0,
      compositeScore: 0
    };

    const insertedPhoto = await db.photos.insert(photo);

    const reviewCount = Math.floor(Math.random() * 8) + 2;
    let totalRating = 0;

    for (let j = 0; j < reviewCount; j++) {
      const rating = Math.floor(Math.random() * 3) + 3;
      totalRating += rating;

      const review: Review = {
        _id: uuidv4(),
        photoId: insertedPhoto._id!,
        reviewer: reviewerNames[j % reviewerNames.length],
        reviewerAvatar: sampleAvatars[j % sampleAvatars.length],
        content: reviewContents[j % reviewContents.length],
        rating,
        markerX: Math.random() * 80 + 10,
        markerY: Math.random() * 80 + 10,
        createdAt: Date.now() - i * 3600000 - j * 600000
      };

      await db.reviews.insert(review);
    }

    const averageRating = totalRating / reviewCount;
    const compositeScore = (averageRating * reviewCount) / 100;

    await db.photos.update(
      { _id: insertedPhoto._id },
      { $set: { averageRating, reviewCount, compositeScore } }
    );
  }

  console.log('模拟数据初始化完成！');
}

async function updatePhotoRating(photoId: string) {
  const reviews = await db.reviews.find({ photoId });
  const reviewCount = reviews.length;
  const averageRating = reviewCount > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
    : 0;
  const compositeScore = (averageRating * reviewCount) / 100;

  await db.photos.update(
    { _id: photoId },
    { $set: { averageRating, reviewCount, compositeScore } },
    { returnUpdatedDocs: true }
  );
}

app.get('/api/photos', async (req: Request, res: Response) => {
  await simulateDelay();

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const category = req.query.category as string;
  const minRating = parseFloat(req.query.minRating as string) || 0;
  const sortBy = req.query.sortBy as string || 'newest';

  const query: any = {};
  if (category && category !== 'all') {
    query.category = category;
  }
  if (minRating > 0) {
    query.averageRating = { $gte: minRating };
  }

  let sortQuery: any = {};
  switch (sortBy) {
    case 'newest':
      sortQuery = { createdAt: -1 };
      break;
    case 'hottest':
      sortQuery = { compositeScore: -1 };
      break;
    case 'topRated':
      sortQuery = { averageRating: -1 };
      break;
    default:
      sortQuery = { createdAt: -1 };
  }

  const skip = (page - 1) * limit;

  try {
    const total = await db.photos.count(query);
    const photos = await db.photos
      .find(query)
      .sort(sortQuery)
      .skip(skip)
      .limit(limit);

    res.json({
      photos,
      total,
      hasMore: skip + photos.length < total
    });
  } catch (error) {
    res.status(500).json({ error: '获取作品列表失败' });
  }
});

app.get('/api/photos/:id', async (req: Request, res: Response) => {
  await simulateDelay();

  const { id } = req.params;

  try {
    const photo = await db.photos.findOne({ _id: id });
    if (!photo) {
      return res.status(404).json({ error: '作品不存在' });
    }

    const reviews = await db.reviews
      .find({ photoId: id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ photo, reviews });
  } catch (error) {
    res.status(500).json({ error: '获取作品详情失败' });
  }
});

app.post('/api/photos', async (req: Request, res: Response) => {
  try {
    const { title, category, description, imageBase64, author, authorAvatar } = req.body;

    if (!title || !category || !imageBase64) {
      return res.status(400).json({ error: '缺少必要字段' });
    }

    if (title.length > 30) {
      return res.status(400).json({ error: '标题不能超过30字' });
    }

    const photo: Photo = {
      _id: uuidv4(),
      title,
      category,
      description: description || '',
      imageBase64,
      author: author || '匿名用户',
      authorAvatar: authorAvatar || sampleAvatars[0],
      createdAt: Date.now(),
      averageRating: 0,
      reviewCount: 0,
      compositeScore: 0
    };

    const insertedPhoto = await db.photos.insert(photo);

    res.json({
      success: true,
      photo: insertedPhoto
    });
  } catch (error) {
    res.status(500).json({ error: '上传作品失败' });
  }
});

app.put('/api/photos/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { averageRating, reviewCount, compositeScore } = req.body;

    const updated = await db.photos.update(
      { _id: id },
      { $set: { averageRating, reviewCount, compositeScore } },
      { returnUpdatedDocs: true }
    );

    res.json({ success: true, photo: updated });
  } catch (error) {
    res.status(500).json({ error: '更新作品失败' });
  }
});

app.get('/api/photos/:id/reviews', async (req: Request, res: Response) => {
  await simulateDelay();

  const { id } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  try {
    const total = await db.reviews.count({ photoId: id });
    const reviews = await db.reviews
      .find({ photoId: id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({ reviews, total });
  } catch (error) {
    res.status(500).json({ error: '获取点评列表失败' });
  }
});

app.post('/api/reviews', async (req: Request, res: Response) => {
  try {
    const { photoId, reviewer, reviewerAvatar, content, rating, markerX, markerY } = req.body;

    if (!photoId || !content || !rating) {
      return res.status(400).json({ error: '缺少必要字段' });
    }

    if (content.length > 200) {
      return res.status(400).json({ error: '点评内容不能超过200字' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: '评分必须在1-5之间' });
    }

    const review: Review = {
      _id: uuidv4(),
      photoId,
      reviewer: reviewer || '匿名用户',
      reviewerAvatar: reviewerAvatar || sampleAvatars[0],
      content,
      rating,
      markerX: markerX || 50,
      markerY: markerY || 50,
      createdAt: Date.now()
    };

    const insertedReview = await db.reviews.insert(review);
    await updatePhotoRating(photoId);

    const updatedPhoto = await db.photos.findOne({ _id: photoId });

    res.json({
      success: true,
      review: insertedReview,
      photo: updatedPhoto
    });
  } catch (error) {
    res.status(500).json({ error: '提交点评失败' });
  }
});

app.get('/api/hot', async (req: Request, res: Response) => {
  await simulateDelay();

  try {
    const photos = await db.photos
      .find({})
      .sort({ compositeScore: -1 })
      .limit(10);

    res.json({ photos });
  } catch (error) {
    res.status(500).json({ error: '获取热门榜单失败' });
  }
});

app.get('/api/categories', (_req: Request, res: Response) => {
  res.json({
    categories: [
      { id: 'all', name: '全部', color: '#ffffff' },
      { id: 'portrait', name: '人像', color: '#f9a8d4' },
      { id: 'landscape', name: '风光', color: '#6ee7b7' },
      { id: 'street', name: '街拍', color: '#fcd34d' },
      { id: 'still', name: '静物', color: '#c4b5fd' }
    ]
  });
});

initMockData().then(() => {
  app.listen(PORT, () => {
    console.log(`Spotlight 后端服务运行在 http://localhost:${PORT}`);
  });
});
