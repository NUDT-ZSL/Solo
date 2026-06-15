export interface AchievementData {
  nickname: string;
  avatarSeed: string;
  timeSeconds: number;
  accuracy: number;
  targetChar: string;
}

export class AchievementCard {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private width: number = 300;
  private height: number = 400;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');
    this.ctx = ctx;
  }

  render(data: AchievementData): void {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.drawBackground();
    this.drawDecorativeBorder();
    this.drawTargetChar(data.targetChar);
    this.drawAvatar(data.avatarSeed);
    this.drawNickname(data.nickname);
    this.drawStats(data.timeSeconds, data.accuracy);
    const rating = this.calculateRating(data.timeSeconds, data.accuracy);
    this.drawStars(rating);
    this.drawSeal(rating);
  }

  private drawBackground(): void {
    this.ctx.fillStyle = '#F2E8D5';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.strokeStyle = 'rgba(139, 119, 85, 0.06)';
    this.ctx.lineWidth = 1;
    for (let i = 0; i < 80; i++) {
      const x1 = Math.random() * this.width;
      const y1 = Math.random() * this.height;
      const angle = Math.random() * Math.PI;
      const length = 5 + Math.random() * 15;
      const x2 = x1 + Math.cos(angle) * length;
      const y2 = y1 + Math.sin(angle) * length;

      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    }
  }

  private drawDecorativeBorder(): void {
    this.ctx.save();
    this.ctx.strokeStyle = '#C9A96E';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(15, 15, this.width - 30, this.height - 30);

    this.ctx.strokeStyle = 'rgba(201, 169, 110, 0.5)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(20, 20, this.width - 40, this.height - 40);
    this.ctx.restore();
  }

  private drawTargetChar(char: string): void {
    this.ctx.save();
    this.ctx.fillStyle = '#4A3A2A';
    this.ctx.font = 'bold 28px "KaiTi", "STKaiti", serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(char, this.width / 2, 55);
    this.ctx.restore();
  }

  private drawAvatar(seed: string): void {
    const centerX = this.width / 2;
    const centerY = 120;
    const radius = 35;

    this.ctx.save();

    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = '#E8DCC4';
    this.ctx.fill();
    this.ctx.strokeStyle = '#C9A96E';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.clip();

    const colors = ['#8B5E3C', '#A67B5B', '#6B4423', '#4A3A2A', '#C9A96E'];
    const seedNum = this.hashString(seed);
    const colorIndex = seedNum % colors.length;
    this.ctx.fillStyle = colors[colorIndex];

    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY - 5, 20, Math.PI, 0);
    this.ctx.fill();

    this.ctx.fillStyle = '#D4B896';
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY + 5, 18, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#3A2A1A';
    this.ctx.beginPath();
    this.ctx.arc(centerX - 6, centerY + 3, 2.5, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(centerX + 6, centerY + 3, 2.5, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = '#8B5E3C';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY + 8, 6, 0.1 * Math.PI, 0.9 * Math.PI);
    this.ctx.stroke();

    this.ctx.restore();
  }

  private drawNickname(nickname: string): void {
    this.ctx.save();
    this.ctx.fillStyle = '#4A3A2A';
    this.ctx.font = '16px "Microsoft YaHei", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(nickname, this.width / 2, 175);
    this.ctx.restore();
  }

  private drawStats(timeSeconds: number, accuracy: number): void {
    const minutes = Math.floor(timeSeconds / 60);
    const seconds = Math.floor(timeSeconds % 60);
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    this.ctx.save();
    this.ctx.font = '14px "Microsoft YaHei", sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = '#6B5B4F';

    this.ctx.fillText('用时', 50, 210);
    this.ctx.fillText('准确率', 50, 235);

    this.ctx.textAlign = 'right';
    this.ctx.fillStyle = '#4A3A2A';
    this.ctx.font = 'bold 14px "Microsoft YaHei", sans-serif';

    this.ctx.fillText(timeStr, this.width - 50, 210);
    this.ctx.fillText(`${accuracy}%`, this.width - 50, 235);
    this.ctx.restore();
  }

  private drawStars(rating: number): void {
    this.ctx.save();
    this.ctx.textAlign = 'center';
    this.ctx.font = 'bold 14px "Microsoft YaHei", sans-serif';
    this.ctx.fillStyle = '#6B5B4F';
    this.ctx.fillText('评级', this.width / 2, 270);

    const starSize = 22;
    const totalWidth = starSize * 5 + 8 * 4;
    const startX = (this.width - totalWidth) / 2;
    const y = 295;

    for (let i = 0; i < 5; i++) {
      const x = startX + i * (starSize + 8);
      this.drawStar(x + starSize / 2, y + starSize / 2, starSize / 2, i < rating);
    }

    const labels = ['', '继续努力', '初窥门径', '渐入佳境', '匠心独运', '笔走龙蛇'];
    this.ctx.font = '13px "KaiTi", "STKaiti", serif';
    this.ctx.fillStyle = '#C9A96E';
    this.ctx.fillText(labels[rating], this.width / 2, 330);

    this.ctx.restore();
  }

  private drawStar(cx: number, cy: number, r: number, filled: boolean): void {
    this.ctx.save();
    this.ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const outerAngle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      const innerAngle = outerAngle + Math.PI / 5;
      const outerX = cx + r * Math.cos(outerAngle);
      const outerY = cy + r * Math.sin(outerAngle);
      const innerX = cx + r * 0.4 * Math.cos(innerAngle);
      const innerY = cy + r * 0.4 * Math.sin(innerAngle);

      if (i === 0) {
        this.ctx.moveTo(outerX, outerY);
      } else {
        this.ctx.lineTo(outerX, outerY);
      }
      this.ctx.lineTo(innerX, innerY);
    }
    this.ctx.closePath();

    if (filled) {
      this.ctx.fillStyle = '#C9A96E';
      this.ctx.fill();
      this.ctx.strokeStyle = '#B8944F';
    } else {
      this.ctx.fillStyle = 'rgba(201, 169, 110, 0.2)';
      this.ctx.fill();
      this.ctx.strokeStyle = 'rgba(201, 169, 110, 0.5)';
    }
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawSeal(rating: number): void {
    const sealSize = 70;
    const x = this.width - sealSize - 30;
    const y = this.height - sealSize - 25;

    this.ctx.save();

    this.ctx.fillStyle = '#8B2500';
    this.ctx.beginPath();
    this.drawRoughRect(x, y, sealSize, sealSize);
    this.ctx.fill();

    this.ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 30; i++) {
      const rx = x + Math.random() * sealSize;
      const ry = y + Math.random() * sealSize;
      const rr = 1 + Math.random() * 3;
      this.ctx.beginPath();
      this.ctx.arc(rx, ry, rr, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalCompositeOperation = 'source-over';

    const chars = ['墨', '迹', '谜', '格'];
    this.ctx.fillStyle = '#F2E8D5';
    this.ctx.font = 'bold 22px "KaiTi", "STKaiti", serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 2; col++) {
        const charX = x + sealSize / 4 + col * (sealSize / 2);
        const charY = y + sealSize / 4 + row * (sealSize / 2);
        const idx = row * 2 + col;
        if (idx < chars.length) {
          this.ctx.fillText(chars[idx], charX, charY);
        }
      }
    }

    this.ctx.restore();
  }

  private drawRoughRect(x: number, y: number, w: number, h: number): void {
    const points: [number, number][] = [];
    const step = 5;

    for (let i = 0; i <= w; i += step) {
      points.push([x + i + (Math.random() - 0.5) * 2, y + (Math.random() - 0.5) * 2]);
    }
    for (let i = 0; i <= h; i += step) {
      points.push([x + w + (Math.random() - 0.5) * 2, y + i + (Math.random() - 0.5) * 2]);
    }
    for (let i = w; i >= 0; i -= step) {
      points.push([x + i + (Math.random() - 0.5) * 2, y + h + (Math.random() - 0.5) * 2]);
    }
    for (let i = h; i >= 0; i -= step) {
      points.push([x + (Math.random() - 0.5) * 2, y + i + (Math.random() - 0.5) * 2]);
    }

    this.ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i][0], points[i][1]);
    }
    this.ctx.closePath();
  }

  calculateRating(timeSeconds: number, accuracy: number): number {
    let score = 0;

    if (accuracy >= 100) score += 2;
    else if (accuracy >= 80) score += 1.5;
    else if (accuracy >= 60) score += 1;
    else if (accuracy >= 40) score += 0.5;

    if (timeSeconds <= 15) score += 3;
    else if (timeSeconds <= 30) score += 2.5;
    else if (timeSeconds <= 60) score += 2;
    else if (timeSeconds <= 120) score += 1;
    else if (timeSeconds <= 180) score += 0.5;

    const rating = Math.min(5, Math.max(1, Math.round(score)));
    return rating;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}
