import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import * as db from './database.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

const CATEGORIES = ['首饰', '陶艺', '布艺', '木工', '插画'];

interface ValidationError {
  field: string;
  message: string;
}

function validateProduct(data: any): ValidationError[] {
  const errors: ValidationError[] = [];

  if (data.name !== undefined) {
    if (typeof data.name !== 'string') {
      errors.push({ field: 'name', message: '名称必须是字符串' });
    } else if (data.name.length === 0) {
      errors.push({ field: 'name', message: '名称不能为空' });
    } else if (data.name.length > 30) {
      errors.push({ field: 'name', message: '名称最多30字' });
    }
  }

  if (data.category !== undefined) {
    if (!CATEGORIES.includes(data.category)) {
      errors.push({ field: 'category', message: `品类必须是以下之一：${CATEGORIES.join('、')}` });
    }
  }

  if (data.price !== undefined) {
    const price = Number(data.price);
    if (isNaN(price)) {
      errors.push({ field: 'price', message: '价格必须是数字' });
    } else if (price < 0.01 || price > 9999.99) {
      errors.push({ field: 'price', message: '价格必须在0.01-9999.99之间' });
    }
  }

  if (data.stock !== undefined) {
    const stock = Number(data.stock);
    if (!Number.isInteger(stock)) {
      errors.push({ field: 'stock', message: '库存必须是整数' });
    } else if (stock <= 0) {
      errors.push({ field: 'stock', message: '库存必须是正整数' });
    }
  }

  return errors;
}

function validateSale(data: any): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    errors.push({ field: 'items', message: '销售商品不能为空' });
  } else {
    data.items.forEach((item: any, index: number) => {
      if (!item.productId) {
        errors.push({ field: `items[${index}].productId`, message: '商品ID不能为空' });
      }
      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        errors.push({ field: `items[${index}].quantity`, message: '数量必须是正整数' });
      }
      const price = Number(item.price);
      if (isNaN(price) || price < 0.01) {
        errors.push({ field: `items[${index}].price`, message: '价格必须大于0' });
      }
    });
  }

  const total = Number(data.total);
  if (isNaN(total) || total < 0.01) {
    errors.push({ field: 'total', message: '总金额必须大于0' });
  }

  return errors;
}

app.get('/api/products', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const products = db.getProducts();
    res.json(products);
  } catch (error) {
    next(error);
  }
});

app.get('/api/products/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const product = db.getProductById(id);
    if (!product) {
      res.status(404).json({ error: '商品不存在' });
      return;
    }
    res.json(product);
  } catch (error) {
    next(error);
  }
});

app.post('/api/products', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, category, price, stock } = req.body;

    if (!name || !category || price === undefined || stock === undefined) {
      res.status(400).json({ error: '缺少必填字段', fields: ['name', 'category', 'price', 'stock'] });
      return;
    }

    const errors = validateProduct(req.body);
    if (errors.length > 0) {
      res.status(400).json({ error: '数据验证失败', errors });
      return;
    }

    const product = db.createProduct({
      name,
      category,
      price: Number(price),
      stock: Number(stock),
    });
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
});

app.put('/api/products/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = db.getProductById(id);

    if (!existing) {
      res.status(404).json({ error: '商品不存在' });
      return;
    }

    const errors = validateProduct(req.body);
    if (errors.length > 0) {
      res.status(400).json({ error: '数据验证失败', errors });
      return;
    }

    const updateData: Partial<{ name: string; category: string; price: number; stock: number }> = {};
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.category !== undefined) updateData.category = req.body.category;
    if (req.body.price !== undefined) updateData.price = Number(req.body.price);
    if (req.body.stock !== undefined) updateData.stock = Number(req.body.stock);

    const updated = db.updateProduct(id, updateData);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/products/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const success = db.deleteProduct(id);
    res.json({ success });
  } catch (error) {
    next(error);
  }
});

app.post('/api/sales', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { items, total } = req.body;

    const errors = validateSale(req.body);
    if (errors.length > 0) {
      res.status(400).json({ error: '数据验证失败', errors });
      return;
    }

    const sale = db.createSale(items, Number(total));
    res.status(201).json(sale);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Product not found')) {
      res.status(400).json({ error: error.message });
      return;
    }
    next(error);
  }
});

app.get('/api/sales/today', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = db.getTodaySalesStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server error:', error);
  res.status(500).json({ error: '服务器内部错误', message: error.message });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API endpoints available:`);
  console.log(`  GET    /api/products`);
  console.log(`  GET    /api/products/:id`);
  console.log(`  POST   /api/products`);
  console.log(`  PUT    /api/products/:id`);
  console.log(`  DELETE /api/products/:id`);
  console.log(`  POST   /api/sales`);
  console.log(`  GET    /api/sales/today`);
});
