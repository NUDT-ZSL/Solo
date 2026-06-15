export function generateSampleImage(type: 'satellite' | 'terrain' | 'nightlight' | 'roadmap'): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    switch (type) {
      case 'satellite':
        drawSatellite(ctx);
        break;
      case 'terrain':
        drawTerrain(ctx);
        break;
      case 'nightlight':
        drawNightLight(ctx);
        break;
      case 'roadmap':
        drawRoadmap(ctx);
        break;
    }

    const img = new Image();
    img.onload = () => resolve(img);
    img.src = canvas.toDataURL();
  });
}

function drawSatellite(ctx: CanvasRenderingContext2D) {
  const gradient = ctx.createLinearGradient(0, 0, 512, 512);
  gradient.addColorStop(0, '#1a472a');
  gradient.addColorStop(0.3, '#2d5a27');
  gradient.addColorStop(0.6, '#3d6b35');
  gradient.addColorStop(1, '#4a7c42');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 200; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = Math.random() * 40 + 10;
    const colors = ['#2d5a27', '#3d6b35', '#1a472a', '#4a7c42', '#5a8c52'];
    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#6b8e6b';
  ctx.beginPath();
  ctx.ellipse(200, 150, 80, 50, 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#87ceeb';
  ctx.beginPath();
  ctx.moveTo(350, 300);
  ctx.bezierCurveTo(380, 280, 420, 320, 450, 300);
  ctx.bezierCurveTo(480, 330, 440, 400, 400, 420);
  ctx.bezierCurveTo(360, 440, 320, 400, 340, 350);
  ctx.closePath();
  ctx.fill();
}

function drawTerrain(ctx: CanvasRenderingContext2D) {
  const imageData = ctx.createImageData(512, 512);
  const data = imageData.data;

  for (let y = 0; y < 512; y++) {
    for (let x = 0; x < 512; x++) {
      const idx = (y * 512 + x) * 4;
      const noise = perlin2D(x * 0.01, y * 0.01) * 0.5 +
                    perlin2D(x * 0.02, y * 0.02) * 0.3 +
                    perlin2D(x * 0.04, y * 0.04) * 0.2;
      const height = (noise + 1) / 2;

      let r, g, b;
      if (height < 0.3) {
        r = 30; g = 80; b = 120;
      } else if (height < 0.4) {
        r = 210; g = 190; b = 140;
      } else if (height < 0.6) {
        r = 34; g = 139; b = 34;
      } else if (height < 0.8) {
        r = 139; g = 119; b = 101;
      } else {
        r = 255; g = 255; b = 255;
      }

      const variation = (Math.random() - 0.5) * 20;
      data[idx] = Math.min(255, Math.max(0, r + variation));
      data[idx + 1] = Math.min(255, Math.max(0, g + variation));
      data[idx + 2] = Math.min(255, Math.max(0, b + variation));
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 10; i++) {
    const level = i * 0.1;
    ctx.beginPath();
    for (let x = 0; x < 512; x++) {
      let lastY = -1;
      for (let y = 0; y < 512; y++) {
        const noise = perlin2D(x * 0.01, y * 0.01) * 0.5 +
                      perlin2D(x * 0.02, y * 0.02) * 0.3;
        const h = (noise + 1) / 2;
        if (Math.abs(h - level) < 0.02) {
          if (lastY === -1 || Math.abs(y - lastY) > 5) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          lastY = y;
        }
      }
    }
    ctx.stroke();
  }
}

function drawNightLight(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, 512, 512);

  const cities = [
    { x: 100, y: 120, size: 35, intensity: 1 },
    { x: 250, y: 200, size: 50, intensity: 1.2 },
    { x: 400, y: 150, size: 40, intensity: 1 },
    { x: 150, y: 350, size: 30, intensity: 0.8 },
    { x: 350, y: 380, size: 45, intensity: 1.1 },
    { x: 420, y: 300, size: 25, intensity: 0.7 },
    { x: 80, y: 280, size: 20, intensity: 0.6 },
    { x: 280, y: 320, size: 28, intensity: 0.9 },
  ];

  cities.forEach(city => {
    const gradient = ctx.createRadialGradient(city.x, city.y, 0, city.x, city.y, city.size);
    gradient.addColorStop(0, `rgba(255, 230, 150, ${city.intensity})`);
    gradient.addColorStop(0.3, `rgba(255, 200, 100, ${city.intensity * 0.6})`);
    gradient.addColorStop(0.6, `rgba(255, 180, 80, ${city.intensity * 0.3})`);
    gradient.addColorStop(1, 'rgba(255, 150, 50, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(city.x, city.y, city.size, 0, Math.PI * 2);
    ctx.fill();
  });

  for (let i = 0; i < 300; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const size = Math.random() * 2 + 0.5;
    ctx.fillStyle = `rgba(255, 220, 130, ${Math.random() * 0.5 + 0.2})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(255, 200, 100, 0.3)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(100, 120);
  ctx.lineTo(250, 200);
  ctx.lineTo(400, 150);
  ctx.moveTo(250, 200);
  ctx.lineTo(350, 380);
  ctx.moveTo(150, 350);
  ctx.lineTo(280, 320);
  ctx.lineTo(350, 380);
  ctx.stroke();
}

function drawRoadmap(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#f5f5e8';
  ctx.fillRect(0, 0, 512, 512);

  ctx.fillStyle = '#a8d5a8';
  ctx.beginPath();
  ctx.ellipse(100, 100, 60, 45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(400, 350, 70, 50, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(420, 100, 40, 35, 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#87ceeb';
  ctx.beginPath();
  ctx.ellipse(250, 250, 35, 30, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#ff6b35';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 256);
  ctx.lineTo(180, 256);
  ctx.lineTo(220, 220);
  ctx.lineTo(320, 220);
  ctx.lineTo(350, 260);
  ctx.lineTo(512, 260);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(256, 0);
  ctx.lineTo(256, 150);
  ctx.lineTo(280, 180);
  ctx.lineTo(280, 350);
  ctx.lineTo(256, 400);
  ctx.lineTo(256, 512);
  ctx.stroke();

  ctx.strokeStyle = '#ffcc00';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(50, 100);
  ctx.lineTo(150, 150);
  ctx.lineTo(200, 130);
  ctx.lineTo(280, 180);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(350, 100);
  ctx.lineTo(400, 200);
  ctx.lineTo(450, 250);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(100, 400);
  ctx.lineTo(180, 350);
  ctx.lineTo(256, 400);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(350, 380);
  ctx.lineTo(420, 420);
  ctx.lineTo(480, 400);
  ctx.stroke();

  ctx.strokeStyle = '#999';
  ctx.lineWidth = 2;
  for (let i = 0; i < 15; i++) {
    const startX = Math.random() * 512;
    const startY = Math.random() * 512;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + (Math.random() - 0.5) * 100, startY + (Math.random() - 0.5) * 100);
    ctx.stroke();
  }

  const buildings = [
    { x: 200, y: 180, w: 25, h: 20 },
    { x: 290, y: 200, w: 30, h: 25 },
    { x: 150, y: 240, w: 20, h: 18 },
    { x: 380, y: 270, w: 28, h: 22 },
    { x: 180, y: 320, w: 22, h: 20 },
    { x: 300, y: 350, w: 24, h: 20 },
  ];

  buildings.forEach(b => {
    ctx.fillStyle = '#d4d4d4';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
  });
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function grad(hash: number, x: number, y: number): number {
  const h = hash & 3;
  const u = h < 2 ? x : y;
  const v = h < 2 ? y : x;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

const permutation = new Uint8Array(512);
for (let i = 0; i < 256; i++) {
  permutation[i] = i;
}
for (let i = 255; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [permutation[i], permutation[j]] = [permutation[j], permutation[i]];
}
for (let i = 0; i < 256; i++) {
  permutation[i + 256] = permutation[i];
}

function perlin2D(x: number, y: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  x -= Math.floor(x);
  y -= Math.floor(y);
  const u = fade(x);
  const v = fade(y);
  const A = permutation[X] + Y;
  const B = permutation[X + 1] + Y;
  return lerp(
    lerp(grad(permutation[A], x, y), grad(permutation[B], x - 1, y), u),
    lerp(grad(permutation[A + 1], x, y - 1), grad(permutation[B + 1], x - 1, y - 1), u),
    v
  );
}
