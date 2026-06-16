const express = require('express');
const cors = require('cors');
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const iconTemplates = {
  cat: [
    { name: 'cat-glasses', paths: [
      'M24 18 C20 10, 8 10, 6 18',
      'M24 18 C28 10, 40 10, 42 18',
      'M14 20 L14 30',
      'M34 20 L34 30',
      'M24 22 L24 34',
      'M18 24 Q14 26 16 30',
      'M30 24 Q34 26 32 30',
      'M16 36 Q24 42 32 36',
      'M12 14 Q14 12 16 14',
      'M32 14 Q34 12 36 14',
      'M10 18 Q18 16 22 18',
      'M26 18 Q30 16 38 18'
    ]},
    { name: 'cat-sleeping', paths: [
      'M14 20 Q12 12 8 10',
      'M34 20 Q36 12 40 10',
      'M24 16 Q18 14 14 18',
      'M24 16 Q30 14 34 18',
      'M18 24 Q20 26 22 24',
      'M26 24 Q28 26 30 24',
      'M24 28 L24 32',
      'M20 34 Q24 38 28 34',
      'M10 36 Q24 44 38 36',
      'M30 14 Q34 13 36 15'
    ]},
    { name: 'cat-playful', paths: [
      'M12 18 Q8 8 4 6',
      'M36 18 Q40 8 44 6',
      'M24 20 Q18 16 14 20',
      'M24 20 Q30 16 34 20',
      'M18 26 Q20 28 22 26',
      'M26 26 Q28 28 30 26',
      'M24 30 Q22 34 24 36 Q26 34 24 30',
      'M14 38 Q24 44 34 38',
      'M36 38 L40 42',
      'M38 36 L42 34'
    ]},
    { name: 'cat-sitting', paths: [
      'M16 16 Q12 8 10 6',
      'M32 16 Q36 8 38 6',
      'M24 14 Q18 12 14 16',
      'M24 14 Q30 12 34 16',
      'M18 22 L18 26',
      'M30 22 L30 26',
      'M24 20 L24 30',
      'M20 32 L20 40',
      'M28 32 L28 40',
      'M16 40 Q24 44 32 40',
      'M34 20 L42 18',
      'M40 22 L44 24'
    ]}
  ],
  star: [
    { name: 'star-bright', paths: [
      'M24 4 L29 18 L44 18 L32 27 L37 42 L24 33 L11 42 L16 27 L4 18 L19 18 Z',
      'M24 10 L27 20 L38 20 L29 26 L32 36 L24 30 L16 36 L19 26 L10 20 L21 20 Z'
    ]},
    { name: 'star-sparkle', paths: [
      'M24 6 L27 20 L42 20 L30 29 L34 44 L24 35 L14 44 L18 29 L6 20 L21 20 Z',
      'M24 14 L26 20 L32 20 L27 24 L29 30 L24 27 L19 30 L21 24 L16 20 L22 20 Z',
      'M8 10 L10 14 L14 14 L11 16 L12 20 L9 18 L6 20 L7 16 L4 14 L8 14 Z',
      'M40 28 L41 31 L44 31 L42 33 L43 36 L40 35 L37 36 L38 33 L36 31 L39 31 Z'
    ]},
    { name: 'star-twinkle', paths: [
      'M24 8 Q26 16 34 18 Q26 20 24 28 Q22 20 14 18 Q22 16 24 8',
      'M24 4 L26 16 L38 18 L26 20 L24 32 L22 20 L10 18 L22 16 Z',
      'M12 12 L14 18 L20 20 L14 22 L12 28 L10 22 L4 20 L10 18 Z'
    ]},
    { name: 'star-outlined', paths: [
      'M24 6 L28 18 L42 18 L31 26 L35 40 L24 31 L13 40 L17 26 L6 18 L20 18 Z',
      'M24 12 L26 19 L34 19 L28 24 L30 31 L24 27 L18 31 L20 24 L14 19 L22 19 Z'
    ]}
  ],
  heart: [
    { name: 'heart-love', paths: [
      'M24 42 Q10 32 6 20 Q6 10 16 8 Q24 8 24 16 Q24 8 32 8 Q42 10 42 20 Q38 32 24 42'
    ]},
    { name: 'heart-beat', paths: [
      'M24 40 Q12 30 8 20 Q8 12 16 10 Q22 10 24 16 Q26 10 32 10 Q40 12 40 20 Q36 30 24 40',
      'M16 24 L20 24 L22 20 L26 28 L28 24 L32 24'
    ]},
    { name: 'heart-lock', paths: [
      'M24 40 Q10 30 6 18 Q6 10 16 8 Q22 8 24 14 Q26 8 32 8 Q42 10 42 18 Q38 30 24 40',
      'M20 20 L20 16 Q20 12 24 12 Q28 12 28 16 L28 20',
      'M20 20 L28 20 L28 28 L20 28 Z',
      'M24 23 L24 26'
    ]},
    { name: 'heart-arrow', paths: [
      'M20 36 Q8 26 6 16 Q6 8 14 6 Q20 6 24 12 Q28 6 34 6 Q42 8 42 16 Q40 26 28 36',
      'M4 30 L30 4',
      'M28 6 L34 6 L30 12',
      'M6 28 L6 34 L12 34'
    ]}
  ],
  default: [
    { name: 'icon-1', paths: [
      'M24 8 L24 40',
      'M8 24 L40 24',
      'M12 12 L36 36',
      'M36 12 L12 36'
    ]},
    { name: 'icon-2', paths: [
      'M24 8 L40 24 L24 40 L8 24 Z',
      'M24 14 L34 24 L24 34 L14 24 Z'
    ]},
    { name: 'icon-3', paths: [
      'M24 6 A18 18 0 1 1 24 42 A18 18 0 1 1 24 6',
      'M24 12 A12 12 0 1 1 24 36 A12 12 0 1 1 24 12',
      'M24 18 A6 6 0 1 1 24 30 A6 6 0 1 1 24 18'
    ]},
    { name: 'icon-4', paths: [
      'M8 16 L40 16',
      'M8 24 L40 24',
      'M8 32 L40 32',
      'M16 8 L16 40',
      'M32 8 L32 40'
    ]}
  ]
};

function detectCategory(prompt) {
  const lower = prompt.toLowerCase();
  if (lower.includes('cat') || lower.includes('猫')) return 'cat';
  if (lower.includes('star') || lower.includes('星')) return 'star';
  if (lower.includes('heart') || lower.includes('心') || lower.includes('爱')) return 'heart';
  return 'default';
}

function generateRandomPaths() {
  const paths = [];
  const numPaths = 3 + Math.floor(Math.random() * 4);
  
  for (let i = 0; i < numPaths; i++) {
    const type = Math.random();
    if (type < 0.3) {
      const x1 = 8 + Math.random() * 32;
      const y1 = 8 + Math.random() * 32;
      const x2 = 8 + Math.random() * 32;
      const y2 = 8 + Math.random() * 32;
      paths.push(`M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}`);
    } else if (type < 0.6) {
      const cx = 12 + Math.random() * 24;
      const cy = 12 + Math.random() * 24;
      const rx = 4 + Math.random() * 12;
      const ry = 4 + Math.random() * 12;
      paths.push(`M${(cx - rx).toFixed(1)} ${cy.toFixed(1)} A${rx.toFixed(1)} ${ry.toFixed(1)} 0 1 0 ${(cx + rx).toFixed(1)} ${cy.toFixed(1)} A${rx.toFixed(1)} ${ry.toFixed(1)} 0 1 0 ${(cx - rx).toFixed(1)} ${cy.toFixed(1)}`);
    } else {
      const x1 = 8 + Math.random() * 10;
      const y1 = 20 + Math.random() * 20;
      const x2 = 30 + Math.random() * 10;
      const y2 = 20 + Math.random() * 20;
      const cx1 = 16 + Math.random() * 8;
      const cy1 = 8 + Math.random() * 12;
      const cx2 = 24 + Math.random() * 8;
      const cy2 = 8 + Math.random() * 12;
      paths.push(`M${x1.toFixed(1)} ${y1.toFixed(1)} C${cx1.toFixed(1)} ${cy1.toFixed(1)}, ${cx2.toFixed(1)} ${cy2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`);
    }
  }
  
  return paths;
}

app.post('/api/generate', (req, res) => {
  const { prompt } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }
  
  const category = detectCategory(prompt);
  const templates = iconTemplates[category] || iconTemplates.default;
  
  const icons = templates.map((template, index) => ({
    id: uuidv4(),
    name: `${template.name}-${Date.now()}-${index}`,
    paths: template.paths,
    viewBox: '0 0 48 48'
  }));
  
  setTimeout(() => {
    res.json({ icons });
  }, 800);
});

app.post('/api/export', (req, res) => {
  const { icons, format } = req.body;
  
  if (!icons || !Array.isArray(icons)) {
    return res.status(400).json({ error: 'Icons are required' });
  }
  
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename=icons.zip');
  
  const archive = archiver('zip', {
    zlib: { level: 9 }
  });
  
  archive.pipe(res);
  
  icons.forEach((icon) => {
    if (format === 'svg') {
      const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  ${icon.paths.map(p => `<path d="${p}"/>`).join('\n  ')}
</svg>`;
      archive.append(svgContent, { name: `${icon.name}.svg` });
    } else if (format === 'png') {
      const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  ${icon.paths.map(p => `<path d="${p}"/>`).join('\n  ')}
</svg>`;
      archive.append(Buffer.from(svgContent), { name: `${icon.name}.svg` });
    }
  });
  
  archive.finalize();
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
