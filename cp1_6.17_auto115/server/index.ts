import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

interface Brand {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  headingFont: string;
  bodyFont: string;
  spacingUnit: number;
  createdAt: number;
  updatedAt: number;
}

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

let brands: Brand[] = [];
let lastActiveBrandId: string | null = null;

const HEADING_FONTS = [
  'Playfair Display',
  'Roboto',
  'Montserrat',
  'Open Sans',
  'Lato',
  'Poppins',
  'Merriweather',
  'Oswald'
];

function generateDefaultBrand(): Brand {
  const id = uuidv4();
  return {
    id,
    name: 'My Brand',
    primaryColor: '#6366F1',
    secondaryColor: '#10B981',
    headingFont: HEADING_FONTS[0],
    bodyFont: 'Inter',
    spacingUnit: 8,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

function generateCSS(brand: Brand): string {
  const spacingScale = {
    xs: `${brand.spacingUnit * 0.5}px`,
    sm: `${brand.spacingUnit}px`,
    md: `${brand.spacingUnit * 2}px`,
    lg: `${brand.spacingUnit * 3}px`,
    xl: `${brand.spacingUnit * 4}px`,
    '2xl': `${brand.spacingUnit * 6}px`
  };

  return `:root {
  --primary-color: ${brand.primaryColor};
  --secondary-color: ${brand.secondaryColor};
  --heading-font: '${brand.headingFont}', serif;
  --body-font: '${brand.bodyFont}', sans-serif;
  --spacing-unit: ${brand.spacingUnit}px;
  --spacing-xs: ${spacingScale.xs};
  --spacing-sm: ${spacingScale.sm};
  --spacing-md: ${spacingScale.md};
  --spacing-lg: ${spacingScale.lg};
  --spacing-xl: ${spacingScale.xl};
  --spacing-2xl: ${spacingScale['2xl']};
}

.btn-primary {
  background-color: var(--primary-color);
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: var(--spacing-sm) var(--spacing-md);
  font-family: var(--body-font);
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary:hover {
  filter: brightness(1.1);
}

.btn-primary:active {
  filter: brightness(0.95);
}

.btn-secondary {
  background-color: transparent;
  color: var(--primary-color);
  border: 2px solid var(--primary-color);
  border-radius: 8px;
  padding: calc(var(--spacing-sm) - 2px) calc(var(--spacing-md) - 2px);
  font-family: var(--body-font);
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  filter: brightness(1.1);
  background-color: color-mix(in srgb, var(--primary-color) 8%, transparent);
}

.btn-secondary:active {
  filter: brightness(0.95);
}

.brand-heading {
  font-family: var(--heading-font);
  font-size: 28px;
  font-weight: 700;
  color: var(--primary-color);
  line-height: 1.3;
  margin: 0 0 var(--spacing-md) 0;
}

.brand-paragraph {
  font-family: var(--body-font);
  font-size: 16px;
  font-weight: 400;
  line-height: 1.6;
  color: #334155;
  margin: 0 0 var(--spacing-md) 0;
}

.brand-card {
  background-color: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  padding: var(--spacing-lg);
  transition: all 0.3s ease;
}

.brand-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.brand-tag {
  display: inline-block;
  background-color: color-mix(in srgb, var(--secondary-color) 15%, transparent);
  color: var(--secondary-color);
  font-family: var(--body-font);
  font-size: 12px;
  font-weight: 500;
  border-radius: 4px;
  padding: var(--spacing-xs) var(--spacing-sm);
  line-height: 1;
}
`;
}

app.get('/api/brands', (_req: Request, res: Response) => {
  res.json({ brands, lastActiveBrandId });
});

app.get('/api/brands/:id', (req: Request, res: Response) => {
  const brand = brands.find(b => b.id === req.params.id);
  if (!brand) {
    return res.status(404).json({ error: 'Brand not found' });
  }
  lastActiveBrandId = brand.id;
  res.json(brand);
});

app.post('/api/brands', (req: Request, res: Response) => {
  const newBrand: Brand = {
    ...generateDefaultBrand(),
    ...req.body,
    id: uuidv4(),
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  brands.push(newBrand);
  lastActiveBrandId = newBrand.id;
  res.status(201).json(newBrand);
});

app.put('/api/brands/:id', (req: Request, res: Response) => {
  const index = brands.findIndex(b => b.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Brand not found' });
  }
  brands[index] = {
    ...brands[index],
    ...req.body,
    id: brands[index].id,
    createdAt: brands[index].createdAt,
    updatedAt: Date.now()
  };
  lastActiveBrandId = brands[index].id;
  res.json(brands[index]);
});

app.delete('/api/brands/:id', (req: Request, res: Response) => {
  const index = brands.findIndex(b => b.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Brand not found' });
  }
  const deleted = brands.splice(index, 1)[0];
  if (lastActiveBrandId === deleted.id) {
    lastActiveBrandId = brands.length > 0 ? brands[brands.length - 1].id : null;
  }
  res.json({ success: true });
});

app.get('/api/brands/:id/css', (req: Request, res: Response) => {
  const brand = brands.find(b => b.id === req.params.id);
  if (!brand) {
    return res.status(404).json({ error: 'Brand not found' });
  }
  const css = generateCSS(brand);
  res.setHeader('Content-Type', 'text/css');
  res.setHeader('Content-Disposition', `attachment; filename="${brand.name.replace(/\s+/g, '-').toLowerCase()}-theme.css"`);
  res.send(css);
});

app.post('/api/brands/default', (_req: Request, res: Response) => {
  if (brands.length === 0) {
    const defaultBrand = generateDefaultBrand();
    brands.push(defaultBrand);
    lastActiveBrandId = defaultBrand.id;
    return res.status(201).json(defaultBrand);
  }
  const activeBrand = brands.find(b => b.id === lastActiveBrandId) || brands[0];
  lastActiveBrandId = activeBrand.id;
  res.json(activeBrand);
});

app.listen(PORT, () => {
  console.log(`Brand Identity Kit server running on http://localhost:${PORT}`);
});
