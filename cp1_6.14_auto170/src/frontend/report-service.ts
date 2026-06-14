import { Trip, ItineraryItem } from './api-client'

interface DailyItinerary {
  date: string
  items: ItineraryItem[]
}

function groupItineraryByDate(trip: Trip): DailyItinerary[] {
  const grouped = new Map<string, ItineraryItem[]>()
  trip.itinerary.forEach(item => {
    if (!grouped.has(item.date)) {
      grouped.set(item.date, [])
    }
    grouped.get(item.date)!.push(item)
  })

  return Array.from(grouped.entries())
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([date, items]) => ({
      date,
      items: items.sort((a, b) => a.time.localeCompare(b.time)),
    }))
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`
}

function generatePhotoHtml(photos: string[]): string {
  const displayPhotos = photos.slice(0, 3)
  if (displayPhotos.length === 0) return ''

  const photoHtml = displayPhotos
    .map(
      photo =>
        `<img src="${photo}" style="width:120px;height:120px;min-width:120px;min-height:120px;max-width:120px;max-height:120px;object-fit:cover;border-radius:8px;display:block;" alt="旅行照片" />`
    )
    .join('')

  return `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;">${photoHtml}</div>`
}

export function generateReportHtml(trip: Trip): string {
  const dailyItineraries = groupItineraryByDate(trip)
  const totalExpenses = trip.expenses.reduce((sum, e) => sum + e.amount, 0)

  const contentHtml = dailyItineraries
    .map(day => {
      const itemsHtml = day.items
        .map(item => {
          const photosHtml = generatePhotoHtml(item.photos)
          return `
            <div style="margin-left:24px;margin-bottom:20px;padding-left:20px;border-left:3px solid #e2e8f0;">
              <div style="font-size:14px;color:#64748b;margin-bottom:4px;">⏰ ${item.time}</div>
              <div style="font-size:16px;font-weight:600;color:#1e293b;margin-bottom:4px;">📍 ${item.location}</div>
              ${item.description ? `<div style="font-size:14px;color:#475569;line-height:1.7;">${item.description}</div>` : ''}
              ${photosHtml}
            </div>
          `
        })
        .join('')

      return `
        <div style="margin-bottom:32px;">
          <h3 style="font-size:18px;font-weight:700;color:#2563eb;margin:0 0 16px 0;">📅 ${formatDate(day.date)}</h3>
          ${itemsHtml || '<div style="color:#94a3b8;font-size:14px;margin-left:24px;">暂无行程安排</div>'}
        </div>
      `
    })
    .join('')

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${trip.destination} - 我的旅行游记</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      margin: 0;
      padding: 0;
      background: #f0f2f5;
      color: #1e293b;
      line-height: 1.6;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      min-height: 100vh;
    }
    .action-bar {
      position: sticky;
      top: 0;
      background: white;
      padding: 12px 24px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      z-index: 100;
    }
    .copy-btn {
      padding: 8px 16px;
      background: linear-gradient(135deg, #2563eb, #7c3aed);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .copy-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(37,99,235,0.3);
    }
    .cover {
      background: linear-gradient(135deg, #2563eb, #7c3aed);
      padding: 60px 40px;
      color: white;
    }
    .cover h1 {
      font-size: 36px;
      font-weight: 700;
      margin: 0 0 16px 0;
    }
    .cover-info {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
      font-size: 16px;
      opacity: 0.9;
    }
    .cover-mood {
      margin-top: 20px;
      font-size: 15px;
      opacity: 0.85;
      line-height: 1.7;
      max-width: 600px;
    }
    .content {
      padding: 40px;
    }
    .stats {
      display: flex;
      gap: 16px;
      margin-bottom: 32px;
      flex-wrap: wrap;
    }
    .stat-card {
      flex: 1;
      min-width: 140px;
      padding: 16px 20px;
      background: #f8fafc;
      border-radius: 12px;
    }
    .stat-label {
      font-size: 12px;
      color: #64748b;
      margin-bottom: 4px;
    }
    .stat-value {
      font-size: 20px;
      font-weight: 700;
      color: #1e293b;
    }
    .copy-toast {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #22c55e;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      opacity: 0;
      transition: opacity 0.3s;
      z-index: 1000;
    }
    .copy-toast.show {
      opacity: 1;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="action-bar">
      <button class="copy-btn" onclick="copyContent()">📋 复制游记内容</button>
    </div>
    <div class="cover">
      <h1>✈️ ${trip.destination}游记</h1>
      <div class="cover-info">
        <span>📅 ${formatDate(trip.startDate)} ~ ${formatDate(trip.endDate)}</span>
        <span>💰 预算 ¥${trip.budget.toLocaleString()}</span>
        <span>💸 实际花费 ¥${totalExpenses.toLocaleString()}</span>
      </div>
      ${trip.mood ? `<div class="cover-mood">💭 ${trip.mood}</div>` : ''}
    </div>
    <div class="content" id="reportContent">
      <div class="stats">
        <div class="stat-card">
          <div class="stat-label">行程天数</div>
          <div class="stat-value">${dailyItineraries.length} 天</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">行程安排</div>
          <div class="stat-value">${trip.itinerary.length} 项</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">消费记录</div>
          <div class="stat-value">${trip.expenses.length} 笔</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">旅行照片</div>
          <div class="stat-value">${trip.itinerary.reduce((sum, i) => sum + i.photos.length, 0)} 张</div>
        </div>
      </div>
      <h2 style="font-size:22px;font-weight:700;color:#1e293b;margin:0 0 24px 0;">🗺️ 行程记录</h2>
      ${contentHtml || '<div style="color:#94a3b8;padding:40px 0;text-align:center;">还没有行程记录，快去规划你的精彩旅程吧！</div>'}
    </div>
  </div>
  <div class="copy-toast" id="toast">✅ 内容已复制到剪贴板</div>
  <script>
    function copyContent() {
      const content = document.getElementById('reportContent');
      const html = content.innerHTML;
      const blob = new Blob([html], { type: 'text/html' });
      const data = [new ClipboardItem({ 'text/html': blob, 'text/plain': new Blob([content.innerText], { type: 'text/plain' }) })];
      navigator.clipboard.write(data).then(() => {
        showToast();
      }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = content.innerText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast();
      });
    }
    function showToast() {
      const toast = document.getElementById('toast');
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);
    }
  </script>
</body>
</html>
  `
}
