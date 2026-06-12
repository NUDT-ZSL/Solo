import express from 'express';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const db = new Database('couponcrafter.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS coupons (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    amount INTEGER NOT NULL,
    threshold REAL NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    daily_limit INTEGER NOT NULL DEFAULT 50,
    total_claimed INTEGER NOT NULL DEFAULT 0,
    total_redeemed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS claims (
    id TEXT PRIMARY KEY,
    coupon_id TEXT NOT NULL,
    claimed_at TEXT NOT NULL,
    claim_date TEXT NOT NULL,
    FOREIGN KEY (coupon_id) REFERENCES coupons(id)
  );

  CREATE TABLE IF NOT EXISTS redemptions (
    id TEXT PRIMARY KEY,
    coupon_id TEXT NOT NULL,
    order_amount REAL NOT NULL,
    note TEXT,
    redeemed_at TEXT NOT NULL,
    redemption_date TEXT NOT NULL,
    FOREIGN KEY (coupon_id) REFERENCES coupons(id)
  );
`);

const seedData = () => {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM coupons').get() as { cnt: number };
  if (count.cnt > 0) return;

  const couponTemplates = [
    { name: '新用户专享立减券', amount: 10, threshold: 50, days: 30 },
    { name: '满减通用优惠券', amount: 20, threshold: 100, days: 45 },
    { name: '周末狂欢大额券', amount: 50, threshold: 200, days: 60 },
    { name: '会员专属折扣券', amount: 15, threshold: 80, days: 20 },
    { name: '节日特惠优惠券', amount: 30, threshold: 150, days: 15 },
    { name: '新人首单立减', amount: 5, threshold: 30, days: 90 },
    { name: '品质生活优惠', amount: 25, threshold: 120, days: 35 },
    { name: '限时秒杀券', amount: 100, threshold: 500, days: 7 },
    { name: '老用户回馈券', amount: 40, threshold: 180, days: 40 },
    { name: '品牌日专属券', amount: 35, threshold: 160, days: 25 },
  ];

  const insertCoupon = db.prepare(`
    INSERT INTO coupons (id, name, amount, threshold, start_date, end_date, daily_limit, total_claimed, total_redeemed, created_at)
    VALUES (@id, @name, @amount, @threshold, @start_date, @end_date, @daily_limit, @total_claimed, @total_redeemed, @created_at)
  `);

  const insertClaim = db.prepare(`
    INSERT INTO claims (id, coupon_id, claimed_at, claim_date)
    VALUES (@id, @coupon_id, @claimed_at, @claim_date)
  `);

  const insertRedemption = db.prepare(`
    INSERT INTO redemptions (id, coupon_id, order_amount, note, redeemed_at, redemption_date)
    VALUES (@id, @coupon_id, @order_amount, @note, @redeemed_at, @redemption_date)
  `);

  const updateCoupon = db.prepare(`
    UPDATE coupons SET total_claimed = @total_claimed, total_redeemed = @total_redeemed WHERE id = @id
  `);

  const transaction = db.transaction(() => {
    for (let i = 0; i < 100; i++) {
      const tpl = couponTemplates[i % couponTemplates.length];
      const startOffset = Math.floor(Math.random() * 10) - 5;
      const endOffset = tpl.days + Math.floor(Math.random() * 10);
      const startDate = dayjs().add(startOffset, 'day').format('YYYY-MM-DD');
      const endDate = dayjs().add(endOffset, 'day').format('YYYY-MM-DD');
      const dailyLimit = Math.floor(Math.random() * 200) + 50;
      const claimed = Math.floor(Math.random() * dailyLimit * 10);
      const redeemed = Math.floor(claimed * 0.4);

      const couponId = uuidv4();
      insertCoupon.run({
        id: couponId,
        name: `${tpl.name} #${i + 1}`,
        amount: tpl.amount,
        threshold: tpl.threshold,
        start_date: startDate,
        end_date: endDate,
        daily_limit: dailyLimit,
        total_claimed: claimed,
        total_redeemed: redeemed,
        created_at: dayjs().toISOString(),
      });

      for (let j = 0; j < Math.min(claimed, 50); j++) {
        const daysAgo = Math.floor(Math.random() * 30);
        const claimDate = dayjs().subtract(daysAgo, 'day');
        insertClaim.run({
          id: uuidv4(),
          coupon_id: couponId,
          claimed_at: claimDate.toISOString(),
          claim_date: claimDate.format('YYYY-MM-DD'),
        });
      }

      for (let j = 0; j < Math.min(redeemed, 30); j++) {
        const daysAgo = Math.floor(Math.random() * 25);
        const redeemDate = dayjs().subtract(daysAgo, 'day');
        insertRedemption.run({
          id: uuidv4(),
          coupon_id: couponId,
          order_amount: tpl.threshold + Math.floor(Math.random() * 200),
          note: ['线下门店使用', '线上订单核销', 'APP下单', '小程序核销'][Math.floor(Math.random() * 4)],
          redeemed_at: redeemDate.toISOString(),
          redemption_date: redeemDate.format('YYYY-MM-DD'),
        });
      }

      updateCoupon.run({ id: couponId, total_claimed: claimed, total_redeemed: redeemed });
    }
  });

  transaction();
  console.log('Mock data seeded: 100 coupons');
};

seedData();

app.get('/api/coupons', (req, res) => {
  const { search = '', status = 'all' } = req.query;
  const today = dayjs().format('YYYY-MM-DD');

  let where = 'WHERE 1=1';
  const params: Record<string, string> = {};

  if (search) {
    where += ' AND name LIKE @search';
    params.search = `%${search}%`;
  }

  let query = `SELECT * FROM coupons ${where}`;
  let coupons = db.prepare(query).all(params) as any[];

  coupons = coupons.map((c: any) => {
    const todayClaims = db.prepare('SELECT COUNT(*) as cnt FROM claims WHERE coupon_id = ? AND claim_date = ?').get(c.id, today) as { cnt: number };
    const remaining = c.daily_limit - todayClaims.cnt;
    const isExpired = dayjs(c.end_date).isBefore(today);
    const isSoldOut = c.daily_limit > 0 && remaining <= 0;
    const isActive = !isExpired && !isSoldOut;

    let s = 'active';
    if (isExpired) s = 'expired';
    else if (isSoldOut) s = 'sold_out';

    return {
      ...c,
      today_remaining: Math.max(0, remaining),
      today_claimed: todayClaims.cnt,
      status: s,
    };
  });

  if (status === 'active') {
    coupons = coupons.filter((c: any) => c.status === 'active');
  } else if (status === 'expired') {
    coupons = coupons.filter((c: any) => c.status === 'expired');
  } else if (status === 'sold_out') {
    coupons = coupons.filter((c: any) => c.status === 'sold_out');
  }

  coupons.sort((a: any, b: any) => b.today_remaining - a.today_remaining);

  setTimeout(() => res.json(coupons), 200);
});

app.get('/api/coupons/:id', (req, res) => {
  const { id } = req.params;
  const today = dayjs().format('YYYY-MM-DD');

  const coupon = db.prepare('SELECT * FROM coupons WHERE id = ?').get(id) as any;
  if (!coupon) {
    return res.status(404).json({ error: 'Coupon not found' });
  }

  const todayClaims = db.prepare('SELECT COUNT(*) as cnt FROM claims WHERE coupon_id = ? AND claim_date = ?').get(id, today) as { cnt: number };
  const remaining = coupon.daily_limit - todayClaims.cnt;
  const isExpired = dayjs(coupon.end_date).isBefore(today);
  const isSoldOut = coupon.daily_limit > 0 && remaining <= 0;

  coupon.today_remaining = Math.max(0, remaining);
  coupon.today_claimed = todayClaims.cnt;
  coupon.status = isExpired ? 'expired' : isSoldOut ? 'sold_out' : 'active';

  setTimeout(() => res.json(coupon), 150);
});

app.post('/api/coupons', (req, res) => {
  const { name, amount, threshold, start_date, end_date, daily_limit = 50 } = req.body;

  const errors: Record<string, string> = {};
  if (!name || !name.trim()) errors.name = '优惠券名称必填';
  if (!amount || !Number.isInteger(amount) || amount < 1 || amount > 100) errors.amount = '面额必须是1-100的正整数';
  if (threshold === undefined || isNaN(threshold) || threshold <= 0) errors.threshold = '门槛金额必须大于0';
  else if (threshold <= amount) errors.threshold = '门槛金额必须大于面额';
  if (!start_date) errors.start_date = '开始日期必填';
  if (!end_date) errors.end_date = '结束日期必填';
  else if (start_date && dayjs(end_date).isBefore(start_date)) errors.end_date = '截止日期不能早于开始日期';
  if (!daily_limit || !Number.isInteger(daily_limit) || daily_limit < 1 || daily_limit > 500) errors.daily_limit = '每日上限必须是1-500的整数';

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  const id = uuidv4();
  const now = dayjs().toISOString();

  db.prepare(`
    INSERT INTO coupons (id, name, amount, threshold, start_date, end_date, daily_limit, total_claimed, total_redeemed, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?)
  `).run(id, name.trim(), amount, threshold, start_date, end_date, daily_limit, now);

  const coupon = db.prepare('SELECT * FROM coupons WHERE id = ?').get(id);
  setTimeout(() => res.status(201).json(coupon), 300);
});

app.post('/api/coupons/:id/claim', (req, res) => {
  const { id } = req.params;
  const today = dayjs().format('YYYY-MM-DD');

  const coupon = db.prepare('SELECT * FROM coupons WHERE id = ?').get(id) as any;
  if (!coupon) {
    return res.status(404).json({ error: '优惠券不存在' });
  }

  if (dayjs(coupon.end_date).isBefore(today)) {
    return res.status(400).json({ error: '优惠券已过期' });
  }

  const todayClaims = db.prepare('SELECT COUNT(*) as cnt FROM claims WHERE coupon_id = ? AND claim_date = ?').get(id, today) as { cnt: number };
  if (todayClaims.cnt >= coupon.daily_limit) {
    return res.status(400).json({ error: '今日领取已达上限' });
  }

  const claimId = uuidv4();
  const now = dayjs();

  const tx = db.transaction(() => {
    db.prepare('INSERT INTO claims (id, coupon_id, claimed_at, claim_date) VALUES (?, ?, ?, ?)').run(claimId, id, now.toISOString(), today);
    db.prepare('UPDATE coupons SET total_claimed = total_claimed + 1 WHERE id = ?').run(id);
  });

  tx();

  const updated = db.prepare('SELECT * FROM coupons WHERE id = ?').get(id) as any;
  const newTodayClaims = db.prepare('SELECT COUNT(*) as cnt FROM claims WHERE coupon_id = ? AND claim_date = ?').get(id, today) as { cnt: number };
  updated.today_remaining = Math.max(0, updated.daily_limit - newTodayClaims.cnt);
  updated.today_claimed = newTodayClaims.cnt;
  updated.status = 'active';

  setTimeout(() => res.json({ success: true, claim_id: claimId, coupon: updated }), 300);
});

app.post('/api/coupons/:id/redeem', (req, res) => {
  const { id } = req.params;
  const { order_amount, note = '' } = req.body;
  const today = dayjs().format('YYYY-MM-DD');

  const coupon = db.prepare('SELECT * FROM coupons WHERE id = ?').get(id) as any;
  if (!coupon) {
    return res.status(404).json({ error: '优惠券不存在' });
  }

  const errors: Record<string, string> = {};
  if (order_amount === undefined || isNaN(order_amount) || order_amount <= 0) {
    errors.order_amount = '请输入有效的订单金额';
  } else if (order_amount < coupon.threshold) {
    errors.order_amount = `订单金额不能小于使用门槛 ¥${coupon.threshold}`;
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  const redemptionId = uuidv4();
  const now = dayjs();
  const noteTruncated = note.substring(0, 50);

  const tx = db.transaction(() => {
    db.prepare('INSERT INTO redemptions (id, coupon_id, order_amount, note, redeemed_at, redemption_date) VALUES (?, ?, ?, ?, ?, ?)').run(
      redemptionId, id, order_amount, noteTruncated, now.toISOString(), today
    );
    db.prepare('UPDATE coupons SET total_redeemed = total_redeemed + 1 WHERE id = ?').run(id);
  });

  tx();

  setTimeout(() => res.json({
    success: true,
    redemption_id: redemptionId,
    saved: coupon.amount,
    redemption: {
      id: redemptionId,
      coupon_id: id,
      order_amount,
      note: noteTruncated,
      redeemed_at: now.toISOString(),
    },
  }), 400);
});

app.get('/api/stats/summary', (req, res) => {
  const { start_date, end_date } = req.query;
  const today = dayjs();
  const defaultEnd = today.format('YYYY-MM-DD');
  const defaultStart = today.subtract(6, 'day').format('YYYY-MM-DD');

  const s = (start_date as string) || defaultStart;
  const e = (end_date as string) || defaultEnd;

  const totalCoupons = db.prepare('SELECT COUNT(*) as cnt FROM coupons').get() as { cnt: number };
  const totalClaims = db.prepare('SELECT COUNT(*) as cnt FROM claims WHERE claim_date BETWEEN ? AND ?').get(s, e) as { cnt: number };
  const totalRedemptions = db.prepare('SELECT COUNT(*) as cnt FROM redemptions WHERE redemption_date BETWEEN ? AND ?').get(s, e) as { cnt: number };
  const totalSaved = db.prepare('SELECT COALESCE(SUM(c.amount), 0) as total FROM redemptions r JOIN coupons c ON r.coupon_id = c.id WHERE r.redemption_date BETWEEN ? AND ?').get(s, e) as { total: number };

  setTimeout(() => res.json({
    total_coupons: totalCoupons.cnt,
    total_claims: totalClaims.cnt,
    total_redemptions: totalRedemptions.cnt,
    total_saved: totalSaved.total,
    date_range: { start: s, end: e },
  }), 200);
});

app.get('/api/stats/daily-redemptions', (req, res) => {
  const { start_date, end_date } = req.query;
  const today = dayjs();
  const defaultEnd = today.format('YYYY-MM-DD');
  const defaultStart = today.subtract(6, 'day').format('YYYY-MM-DD');

  const s = (start_date as string) || defaultStart;
  const e = (end_date as string) || defaultEnd;

  const rows = db.prepare(`
    SELECT redemption_date as date, COUNT(*) as count
    FROM redemptions
    WHERE redemption_date BETWEEN ? AND ?
    GROUP BY redemption_date
    ORDER BY redemption_date ASC
  `).all(s, e) as { date: string; count: number }[];

  const dateMap = new Map(rows.map(r => [r.date, r.count]));
  const result: { date: string; count: number }[] = [];
  let current = dayjs(s);
  const end = dayjs(e);

  while (current.isBefore(end) || current.isSame(end, 'day')) {
    const d = current.format('YYYY-MM-DD');
    result.push({ date: d, count: dateMap.get(d) || 0 });
    current = current.add(1, 'day');
  }

  setTimeout(() => res.json(result), 200);
});

app.get('/api/stats/coupon-redemptions', (req, res) => {
  const { start_date, end_date } = req.query;
  const today = dayjs();
  const defaultEnd = today.format('YYYY-MM-DD');
  const defaultStart = today.subtract(29, 'day').format('YYYY-MM-DD');

  const s = (start_date as string) || defaultStart;
  const e = (end_date as string) || defaultEnd;

  const rows = db.prepare(`
    SELECT c.id, c.name, c.amount, COUNT(r.id) as count
    FROM coupons c
    LEFT JOIN redemptions r ON c.id = r.coupon_id AND r.redemption_date BETWEEN ? AND ?
    GROUP BY c.id
    HAVING count > 0
    ORDER BY count DESC
    LIMIT 10
  `).all(s, e) as { id: string; name: string; amount: number; count: number }[];

  setTimeout(() => res.json(rows), 200);
});

app.listen(PORT, () => {
  console.log(`CouponCrafter API server running on http://localhost:${PORT}`);
});
