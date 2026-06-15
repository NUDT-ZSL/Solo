import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

const products = [
  {
    id: uuidv4(),
    name: '复古皮革笔记本',
    price: 128,
    style: '复古',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=vintage%20leather%20notebook%20with%20gold%20embossed%20cover%20on%20wooden%20table&image_size=square_hd'
  },
  {
    id: uuidv4(),
    name: '极简陶瓷马克杯',
    price: 88,
    style: '极简',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=minimalist%20white%20ceramic%20mug%20with%20clean%20lines%20on%20white%20background&image_size=square_hd'
  },
  {
    id: uuidv4(),
    name: '自然系干花书签',
    price: 35,
    style: '自然',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=dried%20flower%20bookmark%20with%20pressed%20wildflowers%20natural%20botanical&image_size=square_hd'
  },
  {
    id: uuidv4(),
    name: '科技感金属笔',
    price: 168,
    style: '科技',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=futuristic%20metal%20pen%20with%20sleek%20design%20and%20LED%20indicator&image_size=square_hd'
  },
  {
    id: uuidv4(),
    name: '复古邮票贴纸套装',
    price: 45,
    style: '复古',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=vintage%20postage%20stamp%20sticker%20set%20retro%20design%20collection&image_size=square_hd'
  },
  {
    id: uuidv4(),
    name: '极简几何台灯',
    price: 268,
    style: '极简',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=minimalist%20geometric%20desk%20lamp%20modern%20design%20warm%20light&image_size=square_hd'
  },
  {
    id: uuidv4(),
    name: '自然风麻绳手账本',
    price: 78,
    style: '自然',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=natural%20hemp%20rope%20journal%20notebook%20eco%20friendly%20kraft%20paper&image_size=square_hd'
  },
  {
    id: uuidv4(),
    name: '科技无线充电座',
    price: 198,
    style: '科技',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=wireless%20charging%20pad%20sleek%20tech%20design%20with%20LED%20light&image_size=square_hd'
  },
  {
    id: uuidv4(),
    name: '复古黄铜印章',
    price: 158,
    style: '复古',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=vintage%20brass%20wax%20seal%20stamp%20ornate%20design%20on%20velvet&image_size=square_hd'
  },
  {
    id: uuidv4(),
    name: '极简布艺收纳盒',
    price: 65,
    style: '极简',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=minimalist%20fabric%20storage%20box%20neutral%20colors%20clean%20design&image_size=square_hd'
  },
  {
    id: uuidv4(),
    name: '自然松果装饰摆件',
    price: 52,
    style: '自然',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=pine%20cone%20decorative%20ornament%20natural%20forest%20theme%20wooden%20base&image_size=square_hd'
  },
  {
    id: uuidv4(),
    name: '科技蓝牙音箱',
    price: 328,
    style: '科技',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20bluetooth%20speaker%20sleek%20tech%20design%20minimalist%20style&image_size=square_hd'
  }
];

app.get('/api/products', (req, res) => {
  res.json(products);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api/products`);
});
