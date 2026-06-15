export function generateSamplePage(
  canvas: HTMLCanvasElement,
  pageNumber: number
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#E0E0E0';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, width - 40, height - 40);

  if (pageNumber === 1) {
    ctx.fillStyle = '#333333';
    ctx.font = `bold ${Math.floor(width * 0.05)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('协同PDF批注系统', width / 2, height * 0.3);

    ctx.font = `${Math.floor(width * 0.025)}px sans-serif`;
    ctx.fillStyle = '#666666';
    ctx.fillText('Real-time Collaborative PDF Annotation', width / 2, height * 0.38);

    ctx.fillStyle = '#4A90D9';
    ctx.fillRect(width * 0.3, height * 0.5, width * 0.4, 6);

    ctx.fillStyle = '#888888';
    ctx.font = `${Math.floor(width * 0.02)}px sans-serif`;
    ctx.fillText('首页 - Title Page', width / 2, height * 0.65);
    ctx.fillText(`Page ${pageNumber}`, width / 2, height - 80);
  } else if (pageNumber === 2) {
    ctx.fillStyle = '#333333';
    ctx.font = `bold ${Math.floor(width * 0.035)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('项目进度表', width * 0.08, height * 0.12);

    const tableTop = height * 0.2;
    const tableLeft = width * 0.08;
    const tableWidth = width * 0.84;
    const rowHeight = height * 0.08;
    const col1Width = tableWidth * 0.3;
    const col2Width = tableWidth * 0.5;
    const col3Width = tableWidth * 0.2;
    const rows = 5;

    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    ctx.strokeRect(tableLeft, tableTop, tableWidth, rowHeight * (rows + 1));

    for (let i = 1; i <= rows; i++) {
      ctx.beginPath();
      ctx.moveTo(tableLeft, tableTop + rowHeight * i);
      ctx.lineTo(tableLeft + tableWidth, tableTop + rowHeight * i);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(tableLeft + col1Width, tableTop);
    ctx.lineTo(tableLeft + col1Width, tableTop + rowHeight * (rows + 1));
    ctx.moveTo(tableLeft + col1Width + col2Width, tableTop);
    ctx.lineTo(tableLeft + col1Width + col2Width, tableTop + rowHeight * (rows + 1));
    ctx.stroke();

    ctx.fillStyle = '#F0F0F0';
    ctx.fillRect(tableLeft, tableTop, tableWidth, rowHeight);
    ctx.fillStyle = '#333333';
    ctx.font = `bold ${Math.floor(width * 0.018)}px sans-serif`;
    ctx.fillText('任务', tableLeft + 10, tableTop + rowHeight * 0.65);
    ctx.fillText('描述', tableLeft + col1Width + 10, tableTop + rowHeight * 0.65);
    ctx.fillText('状态', tableLeft + col1Width + col2Width + 10, tableTop + rowHeight * 0.65);

    ctx.font = `${Math.floor(width * 0.016)}px sans-serif`;
    const tasks = [
      ['需求分析', '收集并整理用户需求文档', '已完成'],
      ['UI设计', '界面原型和视觉设计', '进行中'],
      ['前端开发', '实现React组件和交互', '进行中'],
      ['后端开发', 'WebSocket服务和API', '待开始'],
      ['测试部署', '功能测试和上线部署', '待开始'],
    ];
    tasks.forEach((task, i) => {
      const y = tableTop + rowHeight * (i + 1.65);
      ctx.fillText(task[0], tableLeft + 10, y);
      ctx.fillText(task[1], tableLeft + col1Width + 10, y);
      ctx.fillStyle = task[2] === '已完成' ? '#22C55E' : task[2] === '进行中' ? '#F59E0B' : '#9CA3AF';
      ctx.fillText(task[2], tableLeft + col1Width + col2Width + 10, y);
      ctx.fillStyle = '#333333';
    });

    ctx.fillStyle = '#888888';
    ctx.font = `${Math.floor(width * 0.02)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`Page ${pageNumber}`, width / 2, height - 60);
  } else if (pageNumber === 3) {
    ctx.fillStyle = '#333333';
    ctx.font = `bold ${Math.floor(width * 0.035)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('季度数据报表', width * 0.08, height * 0.12);

    const chartTop = height * 0.25;
    const chartLeft = width * 0.12;
    const chartWidth = width * 0.76;
    const chartHeight = height * 0.5;
    const barWidth = chartWidth * 0.1;
    const barGap = chartWidth * 0.05;
    const data = [0.65, 0.8, 0.55, 0.9, 0.72, 0.88];
    const labels = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6'];
    const colors = ['#4A90D9', '#FFD700', '#22C55E', '#F59E0B', '#87CEEB', '#FF6B6B'];

    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(chartLeft, chartTop);
    ctx.lineTo(chartLeft, chartTop + chartHeight);
    ctx.lineTo(chartLeft + chartWidth, chartTop + chartHeight);
    ctx.stroke();

    data.forEach((value, i) => {
      const barHeight = chartHeight * value;
      const x = chartLeft + barGap + i * (barWidth + barGap);
      const y = chartTop + chartHeight - barHeight;
      ctx.fillStyle = colors[i];
      ctx.fillRect(x, y, barWidth, barHeight);
      ctx.fillStyle = '#333333';
      ctx.font = `${Math.floor(width * 0.015)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(value * 100)}%`, x + barWidth / 2, y - 8);
      ctx.fillText(labels[i], x + barWidth / 2, chartTop + chartHeight + 24);
    });

    ctx.fillStyle = '#888888';
    ctx.font = `${Math.floor(width * 0.02)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`Page ${pageNumber}`, width / 2, height - 60);
  }
}

export const SAMPLE_PAGE_COUNT = 3;
export const A4_ASPECT_RATIO = 297 / 210;
