import express from 'express';
import { getWorks, getWorkById, createOrder } from '../database';

const router = express.Router();

router.get('/works', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 8;
    const category = req.query.category as string | undefined;

    const result = await getWorks(page, pageSize, category);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取作品列表失败' });
  }
});

router.get('/works/:id', async (req, res) => {
  try {
    const work = await getWorkById(req.params.id);
    if (!work) {
      res.status(404).json({ success: false, error: '作品不存在' });
      return;
    }
    res.json({ success: true, data: work });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取作品详情失败' });
  }
});

router.post('/orders', async (req, res) => {
  try {
    const { customer_name, phone, items, total_price } = req.body;

    if (!customer_name || !phone || !items || !total_price) {
      res.status(400).json({ success: false, error: '缺少必要参数' });
      return;
    }

    const order = await createOrder({
      customer_name,
      phone,
      items: JSON.stringify(items),
      total_price,
      status: 'pending'
    });

    res.json({ success: true, data: { id: order.id, message: '订单创建成功' } });
  } catch (error) {
    res.status(500).json({ success: false, error: '订单创建失败' });
  }
});

export default router;
