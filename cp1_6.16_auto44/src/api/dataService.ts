export type AuthorizationType = 'exclusive' | 'non-exclusive' | 'buyout';

export interface AuthorizationRecord {
  id: string;
  licensee: string;
  date: string;
  fee: number;
}

export interface PortfolioItem {
  id: string;
  title: string;
  imageUrl: string;
  shotDate: string;
  authorizationType: AuthorizationType;
  authorizations: AuthorizationRecord[];
  createdAt: string;
  pricingSuggestion?: PricingSuggestion;
}

export type CommunicationStatus = 'initial' | 'quoting' | 'negotiating' | 'signed' | 'rejected';

export interface CommunicationLog {
  id: string;
  content: string;
  status: CommunicationStatus;
  timestamp: string;
}

export interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  logs: CommunicationLog[];
}

export interface PricingSuggestion {
  min: number;
  max: number;
  median: number;
  sampleCount: number;
  breakdown: {
    type: AuthorizationType;
    count: number;
    medianFee: number;
  }[];
}

export interface MockData {
  portfolio: PortfolioItem[];
  clients: Client[];
}

const sampleImages = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600',
  'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=600',
  'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600',
  'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=600',
  'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=600',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600',
  'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=600',
];

const clientNames = [
  { name: '张晓明', company: '创意广告有限公司' },
  { name: '李雨晴', company: '时尚杂志集团' },
  { name: '王建国', company: '环球旅游出版社' },
  { name: '陈美玲', company: '品牌设计工作室' },
  { name: '刘志强', company: '电商平台科技公司' },
];

const statusColors: Record<CommunicationStatus, string> = {
  initial: '#95A5A6',
  quoting: '#F39C12',
  negotiating: '#3498DB',
  signed: '#2ECC71',
  rejected: '#E74C3C',
};

const statusLabels: Record<CommunicationStatus, string> = {
  initial: '初次联系',
  quoting: '报价中',
  negotiating: '洽谈中',
  signed: '已签约',
  rejected: '已拒绝',
};

const authorizationLabels: Record<AuthorizationType, string> = {
  exclusive: '独家',
  'non-exclusive': '非独家',
  buyout: '买断',
};

export function generateMockData(): MockData {
  const clients: Client[] = clientNames.map((c, index) => ({
    id: `client-${index + 1}`,
    name: c.name,
    company: c.company,
    email: `${c.name.toLowerCase().replace(/\s/g, '')}@${c.company.toLowerCase().replace(/\s/g, '')}.com`,
    phone: `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
    logs: generateMockLogs(),
  }));

  const portfolio: PortfolioItem[] = sampleImages.map((img, index) => {
    const type: AuthorizationType = ['exclusive', 'non-exclusive', 'buyout'][index % 3] as AuthorizationType;
    const authorizations: AuthorizationRecord[] = [];

    if (index % 2 === 0) {
      const authCount = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < authCount; i++) {
        const client = clients[Math.floor(Math.random() * clients.length)];
        authorizations.push({
          id: `auth-${index}-${i}`,
          licensee: client.company,
          date: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
          fee: Math.floor(Math.random() * 8000) + 2000,
        });
      }
    }

    return {
      id: `portfolio-${index + 1}`,
      title: `作品 ${index + 1} - ${['自然风光', '城市建筑', '人像写真', '商业产品', '艺术创作'][index % 5]}`,
      imageUrl: img,
      shotDate: new Date(2023 + Math.floor(index / 6), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
      authorizationType: type,
      authorizations,
      createdAt: new Date().toISOString(),
    };
  });

  return { portfolio, clients };
}

function generateMockLogs(): CommunicationLog[] {
  const logs: CommunicationLog[] = [];
  const logCount = Math.floor(Math.random() * 5) + 2;
  const contents = [
    '客户对风景摄影系列表示浓厚兴趣，询问独家授权价格',
    '已发送报价单，包含三套授权方案',
    '客户希望能够协商价格，希望获得批量折扣',
    '双方已达成初步意向，正在拟定合同细节',
    '合同已签署，首付款已到账',
    '客户反馈预算有限，决定暂时搁置',
    '发送了样片和作品集链接供客户参考',
    '确认了拍摄时间和地点安排',
  ];

  for (let i = 0; i < logCount; i++) {
    const statuses: CommunicationStatus[] = ['initial', 'quoting', 'negotiating', 'signed', 'rejected'];
    logs.push({
      id: `log-${Date.now()}-${i}`,
      content: contents[Math.floor(Math.random() * contents.length)],
      status: statuses[Math.min(i, 4)],
      timestamp: new Date(Date.now() - i * 86400000 * 7).toISOString(),
    });
  }

  return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function calculatePricingRange(itemId: string, portfolio: PortfolioItem[]): PricingSuggestion {
  const currentItem = portfolio.find(p => p.id === itemId);
  if (!currentItem) {
    return { min: 0, max: 0, median: 0, sampleCount: 0, breakdown: [] };
  }

  const sameTypeItems = portfolio.filter(
    p => p.authorizationType === currentItem.authorizationType && p.id !== itemId && p.authorizations.length > 0
  );

  const allFees: number[] = [];
  const breakdown: PricingSuggestion['breakdown'] = [];

  const types: AuthorizationType[] = ['exclusive', 'non-exclusive', 'buyout'];
  for (const type of types) {
    const items = portfolio.filter(p => p.authorizationType === type && p.authorizations.length > 0);
    const fees = items.flatMap(i => i.authorizations.map(a => a.fee));
    if (fees.length > 0) {
      const sorted = [...fees].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      breakdown.push({ type, count: fees.length, medianFee: median });
    }
  }

  sameTypeItems.forEach(item => {
    item.authorizations.forEach(auth => {
      allFees.push(auth.fee);
    });
  });

  currentItem.authorizations.forEach(auth => {
    allFees.push(auth.fee);
  });

  if (allFees.length === 0) {
    const basePrices: Record<AuthorizationType, number> = {
      exclusive: 8000,
      'non-exclusive': 3000,
      buyout: 15000,
    };
    const base = basePrices[currentItem.authorizationType];
    return {
      min: Math.round(base * 0.8),
      max: Math.round(base * 1.2),
      median: base,
      sampleCount: 0,
      breakdown,
    };
  }

  const sortedFees = [...allFees].sort((a, b) => a - b);
  const median = sortedFees[Math.floor(sortedFees.length / 2)];
  const stdDev = Math.sqrt(
    sortedFees.reduce((sum, fee) => sum + Math.pow(fee - median, 2), 0) / sortedFees.length
  );

  return {
    min: Math.round(Math.max(median - stdDev * 0.5, sortedFees[0])),
    max: Math.round(median + stdDev * 0.5),
    median,
    sampleCount: sortedFees.length,
    breakdown,
  };
}

export async function fetchPortfolio(): Promise<PortfolioItem[]> {
  const response = await fetch('/api/portfolio');
  if (!response.ok) throw new Error('获取作品集失败');
  return response.json();
}

export async function createPortfolioItem(data: Omit<PortfolioItem, 'id' | 'createdAt' | 'authorizations'>): Promise<PortfolioItem> {
  const response = await fetch('/api/portfolio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('创建作品失败');
  return response.json();
}

export async function updatePortfolioItem(id: string, data: Partial<PortfolioItem>): Promise<PortfolioItem> {
  const response = await fetch(`/api/portfolio/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('更新作品失败');
  return response.json();
}

export async function fetchClients(): Promise<Client[]> {
  const response = await fetch('/api/clients');
  if (!response.ok) throw new Error('获取客户列表失败');
  return response.json();
}

export async function addClientLog(clientId: string, data: Omit<CommunicationLog, 'id' | 'timestamp'>): Promise<CommunicationLog> {
  const response = await fetch(`/api/clients/${clientId}/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('添加日志失败');
  return response.json();
}

export { statusColors, statusLabels, authorizationLabels };
