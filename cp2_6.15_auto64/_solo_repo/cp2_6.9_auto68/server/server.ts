import express from 'express';
import cors from 'cors';
import jsPDF from 'jspdf';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

interface ScoreData {
  char: string;
  index: number;
  score: number;
}

interface ReportRequest {
  username: string;
  date: string;
  poemTitle: string;
  poemAuthor: string;
  totalChars: number;
  completedCount: number;
  averageScore: number;
  timeSpent: number;
  scores: ScoreData[];
}

const getScoreColor = (score: number): string => {
  if (score > 80) return '#27ae60';
  if (score >= 60) return '#f39c12';
  return '#e74c3c';
};

const getScoreLevel = (score: number): string => {
  if (score > 90) return '优秀';
  if (score > 80) return '良好';
  if (score >= 60) return '及格';
  return '需加强';
};

app.post('/api/compare-strokes', (req, res) => {
  try {
    const { userPixels, charPixels } = req.body;
    
    if (!userPixels || !charPixels) {
      return res.status(400).json({ error: '缺少像素数据' });
    }

    let charPixelCount = 0;
    let userPixelCount = 0;
    let overlapCount = 0;

    for (let y = 0; y < charPixels.length; y++) {
      for (let x = 0; x < charPixels[y].length; x++) {
        if (charPixels[y][x]) {
          charPixelCount++;
          if (userPixels[y]?.[x]) {
            overlapCount++;
          }
        }
        if (userPixels[y]?.[x]) {
          userPixelCount++;
        }
      }
    }

    const precision = charPixelCount > 0 ? overlapCount / charPixelCount : 0;
    const recall = userPixelCount > 0 ? overlapCount / userPixelCount : 0;
    const f1Score = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    const score = Math.round(f1Score * 100);

    let suggestions: string[] = [];
    if (score < 60) {
      suggestions = [
        '笔画结构需要多加练习',
        '注意字的整体比例',
        '建议先观察标准字的笔画顺序'
      ];
    } else if (score < 80) {
      suggestions = [
        '整体结构不错，部分笔画需要调整',
        '注意笔画的起止位置'
      ];
    } else {
      suggestions = [
        '书写规范，继续保持！',
        '可以尝试加快书写速度'
      ];
    }

    res.json({ score, suggestions, precision, recall });
  } catch (error) {
    console.error('笔迹对比出错:', error);
    res.status(500).json({ error: '服务端处理失败' });
  }
});

app.post('/api/generate-report', (req, res) => {
  try {
    const data: ReportRequest = req.body;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;

    doc.setFillColor(44, 62, 80);
    doc.rect(0, 0, pageWidth, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('古诗词书法临摹学习报告', pageWidth / 2, yPos + 5, { align: 'center' });

    yPos = 50;
    doc.setTextColor(44, 62, 80);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(`用户昵称：${data.username}`, 20, yPos);
    doc.text(`报告日期：${data.date}`, pageWidth - 60, yPos, { align: 'right' });

    yPos += 10;
    doc.setFontSize(12);
    doc.setTextColor(127, 140, 141);
    doc.text(`临摹诗词：《${data.poemTitle}》 - ${data.poemAuthor}`, 20, yPos);

    yPos += 20;
    doc.setDrawColor(52, 73, 94);
    doc.setLineWidth(0.5);
    doc.line(20, yPos, pageWidth - 20, yPos);

    yPos += 15;
    doc.setTextColor(44, 62, 80);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('一、临摹数据概览', 20, yPos);

    yPos += 15;
    const boxWidth = (pageWidth - 60) / 3;
    const boxHeight = 50;
    const boxY = yPos;

    doc.setFillColor(236, 240, 241);
    doc.roundedRect(20, boxY, boxWidth, boxHeight, 4, 4, 'F');
    doc.roundedRect(30 + boxWidth, boxY, boxWidth, boxHeight, 4, 4, 'F');
    doc.roundedRect(40 + boxWidth * 2, boxY, boxWidth, boxHeight, 4, 4, 'F');

    doc.setTextColor(52, 73, 94);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('总字数', 20 + boxWidth / 2, boxY + 15, { align: 'center' });
    doc.text('已完成字数', 30 + boxWidth + boxWidth / 2, boxY + 15, { align: 'center' });
    doc.text('平均得分', 40 + boxWidth * 2 + boxWidth / 2, boxY + 15, { align: 'center' });

    doc.setTextColor(41, 128, 185);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(String(data.totalChars), 20 + boxWidth / 2, boxY + 35, { align: 'center' });

    doc.setTextColor(39, 174, 96);
    doc.text(`${data.completedCount} (${Math.round(data.completedCount / data.totalChars * 100)}%)`, 
      30 + boxWidth + boxWidth / 2, boxY + 35, { align: 'center' });

    const avgColor = data.averageScore > 80 ? [39, 174, 96] : data.averageScore >= 60 ? [243, 156, 18] : [231, 76, 60];
    doc.setTextColor(avgColor[0], avgColor[1], avgColor[2]);
    doc.text(`${data.averageScore || 0} 分`, 40 + boxWidth * 2 + boxWidth / 2, boxY + 35, { align: 'center' });

    yPos = boxY + boxHeight + 20;
    doc.setFillColor(236, 240, 241);
    doc.roundedRect(20, yPos, pageWidth - 40, 25, 4, 4, 'F');
    doc.setTextColor(52, 73, 94);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const minutes = Math.floor(data.timeSpent / 60);
    const seconds = data.timeSpent % 60;
    doc.text(`⏱  总用时：${minutes}分${seconds}秒`, 30, yPos + 16);

    yPos += 45;
    doc.setTextColor(44, 62, 80);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('二、各字得分详情', 20, yPos);

    yPos += 15;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.setFillColor(44, 62, 80);
    doc.roundedRect(20, yPos - 7, pageWidth - 40, 14, 2, 2, 'F');
    doc.text('序号', 25, yPos + 3);
    doc.text('汉字', 55, yPos + 3);
    doc.text('得分', 90, yPos + 3);
    doc.text('等级', 130, yPos + 3);
    doc.text('进度条', 170, yPos + 3);

    yPos += 10;
    doc.setFont('helvetica', 'normal');

    const sortedScores = [...data.scores].sort((a, b) => a.index - b.index);

    sortedScores.forEach((item, idx) => {
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = 30;
      }

      const bgColor = idx % 2 === 0 ? [248, 249, 250] : [255, 255, 255];
      doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
      doc.rect(20, yPos - 5, pageWidth - 40, 16, 'F');

      doc.setTextColor(52, 73, 94);
      doc.setFontSize(10);
      doc.text(String(idx + 1), 25, yPos + 5);
      doc.text(item.char, 55, yPos + 5);

      const scoreColor = item.score > 80 ? [39, 174, 96] : item.score >= 60 ? [243, 156, 18] : [231, 76, 60];
      doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`${item.score}分`, 90, yPos + 5);

      doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(getScoreLevel(item.score), 130, yPos + 5);

      const barWidth = pageWidth - 200;
      const filledWidth = (item.score / 100) * barWidth;
      doc.setFillColor(236, 240, 241);
      doc.roundedRect(170, yPos, barWidth, 6, 3, 3, 'F');
      doc.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2]);
      doc.roundedRect(170, yPos, filledWidth, 6, 3, 3, 'F');

      yPos += 16;
    });

    if (data.scores.length === 0) {
      doc.setTextColor(149, 165, 166);
      doc.setFontSize(11);
      doc.text('暂无评分数据，请先完成临摹练习。', pageWidth / 2, yPos + 20, { align: 'center' });
    }

    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 30;
    } else {
      yPos += 20;
    }

    yPos += 10;
    doc.setTextColor(44, 62, 80);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('三、学习建议', 20, yPos);

    yPos += 15;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(52, 73, 94);

    let suggestions: string[] = [];
    if (data.averageScore >= 80) {
      suggestions = [
        '🎉 恭喜！你的整体书写水平优秀，请继续保持。',
        '建议尝试更复杂的古诗词作品进行练习。',
        '可以尝试不同的书法字体，如行书、草书等。'
      ];
    } else if (data.averageScore >= 60) {
      suggestions = [
        '💪 你的书写已经有一定基础，继续加油！',
        '建议重点练习低分字的笔画结构。',
        '注意每个字的起笔、行笔、收笔三个阶段。',
        '每天坚持练习20-30分钟效果更佳。'
      ];
    } else {
      suggestions = [
        '📚 建议从基础笔画开始练习，如横、竖、撇、捺等。',
        '临摹时注意观察标准字的结构和比例。',
        '不要急于求成，先慢后快，保证每个笔画的质量。',
        '可以先在草稿纸上多练习几遍，再正式临摹。'
      ];
    }

    suggestions.forEach((suggestion, idx) => {
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = 30;
      }
      doc.text(`${idx + 1}. ${suggestion}`, 25, yPos);
      yPos += 10;
    });

    yPos = pageHeight - 20;
    doc.setFontSize(9);
    doc.setTextColor(149, 165, 166);
    doc.text('— 古诗词智能书法临摹学习工具 生成 —', pageWidth / 2, yPos, { align: 'center' });

    const pdfBuffer = doc.output('arraybuffer');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="书法临摹报告_${data.poemTitle}_${Date.now()}.pdf"`);
    res.send(Buffer.from(pdfBuffer));
  } catch (error) {
    console.error('生成PDF报告出错:', error);
    res.status(500).json({ error: 'PDF生成失败', details: (error as Error).message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`🚀 书法临摹后端服务已启动: http://localhost:${PORT}`);
  console.log(`📊 健康检查: http://localhost:${PORT}/api/health`);
});
