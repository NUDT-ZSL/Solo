import jsPDF from 'jspdf';
import type { TravelPlan, DayPlan, Attraction } from './types';

const HEADER_HEIGHT = 20;
const CONTENT_START = 30;
const LINE_HEIGHT = 8;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 20;

function addText(doc: jsPDF, text: string, x: number, y: number, options?: { fontSize?: number; fontWeight?: 'normal' | 'bold'; color?: string }) {
  const { fontSize = 12, fontWeight = 'normal', color = '#2d3436' } = options || {};
  doc.setFontSize(fontSize);
  doc.setFont('helvetica', fontWeight);
  doc.setTextColor(color);
  doc.text(text, x, y);
}

function addCoverPage(doc: jsPDF, plan: TravelPlan) {
  const centerX = PAGE_WIDTH / 2;
  const centerY = PAGE_HEIGHT / 2;

  doc.setFillColor('#faf8f5');
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');

  doc.setFillColor('#e85d3a');
  doc.roundedRect(centerX - 40, centerY - 60, 80, 6, 3, 3, 'F');

  addText(doc, plan.destination, centerX, centerY - 40, {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2d3436',
  });

  addText(doc, `${plan.days} 天旅行计划`, centerX, centerY - 10, {
    fontSize: 24,
    fontWeight: 'normal',
    color: '#e85d3a',
  });

  const preferencesText = plan.preferences.join(' · ');
  addText(doc, preferencesText, centerX, centerY + 15, {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#666',
  });

  addText(doc, `预算: ${plan.budget}`, centerX, centerY + 35, {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#666',
  });

  addText(doc, '旅行者', centerX, centerY + 65, {
    fontSize: 12,
    fontWeight: 'normal',
    color: '#999',
  });

  const date = new Date().toLocaleDateString('zh-CN');
  addText(doc, `生成日期: ${date}`, centerX, centerY + 80, {
    fontSize: 10,
    fontWeight: 'normal',
    color: '#999',
  });
}

function addDayPage(doc: jsPDF, dayPlan: DayPlan, plan: TravelPlan) {
  doc.addPage();

  doc.setFillColor('#faf8f5');
  doc.rect(0, 0, PAGE_WIDTH, HEADER_HEIGHT, 'F');

  addText(doc, `第 ${dayPlan.day} 天`, MARGIN, 15, {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d3436',
  });

  addText(doc, plan.destination, PAGE_WIDTH - MARGIN, 15, {
    fontSize: 12,
    fontWeight: 'normal',
    color: '#e85d3a',
  });

  let y = CONTENT_START;

  addText(doc, '今日行程', MARGIN, y, {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2d3436',
  });
  y += LINE_HEIGHT + 4;

  dayPlan.attractions.forEach((attraction: Attraction, index: number) => {
    if (y > PAGE_HEIGHT - 40) {
      doc.addPage();
      y = CONTENT_START;
    }

    doc.setFillColor('#e85d3a');
    doc.circle(MARGIN + 3, y - 2, 3, 'F');

    doc.setDrawColor('#d1d5db');
    doc.setLineWidth(0.5);
    if (index < dayPlan.attractions.length - 1) {
      doc.line(MARGIN + 3, y + 1, MARGIN + 3, y + LINE_HEIGHT + 4);
    }

    addText(doc, attraction.time, MARGIN + 10, y, {
      fontSize: 11,
      fontWeight: 'bold',
      color: '#e85d3a',
    });

    addText(doc, attraction.name, MARGIN + 35, y, {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#2d3436',
    });

    y += LINE_HEIGHT;

    const descriptionLines = doc.splitTextToSize(attraction.description, PAGE_WIDTH - MARGIN - 45);
    descriptionLines.forEach((line: string) => {
      if (y > PAGE_HEIGHT - 40) {
        doc.addPage();
        y = CONTENT_START;
      }
      addText(doc, line, MARGIN + 35, y, {
        fontSize: 10,
        fontWeight: 'normal',
        color: '#666',
      });
      y += LINE_HEIGHT - 1;
    });

    addText(doc, `⏱ ${attraction.duration}`, MARGIN + 35, y, {
      fontSize: 9,
      fontWeight: 'normal',
      color: '#999',
    });

    y += LINE_HEIGHT + 4;
  });

  if (dayPlan.restaurants.length > 0) {
    if (y > PAGE_HEIGHT - 60) {
      doc.addPage();
      y = CONTENT_START;
    }

    addText(doc, '推荐餐厅', MARGIN, y, {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#2d3436',
    });
    y += LINE_HEIGHT + 2;

    dayPlan.restaurants.forEach((restaurant) => {
      if (y > PAGE_HEIGHT - 40) {
        doc.addPage();
        y = CONTENT_START;
      }

      doc.setFillColor('#fef3c7');
      doc.roundedRect(MARGIN, y - 5, PAGE_WIDTH - MARGIN * 2, 16, 2, 2, 'F');

      addText(doc, `🍽 ${restaurant.name}`, MARGIN + 5, y + 5, {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#92400e',
      });

      addText(doc, `${restaurant.cuisine} · ${restaurant.price}`, PAGE_WIDTH - MARGIN - 40, y + 5, {
        fontSize: 10,
        fontWeight: 'normal',
        color: '#92400e',
      });

      y += LINE_HEIGHT + 6;
    });
  }
}

function addAppendixPage(doc: jsPDF, plan: TravelPlan) {
  doc.addPage();

  doc.setFillColor('#faf8f5');
  doc.rect(0, 0, PAGE_WIDTH, HEADER_HEIGHT, 'F');

  addText(doc, '附录', PAGE_WIDTH / 2, 15, {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d3436',
  });

  let y = CONTENT_START;

  addText(doc, '餐厅推荐汇总', MARGIN, y, {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2d3436',
  });
  y += LINE_HEIGHT + 4;

  const allRestaurants = new Map();
  plan.dailyPlans.forEach(dayPlan => {
    dayPlan.restaurants.forEach(r => {
      allRestaurants.set(r.id, r);
    });
  });

  Array.from(allRestaurants.values()).forEach((restaurant: any) => {
    if (y > PAGE_HEIGHT - 40) {
      doc.addPage();
      y = CONTENT_START;
    }

    doc.setFillColor('#fef3c7');
    doc.roundedRect(MARGIN, y - 5, PAGE_WIDTH - MARGIN * 2, 16, 2, 2, 'F');

    addText(doc, `🍽 ${restaurant.name}`, MARGIN + 5, y + 5, {
      fontSize: 11,
      fontWeight: 'bold',
      color: '#92400e',
    });

    addText(doc, `${restaurant.cuisine} · ${restaurant.price}`, PAGE_WIDTH - MARGIN - 40, y + 5, {
      fontSize: 10,
      fontWeight: 'normal',
      color: '#92400e',
    });

    y += LINE_HEIGHT + 6;
  });

  y += LINE_HEIGHT;

  if (y > PAGE_HEIGHT - 100) {
    doc.addPage();
    y = CONTENT_START;
  }

  addText(doc, '实用 Tips', MARGIN, y, {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2d3436',
  });
  y += LINE_HEIGHT + 4;

  const tips = [
    '提前预订热门景点门票和餐厅',
    '查看当地天气，准备合适衣物',
    '下载离线地图，方便无网络时导航',
    '准备常用药品，注意饮食卫生',
    '保管好贵重物品，注意人身安全',
    '了解当地风俗习惯，文明出行',
    '保留行程备份，以防手机没电',
    '预留弹性时间，应对突发情况',
  ];

  tips.forEach((tip, index) => {
    if (y > PAGE_HEIGHT - 30) {
      doc.addPage();
      y = CONTENT_START;
    }

    addText(doc, `${index + 1}. ${tip}`, MARGIN, y, {
      fontSize: 11,
      fontWeight: 'normal',
      color: '#666',
    });
    y += LINE_HEIGHT + 1;
  });
}

export function exportToPDF(plan: TravelPlan) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  addCoverPage(doc, plan);

  plan.dailyPlans.forEach(dayPlan => {
    addDayPage(doc, dayPlan, plan);
  });

  addAppendixPage(doc, plan);

  doc.save(`${plan.destination}_${plan.days}天旅行计划.pdf`);
}

export default exportToPDF;
