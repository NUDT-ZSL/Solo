import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import dayjs from 'dayjs';

export interface Pet {
  id: string;
  name: string;
  breed: string;
  birthDate: string;
  avatar: string;
}

export interface HealthRecord {
  id: string;
  petId: string;
  type: 'vaccine' | 'deworm' | 'weight';
  date: string;
  description: string;
  weight?: number;
  temperature?: number;
  vaccineName?: string;
  dewormType?: string;
}

export async function generatePDF(pet: Pet, records: HealthRecord[]): Promise<Blob> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('宠物健康体检报告', pageWidth / 2, y, { align: 'center' });
  y += 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`报告生成日期：${dayjs().format('YYYY年MM月DD日')}`, pageWidth / 2, y, { align: 'center' });
  y += 15;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('一、宠物基本信息', margin, y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const infoLabels = ['宠物名称', '品种', '出生日期'];
  const infoValues = [pet.name, pet.breed, pet.birthDate];
  infoLabels.forEach((label, i) => {
    doc.text(`${label}：${infoValues[i]}`, margin + 5, y);
    y += 8;
  });
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('二、健康记录时间轴', margin, y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const sortedRecords = [...records].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  sortedRecords.slice(0, 10).forEach((record, index) => {
    if (y > 250) {
      doc.addPage();
      y = margin;
    }
    const typeMap: Record<string, string> = {
      vaccine: '疫苗',
      deworm: '驱虫',
      weight: '体重'
    };
    doc.text(`● ${record.date}  [${typeMap[record.type]}] ${record.description}`, margin + 5, y);
    y += 7;

    if (record.weight || record.temperature) {
      let detail = '';
      if (record.weight) detail += `体重：${record.weight}kg  `;
      if (record.temperature) detail += `体温：${record.temperature}℃`;
      doc.text(detail, margin + 12, y);
      y += 7;
    }
  });

  y += 8;

  if (y > 200) {
    doc.addPage();
    y = margin;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('三、健康趋势统计', margin, y);
  y += 10;

  const weightRecords = sortedRecords
    .filter(r => r.type === 'weight' && r.weight)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (weightRecords.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const latest = weightRecords[weightRecords.length - 1];
    const first = weightRecords[0];
    const weightChange = latest.weight! - first.weight!;
    const changeText = weightChange >= 0 ? `+${weightChange.toFixed(1)}` : weightChange.toFixed(1);
    
    doc.text(`当前体重：${latest.weight}kg`, margin + 5, y);
    y += 8;
    doc.text(`体重变化：${changeText}kg`, margin + 5, y);
    y += 8;
    doc.text(`记录次数：${weightRecords.length}次`, margin + 5, y);
    y += 8;
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text('暂无体重记录数据', margin + 5, y);
    y += 8;
  }

  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('四、总结建议', margin, y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('建议定期为宠物进行健康检查，按时接种疫苗和驱虫。', margin + 5, y);
  y += 8;
  doc.text('注意观察宠物的饮食、排便和精神状态，如有异常及时就医。', margin + 5, y);
  y += 8;
  doc.text('保持适当的运动量和均衡的饮食，有助于宠物健康成长。', margin + 5, y);

  const fileName = `${pet.name}_体检报告_${dayjs().format('YYYYMMDD')}.pdf`;
  const blob = doc.output('blob');
  
  return blob;
}

export function downloadPDF(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
