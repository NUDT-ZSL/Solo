export interface Book {
  id: number;
  title: string;
  author: string;
  category: '科幻' | '推理' | '绘本';
  tags: string[];
  coverColor: string;
  borrowCount: number;
}

export interface BorrowRecord {
  date: string;
  bookId: number;
  category: string;
  borrowCount: number;
  reservationCount: number;
}

export interface MonthlyCategoryData {
  month: string;
  科幻: number;
  推理: number;
  绘本: number;
}

export interface DailyHeatData {
  date: string;
  borrowCount: number;
  reservationCount: number;
  isExhibitionDay?: boolean;
}

export interface Exhibition {
  id: number;
  name: string;
  theme: string;
  startDate: string;
  endDate: string;
  color: string;
  books: Book[];
}

export const CATEGORY_COLORS: Record<string, string> = {
  '科幻': '#8E44AD',
  '推理': '#E74C3C',
  '绘本': '#F39C12',
};

const BOOK_TITLES = [
  { title: '海底两万里', author: '儒勒·凡尔纳', category: '科幻' as const, tags: ['深海', '探险', '经典', '潜艇'] },
  { title: '三体', author: '刘慈欣', category: '科幻' as const, tags: ['宇宙', '科幻', '地球', '文明'] },
  { title: '流浪地球', author: '刘慈欣', category: '科幻' as const, tags: ['宇宙', '地球', '科幻', '生存'] },
  { title: '深渊上的火', author: '弗诺·文奇', category: '科幻' as const, tags: ['宇宙', '文明', '科幻', '深空'] },
  { title: '深海', author: '大卫·沙尔', category: '科幻' as const, tags: ['深海', '探险', '科幻', '生物'] },
  { title: '神秘岛', author: '儒勒·凡尔纳', category: '科幻' as const, tags: ['海岛', '探险', '生存', '经典'] },
  { title: '地心游记', author: '儒勒·凡尔纳', category: '科幻' as const, tags: ['地心', '探险', '经典', '地质'] },
  { title: '从地球到月球', author: '儒勒·凡尔纳', category: '科幻' as const, tags: ['宇宙', '月球', '探险', '经典'] },

  { title: '东方快车谋杀案', author: '阿加莎·克里斯蒂', category: '推理' as const, tags: ['侦探', '经典', '密室', '火车'] },
  { title: '无人生还', author: '阿加莎·克里斯蒂', category: '推理' as const, tags: ['侦探', '经典', '孤岛', '悬疑'] },
  { title: '白夜行', author: '东野圭吾', category: '推理' as const, tags: ['悬疑', '社会', '日本', '推理'] },
  { title: '嫌疑人X的献身', author: '东野圭吾', category: '推理' as const, tags: ['侦探', '数学', '推理', '日本'] },
  { title: '解忧杂货店', author: '东野圭吾', category: '推理' as const, tags: ['治愈', '温情', '日本', '穿越'] },
  { title: '福尔摩斯探案集', author: '柯南·道尔', category: '推理' as const, tags: ['侦探', '经典', '英国', '推理'] },
  { title: '达·芬奇密码', author: '丹·布朗', category: '推理' as const, tags: ['悬疑', '宗教', '密码', '探险'] },
  { title: '消失的爱人', author: '吉莉安·弗琳', category: '推理' as const, tags: ['悬疑', '心理', '婚姻', '惊悚'] },

  { title: '海底的秘密', author: '大卫·威斯纳', category: '绘本' as const, tags: ['深海', '冒险', '图画书', '儿童'] },
  { title: '小黑鱼', author: '李欧·李奥尼', category: '绘本' as const, tags: ['海洋', '成长', '友情', '图画书'] },
  { title: '海底100层的房子', author: '岩井俊雄', category: '绘本' as const, tags: ['深海', '探险', '儿童', '创意'] },
  { title: '海马先生', author: '艾瑞·卡尔', category: '绘本' as const, tags: ['海洋', '自然', '儿童', '图画书'] },
  { title: '生气汤', author: '贝西·艾芙瑞', category: '绘本' as const, tags: ['情绪', '成长', '儿童', '家庭'] },
  { title: '猜猜我有多爱你', author: '山姆·麦克布雷尼', category: '绘本' as const, tags: ['亲情', '成长', '儿童', '经典'] },
  { title: '好饿的毛毛虫', author: '艾瑞·卡尔', category: '绘本' as const, tags: ['成长', '自然', '儿童', '经典'] },
  { title: '大卫不可以', author: '大卫·香农', category: '绘本' as const, tags: ['成长', '家庭', '儿童', '教育'] },
  { title: '我爸爸', author: '安东尼·布朗', category: '绘本' as const, tags: ['亲情', '成长', '儿童', '家庭'] },
  { title: '不一样的卡梅拉', author: '克利斯提昂·约里波瓦', category: '绘本' as const, tags: ['冒险', '成长', '儿童', '友情'] },
  { title: '爷爷一定有办法', author: '菲比·吉尔曼', category: '绘本' as const, tags: ['亲情', '智慧', '儿童', '经典'] },
  { title: '鳄鱼怕怕牙医怕怕', author: '五味太郎', category: '绘本' as const, tags: ['幽默', '成长', '儿童', '健康'] },
];

const GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  'linear-gradient(135deg, #5ee7df 0%, #b490ca 100%)',
  'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
  'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
  'linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)',
];

export function generateBooks(): Book[] {
  return BOOK_TITLES.map((book, index) => ({
    id: index + 1,
    title: book.title,
    author: book.author,
    category: book.category,
    tags: book.tags,
    coverColor: GRADIENTS[index % GRADIENTS.length],
    borrowCount: Math.floor(Math.random() * 200) + 50,
  }));
}

export const books: Book[] = generateBooks();

export function generateMonthlyData(months: string[]): MonthlyCategoryData[] {
  return months.map(month => ({
    month,
    '科幻': Math.floor(Math.random() * 300) + 200,
    '推理': Math.floor(Math.random() * 400) + 300,
    '绘本': Math.floor(Math.random() * 500) + 400,
  }));
}

export function parseBorrowCSV(csvContent: string): BorrowRecord[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const records: BorrowRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const record: Record<string, string> = {};
    headers.forEach((header, idx) => {
      record[header] = values[idx] || '';
    });

    records.push({
      date: record['date'] || record['日期'] || '',
      bookId: parseInt(record['bookId'] || record['书籍ID'] || '0'),
      category: record['category'] || record['分类'] || '',
      borrowCount: parseInt(record['borrowCount'] || record['借阅次数'] || '0'),
      reservationCount: parseInt(record['reservationCount'] || record['预约数'] || '0'),
    });
  }

  return records;
}

export function calculateCategoryStats(records: BorrowRecord[]): Record<string, number> {
  const stats: Record<string, number> = {};

  records.forEach(record => {
    if (!stats[record.category]) {
      stats[record.category] = 0;
    }
    stats[record.category] += record.borrowCount;
  });

  return stats;
}

export function matchBooksByTheme(theme: string, allBooks: Book[]): Book[] {
  const themeKeywords = theme.toLowerCase().split(/\s+/).filter(Boolean);

  const scoredBooks = allBooks.map(book => {
    let score = 0;

    themeKeywords.forEach(keyword => {
      if (book.title.toLowerCase().includes(keyword)) {
        score += 10;
      }
      book.tags.forEach(tag => {
        if (tag.toLowerCase().includes(keyword) || keyword.includes(tag.toLowerCase())) {
          score += 5;
        }
      });
      if (book.category.toLowerCase().includes(keyword)) {
        score += 3;
      }
    });

    score += book.borrowCount / 100;

    return { book, score };
  });

  scoredBooks.sort((a, b) => b.score - a.score);

  return scoredBooks.filter(sb => sb.score > 0).slice(0, 20).map(sb => sb.book);
}

export function generateDailyHeatData(exhibitionDate: string): DailyHeatData[] {
  const data: DailyHeatData[] = [];
  const baseDate = new Date(exhibitionDate);

  for (let i = -7; i <= 7; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    const isExhibitionWeek = i >= 0 && i <= 6;
    const baseBorrow = isExhibitionWeek ? 120 : 80;
    const baseReservation = isExhibitionWeek ? 30 : 15;

    data.push({
      date: dateStr,
      borrowCount: Math.floor(baseBorrow + Math.random() * 50 - 20),
      reservationCount: Math.floor(baseReservation + Math.random() * 20 - 5),
      isExhibitionDay: i >= 0 && i <= 6,
    });
  }

  return data;
}

export function getTopThreeDays(data: DailyHeatData[]): DailyHeatData[] {
  return [...data]
    .sort((a, b) => (b.borrowCount + b.reservationCount) - (a.borrowCount + a.reservationCount))
    .slice(0, 3);
}

export const themeColorMap: Record<string, string> = {
  '深海': '#1ABC9C',
  '宇宙': '#8E44AD',
  '侦探': '#E74C3C',
  '绘本': '#F39C12',
  '经典': '#3498DB',
  '成长': '#2ECC71',
  '悬疑': '#9B59B6',
  '冒险': '#E67E22',
  '自然': '#27AE60',
  '科幻': '#34495E',
};

export function getThemeColor(theme: string): string {
  const themeLower = theme.toLowerCase();
  for (const key of Object.keys(themeColorMap)) {
    if (themeLower.includes(key)) {
      return themeColorMap[key];
    }
  }
  return '#4A90D9';
}
