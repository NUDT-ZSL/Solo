const express = require('express');
const cors = require('cors');
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const shapeGenerators = {
  cat: (variant = 0) => {
    const basePaths = [
      'M24 18 C20 10, 8 10, 6 18',
      'M24 18 C28 10, 40 10, 42 18',
      'M14 20 L14 30',
      'M34 20 L34 30',
      'M24 22 L24 34',
      'M18 24 Q14 26 16 30',
      'M30 24 Q34 26 32 30',
      'M16 36 Q24 42 32 36',
      'M12 14 Q14 12 16 14',
      'M32 14 Q34 12 36 14'
    ];
    
    if (variant === 1) {
      basePaths.push('M10 18 Q18 16 22 18');
      basePaths.push('M26 18 Q30 16 38 18');
    }
    if (variant === 2) {
      basePaths.push('M18 28 Q20 30 22 28');
      basePaths.push('M26 28 Q28 30 30 28');
    }
    
    return basePaths;
  },
  
  sunglasses: (variant = 0) => {
    const offsetY = variant * 2;
    return [
      `M6 ${14 + offsetY} L18 ${14 + offsetY}`,
      `M30 ${14 + offsetY} L42 ${14 + offsetY}`,
      `M12 ${10 + offsetY} Q12 ${18 + offsetY} 18 ${18 + offsetY} Q24 ${18 + offsetY} 24 ${14 + offsetY} Q24 ${10 + offsetY} 18 ${10 + offsetY} Q12 ${10 + offsetY} 12 ${14 + offsetY}`,
      `M30 ${10 + offsetY} Q30 ${18 + offsetY} 36 ${18 + offsetY} Q42 ${18 + offsetY} 42 ${14 + offsetY} Q42 ${10 + offsetY} 36 ${10 + offsetY} Q30 ${10 + offsetY} 30 ${14 + offsetY}`,
      `M18 ${14 + offsetY} L30 ${14 + offsetY}`
    ];
  },
  
  star: (variant = 0) => {
    const cx = 24 + (variant - 1) * 3;
    const cy = 24 + (variant - 1) * 3;
    const outerR = 20;
    const innerR = 8;
    const points = [];
    
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (Math.PI / 5) * i - Math.PI / 2;
      points.push(`${cx + r * Math.cos(angle)} ${cy + r * Math.sin(angle)}`);
    }
    
    return [`M${points.join(' L')} Z`];
  },
  
  heart: (variant = 0) => {
    const scale = 1 + variant * 0.15;
    const s = scale;
    const cx = 24;
    const cy = 26;
    return [
      `M${cx} ${cy + 16 * s} Q${cx - 14 * s} ${cy + 6 * s} ${cx - 18 * s} ${cy - 6 * s} Q${cx - 18 * s} ${cy - 16 * s} ${cx - 8 * s} ${cy - 18 * s} Q${cx - 2 * s} ${cy - 18 * s} ${cx} ${cy - 10 * s} Q${cx + 2 * s} ${cy - 18 * s} ${cx + 8 * s} ${cy - 18 * s} Q${cx + 18 * s} ${cy - 16 * s} ${cx + 18 * s} ${cy - 6 * s} Q${cx + 14 * s} ${cy + 6 * s} ${cx} ${cy + 16 * s}`
    ];
  },
  
  circle: (variant = 0) => {
    const cx = 24 + variant * 2;
    const cy = 24;
    const r = 16 - variant * 3;
    return [
      `M${cx - r} ${cy} A${r} ${r} 0 1 0 ${cx + r} ${cy} A${r} ${r} 0 1 0 ${cx - r} ${cy}`
    ];
  },
  
  square: (variant = 0) => {
    const size = 24 - variant * 4;
    const x1 = 24 - size / 2;
    const y1 = 24 - size / 2;
    const x2 = 24 + size / 2;
    const y2 = 24 + size / 2;
    return [
      `M${x1} ${y1} L${x2} ${y1} L${x2} ${y2} L${x1} ${y2} Z`
    ];
  },
  
  triangle: (variant = 0) => {
    const size = 20 + variant * 2;
    const cx = 24;
    const cy = 24;
    return [
      `M${cx} ${cy - size} L${cx + size} ${cy + size * 0.7} L${cx - size} ${cy + size * 0.7} Z`
    ];
  },
  
  house: (variant = 0) => {
    const offset = variant * 2;
    return [
      `M${8 + offset} ${42 - offset} L${8 + offset} ${24 - offset} L${24} ${8 + offset} L${40 - offset} ${24 - offset} L${40 - offset} ${42 - offset} Z`,
      `M${18 + offset} ${42 - offset} L${18 + offset} ${32 - offset} L${30 - offset} ${32 - offset} L${30 - offset} ${42 - offset} Z`,
      `M${24} ${8 + offset} L${24} ${8 + offset}`
    ];
  },
  
  tree: (variant = 0) => {
    const scale = 1 + variant * 0.15;
    const s = scale;
    return [
      `M${24} ${6 * s} L${36 * s} ${24} L${12 * (2 - s)} ${24} Z`,
      `M${24} ${14 * s} L${38 * s} ${32} L${10 * (2 - s)} ${32} Z`,
      `M${24} ${22 * s} L${40 * s} ${40} L${8 * (2 - s)} ${40} Z`,
      `M${20} ${40} L${20} ${44} L${28} ${44} L${28} ${40} Z`
    ];
  },
  
  sun: (variant = 0) => {
    const paths = [];
    const cx = 24;
    const cy = 24;
    const r = 10 - variant * 2;
    paths.push(`M${cx - r} ${cy} A${r} ${r} 0 1 0 ${cx + r} ${cy} A${r} ${r} 0 1 0 ${cx - r} ${cy}`);
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI / 4) * i;
      const r1 = r + 4;
      const r2 = r + 10;
      paths.push(`M${cx + r1 * Math.cos(angle)} ${cy + r1 * Math.sin(angle)} L${cx + r2 * Math.cos(angle)} ${cy + r2 * Math.sin(angle)}`);
    }
    return paths;
  },
  
  moon: (variant = 0) => {
    const offset = variant * 3;
    return [
      `M${30 + offset} 10 A16 16 0 1 0 ${30 + offset} 38 A12 12 0 1 1 ${30 + offset} 10`
    ];
  },
  
  cloud: (variant = 0) => {
    const offset = variant * 2;
    return [
      `M${10 + offset} 32 A8 8 0 0 1 ${18 + offset} 24 Q${18 + offset} 18 ${24 + offset} 18 Q${30 + offset} 18 ${30 + offset} 24 Q${38 + offset} 24 ${38 + offset} 30 Q${38 + offset} 36 ${32 + offset} 36 L${16 + offset} 36 Q${10 + offset} 36 ${10 + offset} 32`
    ];
  },
  
  music: (variant = 0) => {
    const offset = variant * 4;
    return [
      `M${16 + offset} 16 L${16 + offset} 32`,
      `M${16 + offset} 32 A4 4 0 1 1 ${12 + offset} 32`,
      `M${16 + offset} 16 L${32 + offset} 10 L${32 + offset} 28`,
      `M${32 + offset} 28 A4 4 0 1 1 ${28 + offset} 28`
    ];
  },
  
  lightning: (variant = 0) => {
    const offset = variant * 2;
    return [
      `M${26 + offset} 4 L${14 + offset} 24 L${22 + offset} 24 L${18 + offset} 44 L${34 + offset} 20 L${26 + offset} 20 L${30 + offset} 4 Z`
    ];
  },
  
  gear: (variant = 0) => {
    const paths = [];
    const cx = 24;
    const cy = 24;
    const outerR = 18;
    const innerR = 10;
    const teeth = 8;
    
    for (let i = 0; i < teeth * 2; i++) {
      const r = i % 2 === 0 ? outerR : outerR - 4;
      const angle = (Math.PI / teeth) * i - Math.PI / 2;
      paths.push(`${cx + r * Math.cos(angle)} ${cy + r * Math.sin(angle)}`);
    }
    paths.push(paths[0]);
    
    return [
      `M${paths.join(' L')}`,
      `M${cx - innerR} ${cy} A${innerR} ${innerR} 0 1 0 ${cx + innerR} ${cy} A${innerR} ${innerR} 0 1 0 ${cx - innerR} ${cy}`
    ];
  }
};

const keywordMappings = [
  { keywords: ['猫', 'cat', 'kitty', '猫咪'], shapes: ['cat'], name: 'cat' },
  { keywords: ['太阳镜', 'sunglass', '眼镜', 'glasses'], shapes: ['sunglasses'], name: 'sunglasses' },
  { keywords: ['星星', 'star', '星'], shapes: ['star'], name: 'star' },
  { keywords: ['心', '爱心', 'heart', 'love'], shapes: ['heart'], name: 'heart' },
  { keywords: ['圆', 'circle', '球', '球'], shapes: ['circle'], name: 'circle' },
  { keywords: ['方', 'square', '正方形', '方块'], shapes: ['square'], name: 'square' },
  { keywords: ['三角', 'triangle'], shapes: ['triangle'], name: 'triangle' },
  { keywords: ['房子', 'house', '家', 'home'], shapes: ['house'], name: 'house' },
  { keywords: ['树', 'tree', '树木'], shapes: ['tree'], name: 'tree' },
  { keywords: ['太阳', 'sun', '日'], shapes: ['sun'], name: 'sun' },
  { keywords: ['月亮', 'moon', '月'], shapes: ['moon'], name: 'moon' },
  { keywords: ['云', 'cloud', '云朵'], shapes: ['cloud'], name: 'cloud' },
  { keywords: ['音乐', 'music', '音符', 'note'], shapes: ['music'], name: 'music' },
  { keywords: ['闪电', 'lightning', '雷电', '雷'], shapes: ['lightning'], name: 'lightning' },
  { keywords: ['齿轮', 'gear', '设置', 'setting'], shapes: ['gear'], name: 'gear' }
];

function detectShapes(prompt) {
  const lower = prompt.toLowerCase();
  const detectedShapes = [];
  const detectedNames = [];
  
  for (const mapping of keywordMappings) {
    for (const keyword of mapping.keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        for (const shape of mapping.shapes) {
          if (!detectedShapes.includes(shape)) {
            detectedShapes.push(shape);
            detectedNames.push(mapping.name);
          }
        }
        break;
      }
    }
  }
  
  if (detectedShapes.length === 0) {
    detectedShapes.push('circle', 'square', 'triangle', 'star');
    detectedNames.push('default');
  }
  
  return { shapes: detectedShapes, names: detectedNames };
}

function generateIconPaths(shapeNames, variant) {
  const paths = [];
  
  for (let i = 0; i < shapeNames.length; i++) {
    const shapeName = shapeNames[i];
    const gen = shapeGenerators[shapeName];
    if (gen) {
      const shapePaths = gen(variant + i);
      paths.push(...shapePaths);
    }
  }
  
  if (paths.length === 0) {
    paths.push('M24 8 L24 40', 'M8 24 L40 24');
  }
  
  return paths;
}

function generateIcons(prompt, count = 4) {
  const { shapes, names } = detectShapes(prompt);
  const icons = [];
  
  for (let i = 0; i < count; i++) {
    const variant = i;
    const paths = generateIconPaths(shapes, variant);
    const baseName = names.join('-') || 'icon';
    
    icons.push({
      id: uuidv4(),
      name: `${baseName}-${Date.now()}-${i}`,
      paths: paths,
      viewBox: '0 0 48 48'
    });
  }
  
  return icons;
}

app.post('/api/generate', (req, res) => {
  const { prompt } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }
  
  const icons = generateIcons(prompt, 4);
  
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
    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  ${icon.paths.map(p => `<path d="${p}"/>`).join('\n  ')}
</svg>`;
    
    if (format === 'svg') {
      archive.append(svgContent, { name: `${icon.name}.svg` });
    } else if (format === 'png') {
      archive.append(svgContent, { name: `${icon.name}.svg` });
      const pngNote = `PNG export - convert SVG to PNG using external tool\n\nSVG source included for reference.`;
      archive.append(pngNote, { name: 'README.txt' });
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
