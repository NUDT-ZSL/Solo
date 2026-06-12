import Datastore from 'nedb-promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.join(__dirname, '..', '..', 'data')

export const exhibitionsDb = Datastore.create({
  filename: path.join(dbPath, 'exhibitions.db'),
  autoload: true
})

export const feedbacksDb = Datastore.create({
  filename: path.join(dbPath, 'feedbacks.db'),
  autoload: true
})

export async function initDb() {
  const count = await exhibitionsDb.count({})
  if (count === 0) {
    const sampleExhibitions = [
      {
        id: 'exh-001',
        name: '当代艺术展：光影之间',
        startDate: '2025-01-15',
        endDate: '2025-03-20',
        status: 'upcoming',
        zones: ['主展厅', '光影走廊', '互动空间'],
        artworks: [
          {
            id: 'art-001',
            name: '晨曦',
            artist: '李明',
            year: 2024,
            material: '布面油画',
            size: '120 x 150 cm',
            description: '这幅作品描绘了清晨第一缕阳光穿透云层的瞬间，光影交错间展现出大自然的神秘与美丽。',
            zone: '主展厅',
            image: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=400&fit=crop'
          },
          {
            id: 'art-002',
            name: '城市记忆',
            artist: '张华',
            year: 2023,
            material: '综合材料',
            size: '80 x 100 cm',
            description: '通过碎片式的城市影像，探讨现代都市人的记忆与归属感。',
            zone: '主展厅',
            image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&h=400&fit=crop'
          },
          {
            id: 'art-003',
            name: '流动的时间',
            artist: '王芳',
            year: 2024,
            material: '视频装置',
            size: '可变尺寸',
            description: '利用光影和水流效果，呈现时间流逝的视觉表达。',
            zone: '光影走廊',
            image: 'https://images.unsplash.com/photo-1549490349-8643362247b5?w=400&h=400&fit=crop'
          },
          {
            id: 'art-004',
            name: '镜中自我',
            artist: '陈静',
            year: 2023,
            material: '镜面装置',
            size: '200 x 200 cm',
            description: '观众可以通过镜面互动，体验自我认知的多重视角。',
            zone: '互动空间',
            image: 'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=400&h=400&fit=crop'
          },
          {
            id: 'art-005',
            name: '静谧',
            artist: '刘洋',
            year: 2024,
            material: '水墨画',
            size: '60 x 90 cm',
            description: '以极简的笔触描绘山水之间的宁静意境。',
            zone: '主展厅',
            image: 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=400&h=400&fit=crop'
          },
          {
            id: 'art-006',
            name: '数字花园',
            artist: '赵伟',
            year: 2024,
            material: '数字艺术',
            size: '投影尺寸可变',
            description: '基于算法生成的虚拟花园，随观众互动而变化。',
            zone: '互动空间',
            image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop'
          }
        ],
        createdAt: new Date().toISOString()
      },
      {
        id: 'exh-002',
        name: '东方美学：传统与现代',
        startDate: '2024-11-01',
        endDate: '2024-12-31',
        status: 'ongoing',
        zones: ['书法区', '绘画区', '工艺区'],
        artworks: [
          {
            id: 'art-011',
            name: '行云流水',
            artist: '孙老师',
            year: 2023,
            material: '宣纸、墨',
            size: '180 x 60 cm',
            description: '草书作品，展现东方书法的韵律之美。',
            zone: '书法区',
            image: 'https://images.unsplash.com/photo-1609234656388-0ff363383899?w=400&h=400&fit=crop'
          },
          {
            id: 'art-012',
            name: '山水意境',
            artist: '周明',
            year: 2024,
            material: '绢本设色',
            size: '150 x 80 cm',
            description: '传统青绿山水画，融合现代构图理念。',
            zone: '绘画区',
            image: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=400&fit=crop'
          },
          {
            id: 'art-013',
            name: '青花瓷韵',
            artist: '吴师傅',
            year: 2023,
            material: '陶瓷',
            size: '高45cm',
            description: '传统青花工艺与现代造型的完美结合。',
            zone: '工艺区',
            image: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=400&h=400&fit=crop'
          }
        ],
        createdAt: new Date().toISOString()
      },
      {
        id: 'exh-003',
        name: '青年艺术家联展',
        startDate: '2024-06-01',
        endDate: '2024-08-31',
        status: 'ended',
        zones: ['A展厅', 'B展厅'],
        artworks: [
          {
            id: 'art-021',
            name: '都市印象',
            artist: '新锐艺术家',
            year: 2023,
            material: '数码绘画',
            size: '100 x 70 cm',
            description: '年轻艺术家眼中的都市生活。',
            zone: 'A展厅',
            image: 'https://images.unsplash.com/photo-1549887534-1541e9326642?w=400&h=400&fit=crop'
          }
        ],
        createdAt: new Date().toISOString()
      }
    ]

    await exhibitionsDb.insert(sampleExhibitions)
    console.log('Sample exhibitions inserted')
  }
}
