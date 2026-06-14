import jsPDF from 'jspdf';
import type { TravelPlan, DayPlan, Spot } from './types';

const HEADER_HEIGHT = 20;
const CONTENT_START = 30;
const LINE_HEIGHT = 8;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 20;
const USER_NICKNAME = '旅行者';

const destinationTips: Record<string, { icon: string; title: string; desc: string }[]> = {
  '京都': [
    { icon: '🎫', title: '寺庙门票', desc: '京都多数寺庙需购票入内，建议购买联合门票更划算' },
    { icon: '👘', title: '和服体验', desc: '祗园一带有众多和服租赁店，提前预约可享受优惠' },
    { icon: '🚃', title: '交通卡券', desc: '购买京都巴士一日券（700日元），单次230日元，3次即回本' },
    { icon: '🌸', title: '赏花时节', desc: '樱花季3月下旬-4月中旬，红叶季11月中旬-12月初为最佳' },
    { icon: '🍵', title: '茶道体验', desc: '宇治抹茶发源地，推荐体验正统茶道仪式' },
    { icon: '⛩', title: '神社礼仪', desc: '入鸟居前鞠躬，参道走两侧，中央是神明通道' },
    { icon: '🍜', title: '美食时段', desc: '热门餐厅午餐11:30前到达，晚餐17:30前可避开排队' },
    { icon: '📸', title: '拍照礼仪', desc: '部分寺庙内部禁止拍照，注意标识，尊重规定' },
    { icon: '☔', title: '雨天准备', desc: '京都多雨，随身携带折叠伞，雨中的寺庙别有韵味' },
    { icon: '🏠', title: '住宿推荐', desc: '体验传统町家旅馆或温泉旅馆，感受日式待客之道' },
  ],
  '东京': [
    { icon: '🚅', title: '交通出行', desc: '购买Suica/Pasmo交通卡，地铁出行最便捷，避开早晚高峰' },
    { icon: '🍣', title: '寿司攻略', desc: '筑地外市场清晨最鲜，高档寿司需提前1个月预约' },
    { icon: '🗼', title: '观景选择', desc: '东京塔、晴空塔、都厅展望室（免费）各有特色' },
    { icon: '🛍', title: '购物退税', desc: '单店消费满5000日元可退税，带护照即可办理' },
    { icon: '🍜', title: '拉面排队', desc: '名店高峰等位1小时+，建议避开12-13点午餐高峰' },
    { icon: '🎮', title: '秋叶原', desc: '电器店可免税，手办动漫商品比价后再购买' },
    { icon: '🌸', title: '赏花名所', desc: '上野公园、新宿御苑、目黑川为东京三大赏樱地' },
    { icon: '💴', title: '现金准备', desc: '部分小店和传统餐厅只收现金，随身携带2-3万日元' },
    { icon: '🌐', title: '网络通讯', desc: '机场租WiFi蛋或购买SIM卡，保证导航和翻译畅通' },
    { icon: '🎭', title: '文化体验', desc: '国立博物馆周一闭馆，歌舞伎座有单幕票可体验' },
  ],
  '大阪': [
    { icon: '🍢', title: '美食之都', desc: '道顿堀是大阪美食中心，章鱼烧、大阪烧、串炸必尝' },
    { icon: '🚃', title: '交通卡券', desc: '大阪周游卡含交通+景点门票，1日/2日券超值' },
    { icon: '🏯', title: '大阪城', desc: '天守阁内有电梯，顶层观景台俯瞰大阪全景' },
    { icon: '🎢', title: '环球影城', desc: '购买快速通行券节省排队时间，工作日人少体验更佳' },
    { icon: '🦀', title: '蟹道乐', desc: '道顿堀本店需提前预约，套餐比单点更划算' },
    { icon: '🛒', title: '心斋桥', desc: '购物街长达600米，药妆店比价后再购买' },
    { icon: '🌃', title: '夜景推荐', desc: '梅田蓝天大厦空中庭园，360度无遮挡观夜景' },
    { icon: '🍜', title: '黑门市场', desc: '海鲜现买现吃，上午10点前最新鲜，下午价格更优' },
    { icon: '🎭', title: '搞笑文化', desc: '大阪是喜剧之都，可体验吉本新喜剧的现场演出' },
    { icon: '💰', title: '消费水平', desc: '大阪物价比东京低10-20%，是性价比较高的旅行地' },
  ],
};

const defaultTips: { icon: string; title: string; desc: string }[] = [
  { icon: '🎫', title: '提前预订', desc: '热门景点门票、特色餐厅建议提前1-2周预订，避免当日排长队或售罄' },
  { icon: '🌤', title: '天气查询', desc: '出发前查看目的地7天天气预报，准备合适的衣物和雨具' },
  { icon: '🗺', title: '离线地图', desc: '下载 Google Maps 或当地地图的离线包，无网络也能导航' },
  { icon: '💊', title: '健康准备', desc: '常备药品（感冒药、肠胃药、创可贴），注意饮食卫生，喝瓶装水' },
  { icon: '🔒', title: '安全第一', desc: '保管好护照、钱包等贵重物品，出行购买旅行保险' },
  { icon: '🎎', title: '文化尊重', desc: '了解当地风俗习惯、宗教禁忌，做有礼貌的旅行者' },
  { icon: '📱', title: '行程备份', desc: '将本PDF保存到云端和手机本地，以防手机没电或丢失' },
  { icon: '⏰', title: '弹性时间', desc: '每个景点预留15-30分钟弹性时间，应对交通延误或突发情况' },
  { icon: '💳', title: '支付方式', desc: '准备当地货币现金+国际信用卡+移动支付（如适用）' },
  { icon: '🚌', title: '交通研究', desc: '了解目的地的公共交通（地铁/巴士/出租车），购买交通卡更划算' },
];

function addText(doc: jsPDF, text: string, x: number, y: number, options?: {
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  color?: string;
  align?: 'left' | 'center' | 'right';
}) {
  const { fontSize = 12, fontWeight = 'normal', color = '#2d3436', align = 'left' } = options || {};
  doc.setFontSize(fontSize);
  doc.setFont('helvetica', fontWeight);
  doc.setTextColor(color);
  doc.text(text, x, y, { align });
}

function addCoverPage(doc: jsPDF, plan: TravelPlan, nickname?: string) {
  const displayName = nickname || USER_NICKNAME;
  const centerX = PAGE_WIDTH / 2;
  const centerY = PAGE_HEIGHT / 2;
  const actualDays = plan.dailyPlans.length;

  doc.setFillColor('#faf8f5');
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');

  doc.setDrawColor('#e85d3a');
  doc.setLineWidth(1.5);
  doc.line(MARGIN, centerY - 90, PAGE_WIDTH - MARGIN, centerY - 90);
  doc.line(MARGIN, centerY + 100, PAGE_WIDTH - MARGIN, centerY + 100);

  doc.setFillColor('#e85d3a');
  doc.roundedRect(centerX - 50, centerY - 75, 100, 4, 2, 2, 'F');

  addText(doc, plan.destination, centerX, centerY - 45, {
    fontSize: 52,
    fontWeight: 'bold',
    color: '#2d3436',
    align: 'center',
  });

  addText(doc, `${actualDays} 天旅行计划`, centerX, centerY - 10, {
    fontSize: 26,
    fontWeight: 'normal',
    color: '#e85d3a',
    align: 'center',
  });

  const preferencesText = plan.preferences.join(' · ');
  addText(doc, preferencesText, centerX, centerY + 15, {
    fontSize: 13,
    fontWeight: 'normal',
    color: '#555',
    align: 'center',
  });

  addText(doc, `预算等级: ${plan.budget}`, centerX, centerY + 32, {
    fontSize: 13,
    fontWeight: 'normal',
    color: '#666',
    align: 'center',
  });

  addText(doc, `共计 ${plan.dailyPlans.length} 天行程 · ${plan.dailyPlans.reduce((sum, d) => sum + d.spots.length, 0)} 个景点`, centerX, centerY + 48, {
    fontSize: 11,
    fontWeight: 'normal',
    color: '#888',
    align: 'center',
  });

  doc.setFillColor('#2d3436');
  doc.roundedRect(centerX - 35, centerY + 68, 70, 30, 4, 4, 'F');
  addText(doc, displayName, centerX, centerY + 80, {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    align: 'center',
  });
  addText(doc, '的专属行程', centerX, centerY + 90, {
    fontSize: 10,
    fontWeight: 'normal',
    color: '#cccccc',
    align: 'center',
  });

  const date = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  addText(doc, `生成日期: ${date}`, centerX, PAGE_HEIGHT - MARGIN, {
    fontSize: 10,
    fontWeight: 'normal',
    color: '#999',
    align: 'center',
  });
}

function addDayPage(doc: jsPDF, dayPlan: DayPlan, plan: TravelPlan) {
  doc.addPage();

  doc.setFillColor('#faf8f5');
  doc.rect(0, 0, PAGE_WIDTH, HEADER_HEIGHT, 'F');

  doc.setFillColor('#e85d3a');
  doc.rect(0, HEADER_HEIGHT - 2, PAGE_WIDTH, 2, 'F');

  addText(doc, `第 ${dayPlan.date} 天`, MARGIN, 15, {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d3436',
  });

  addText(doc, plan.destination, PAGE_WIDTH - MARGIN, 15, {
    fontSize: 12,
    fontWeight: 'normal',
    color: '#e85d3a',
    align: 'right',
  });

  let y = CONTENT_START;

  addText(doc, '📅 今日行程', MARGIN, y, {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2d3436',
  });
  y += LINE_HEIGHT + 6;

  dayPlan.spots.forEach((spot: Spot, index: number) => {
    if (y > PAGE_HEIGHT - 50) {
      doc.addPage();
      y = CONTENT_START;
    }

    doc.setFillColor('#e85d3a');
    doc.circle(MARGIN + 5, y - 3, 3.5, 'F');

    doc.setDrawColor('#d1d5db');
    doc.setLineWidth(0.5);
    if (index < dayPlan.spots.length - 1) {
      doc.line(MARGIN + 5, y + 1, MARGIN + 5, y + LINE_HEIGHT + 8);
    }

    addText(doc, String(index + 1).padStart(2, '0'), MARGIN + 14, y, {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#e85d3a',
    });

    addText(doc, spot.time, MARGIN + 26, y, {
      fontSize: 11,
      fontWeight: 'bold',
      color: '#e85d3a',
    });

    addText(doc, spot.name, MARGIN + 45, y, {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#2d3436',
    });

    y += LINE_HEIGHT + 1;

    const descriptionLines = doc.splitTextToSize(spot.description, PAGE_WIDTH - MARGIN - 55);
    descriptionLines.forEach((line: string) => {
      if (y > PAGE_HEIGHT - 50) {
        doc.addPage();
        y = CONTENT_START;
      }
      addText(doc, line, MARGIN + 45, y, {
        fontSize: 10,
        fontWeight: 'normal',
        color: '#666',
      });
      y += LINE_HEIGHT - 1;
    });

    addText(doc, `⏱ 游览时长: ${spot.duration}  ·  坐标: ${spot.coordinates[0].toFixed(4)}, ${spot.coordinates[1].toFixed(4)}`, MARGIN + 45, y, {
      fontSize: 9,
      fontWeight: 'normal',
      color: '#999',
    });

    y += LINE_HEIGHT + 6;
  });

  if (dayPlan.restaurants.length > 0) {
    if (y > PAGE_HEIGHT - 70) {
      doc.addPage();
      y = CONTENT_START;
    }

    addText(doc, '🍽 推荐餐厅', MARGIN, y, {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#2d3436',
    });
    y += LINE_HEIGHT + 4;

    dayPlan.restaurants.forEach((restaurant) => {
      if (y > PAGE_HEIGHT - 40) {
        doc.addPage();
        y = CONTENT_START;
      }

      doc.setFillColor('#fef3c7');
      doc.roundedRect(MARGIN, y - 6, PAGE_WIDTH - MARGIN * 2, 20, 3, 3, 'F');

      addText(doc, `✦ ${restaurant.name}`, MARGIN + 6, y, {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#92400e',
      });

      addText(doc, `${restaurant.cuisine}  ·  ${restaurant.price}`, PAGE_WIDTH - MARGIN - 6, y, {
        fontSize: 10,
        fontWeight: 'normal',
        color: '#92400e',
        align: 'right',
      });

      y += LINE_HEIGHT + 8;
    });
  }
}

function addAppendixPage(doc: jsPDF, plan: TravelPlan) {
  doc.addPage();

  doc.setFillColor('#faf8f5');
  doc.rect(0, 0, PAGE_WIDTH, HEADER_HEIGHT, 'F');

  doc.setFillColor('#e85d3a');
  doc.rect(0, HEADER_HEIGHT - 2, PAGE_WIDTH, 2, 'F');

  addText(doc, '附 录', PAGE_WIDTH / 2, 15, {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d3436',
    align: 'center',
  });

  let y = CONTENT_START;

  addText(doc, '🍽 餐厅推荐汇总', MARGIN, y, {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d3436',
  });
  y += LINE_HEIGHT + 2;

  addText(doc, '以下是本次行程中所有推荐的餐厅，方便您提前预订或收藏。', MARGIN, y, {
    fontSize: 10,
    fontWeight: 'normal',
    color: '#666',
  });
  y += LINE_HEIGHT + 4;

  const allRestaurants = new Map();
  plan.dailyPlans.forEach(dp => {
    dp.restaurants.forEach(r => {
      allRestaurants.set(r.id, r);
    });
  });

  const restaurantList = Array.from(allRestaurants.values()) as any[];
  restaurantList.forEach((restaurant: any, idx: number) => {
    if (y > PAGE_HEIGHT - 40) {
      doc.addPage();
      y = CONTENT_START;
    }

    doc.setFillColor(idx % 2 === 0 ? '#fffbeb' : '#fef3c7');
    doc.roundedRect(MARGIN, y - 6, PAGE_WIDTH - MARGIN * 2, 22, 2, 2, 'F');

    addText(doc, `${String(idx + 1).padStart(2, '0')}. ${restaurant.name}`, MARGIN + 6, y, {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#92400e',
    });

    addText(doc, `${restaurant.cuisine} · ${restaurant.price}`, PAGE_WIDTH - MARGIN - 6, y, {
      fontSize: 10,
      fontWeight: 'normal',
      color: '#b45309',
      align: 'right',
    });

    y += LINE_HEIGHT + 1;
    addText(doc, `地址: ${plan.destination} 市内`, MARGIN + 6, y + 1, {
      fontSize: 9,
      fontWeight: 'normal',
      color: '#a16207',
    });

    y += LINE_HEIGHT + 6;
  });

  y += LINE_HEIGHT;

  if (y > PAGE_HEIGHT - 130) {
    doc.addPage();
    y = CONTENT_START;
  }

  addText(doc, '💡 实用 Tips', MARGIN, y, {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d3436',
  });
  y += LINE_HEIGHT + 2;

  addText(doc, '出行前准备和旅途中的实用建议', MARGIN, y, {
    fontSize: 10,
    fontWeight: 'normal',
    color: '#666',
  });
  y += LINE_HEIGHT + 4;

  const tips = destinationTips[plan.destination] || defaultTips;

  tips.forEach((tip, index) => {
    if (y > PAGE_HEIGHT - 30) {
      doc.addPage();
      y = CONTENT_START;
    }

    addText(doc, `${tip.icon} ${index + 1}. ${tip.title}`, MARGIN, y, {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#2d3436',
    });
    y += LINE_HEIGHT;

    const descLines = doc.splitTextToSize(tip.desc, PAGE_WIDTH - MARGIN - 15);
    descLines.forEach((line: string) => {
      if (y > PAGE_HEIGHT - 30) {
        doc.addPage();
        y = CONTENT_START;
      }
      addText(doc, `    ${line}`, MARGIN, y, {
        fontSize: 10,
        fontWeight: 'normal',
        color: '#555',
      });
      y += LINE_HEIGHT - 1;
    });

    y += LINE_HEIGHT;
  });

  doc.addPage();
  addText(doc, '祝您旅途愉快！', PAGE_WIDTH / 2, PAGE_HEIGHT / 2 - 20, {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#e85d3a',
    align: 'center',
  });
  addText(doc, 'Have a Wonderful Trip!', PAGE_WIDTH / 2, PAGE_HEIGHT / 2 + 15, {
    fontSize: 20,
    fontWeight: 'normal',
    color: '#2d3436',
    align: 'center',
  });
  addText(doc, '—— 智能旅行规划助手 为您定制', PAGE_WIDTH / 2, PAGE_HEIGHT - MARGIN, {
    fontSize: 11,
    fontWeight: 'normal',
    color: '#999',
    align: 'center',
  });
}

export function exportToPDF(plan: TravelPlan, nickname?: string) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  addCoverPage(doc, plan, nickname);

  plan.dailyPlans.forEach(dayPlan => {
    addDayPage(doc, dayPlan, plan);
  });

  addAppendixPage(doc, plan);

  const displayName = nickname || USER_NICKNAME;
  doc.save(`${plan.destination}_${plan.dailyPlans.length}天_${displayName}_旅行计划书.pdf`);
}

export default exportToPDF;
