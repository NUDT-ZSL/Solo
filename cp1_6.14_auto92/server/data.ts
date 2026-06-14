import type { Pet, AdoptionApplication, PetStatus } from '../src/types';

const generateId = () => Math.random().toString(36).substring(2, 10);

const placeholderPhotos = [
  'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1558788353-f76d92427f16?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400&h=400&fit=crop',
];

export const breeds = ['金毛寻回犬', '拉布拉多', '哈士奇', '柯基', '比熊', '泰迪', '中华田园犬', '布偶猫', '英短', '美短', '橘猫', '狸花猫'];

const petNames = ['豆豆', '旺财', '小白', '花花', '毛毛', '小黑', '团子', '布丁', '奶茶', '可乐', '薯条', '饼干', '雪球', '汤圆', '麻薯', '年糕'];

export const pets: Pet[] = Array.from({ length: 28 }, (_, i) => {
  const statuses: PetStatus[] = ['pending', 'reviewing', 'adopted'];
  const status = statuses[i % 3];
  const photos = [placeholderPhotos[i % placeholderPhotos.length]];
  if (i % 2 === 0) photos.push(placeholderPhotos[(i + 2) % placeholderPhotos.length]);
  if (i % 3 === 0) photos.push(placeholderPhotos[(i + 4) % placeholderPhotos.length]);

  return {
    id: generateId(),
    name: petNames[i % petNames.length],
    breed: breeds[i % breeds.length],
    age: (i % 8) + 1,
    description: `这是${petNames[i % petNames.length]}，一只性格${['温顺', '活泼', '安静', '粘人', '独立'][i % 5]}的小宝贝。它非常喜欢和人互动，特别适合作为家庭伴侣。已经完成基础训练，会听从简单指令。`,
    healthNotes: i % 3 === 0 ? '已完成全部疫苗接种，定期驱虫，身体健康。' : undefined,
    photos,
    status,
    createdAt: new Date(Date.now() - i * 86400000).toISOString(),
    adoptionHistory: status !== 'pending' ? [
      {
        id: generateId(),
        applicantName: ['张先生', '李女士', '王先生', '赵女士', '陈先生'][i % 5],
        date: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
        status,
        notes: '申请人家庭环境良好，有养宠经验。',
      },
    ] : [],
  };
});

export const applications: AdoptionApplication[] = pets
  .filter((p) => p.status !== 'adopted' || Math.random() > 0.5)
  .map((pet, i) => ({
    id: generateId(),
    petId: pet.id,
    petName: pet.name,
    applicantName: ['张先生', '李女士', '王先生', '赵女士', '陈先生', '刘女士'][i % 6],
    applicationDate: new Date(Date.now() - i * 2 * 86400000).toISOString(),
    status: pet.status,
  }));
