import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { WebSocketServer } from 'ws';
import http from 'http';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const campaigns = [];
const timeSeriesData = [];

function generateCouponCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getTotalStats() {
  let totalIssued = 0;
  let totalClaimed = 0;
  let totalRedeemed = 0;
  campaigns.forEach(c => {
    const claimed = c.coupons.filter(cu => cu.status === 'claimed' || cu.status === 'redeemed').length;
    const redeemed = c.coupons.filter(cu => cu.status === 'redeemed').length;
    totalIssued += c.coupons.length;
    totalClaimed += claimed;
    totalRedeemed += redeemed;
  });
  return { totalIssued, totalClaimed, totalRedeemed };
}

function getCampaignStats(campaign) {
  const claimed = campaign.coupons.filter(cu => cu.status === 'claimed' || cu.status === 'redeemed').length;
  const redeemed = campaign.coupons.filter(cu => cu.status === 'redeemed').length;
  const conversionRate = claimed > 0 ? ((redeemed / claimed) * 100).toFixed(1) : '0.0';
  let totalDiscount = 0;
  campaign.coupons.forEach(cu => {
    if (cu.status === 'redeemed') {
      if (campaign.type === 'discount') {
        totalDiscount += campaign.discountValue;
      } else if (campaign.type === 'fixed') {
        totalDiscount += campaign.discountValue;
      } else if (campaign.type === 'full_reduction') {
        totalDiscount += campaign.reductionAmount;
      }
    }
  });
  const avgDiscount = redeemed > 0 ? (totalDiscount / redeemed).toFixed(2) : '0.00';
  return { claimed, redeemed, conversionRate, totalDiscount: totalDiscount.toFixed(2), avgDiscount };
}

function broadcastUpdate() {
  const stats = getTotalStats();
  const now = new Date();
  const timeLabel = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
  timeSeriesData.push({ time: timeLabel, claimed: stats.totalClaimed, redeemed: stats.totalRedeemed });
  if (timeSeriesData.length > 300) {
    timeSeriesData.shift();
  }
  const payload = JSON.stringify({ type: 'stats_update', stats, timeSeries: timeSeriesData.slice(-30) });
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(payload);
    }
  });
}

function simulateEvents() {
  campaigns.forEach(campaign => {
    if (campaign.status === 'paused') return;
    const unclaimed = campaign.coupons.filter(cu => cu.status === 'unclaimed');
    const claimed = campaign.coupons.filter(cu => cu.status === 'claimed');
    if (unclaimed.length > 0 && Math.random() < 0.3) {
      const idx = Math.floor(Math.random() * unclaimed.length);
      unclaimed[idx].status = 'claimed';
      unclaimed[idx].claimedAt = new Date().toISOString();
    }
    if (claimed.length > 0 && Math.random() < 0.2) {
      const idx = Math.floor(Math.random() * claimed.length);
      claimed[idx].status = 'redeemed';
      claimed[idx].redeemedAt = new Date().toISOString();
    }
  });
  broadcastUpdate();
}

app.get('/api/campaigns', (req, res) => {
  const result = campaigns.map(c => {
    const claimed = c.coupons.filter(cu => cu.status === 'claimed' || cu.status === 'redeemed').length;
    const redeemed = c.coupons.filter(cu => cu.status === 'redeemed').length;
    return {
      id: c.id,
      name: c.name,
      type: c.type,
      discountValue: c.discountValue,
      minPurchase: c.minPurchase,
      reductionAmount: c.reductionAmount,
      totalQuantity: c.totalQuantity,
      claimed,
      redeemed,
      status: c.status,
      validFrom: c.validFrom,
      validTo: c.validTo,
      createdAt: c.createdAt,
      coupons: c.coupons,
    };
  });
  res.json(result);
});

app.post('/api/campaigns', (req, res) => {
  const { name, type, discountValue, minPurchase, reductionAmount, totalQuantity, validFrom, validTo } = req.body;
  const id = uuidv4();
  const coupons = [];
  for (let i = 0; i < totalQuantity; i++) {
    coupons.push({
      code: generateCouponCode(),
      status: 'unclaimed',
      claimedAt: null,
      redeemedAt: null,
    });
  }
  const campaign = {
    id,
    name,
    type,
    discountValue: discountValue || 0,
    minPurchase: minPurchase || 0,
    reductionAmount: reductionAmount || 0,
    totalQuantity,
    validFrom,
    validTo,
    status: 'active',
    createdAt: new Date().toISOString(),
    coupons,
  };
  campaigns.push(campaign);
  const claimed = 0;
  const redeemed = 0;
  broadcastUpdate();
  res.status(201).json({
    id: campaign.id,
    name: campaign.name,
    type: campaign.type,
    discountValue: campaign.discountValue,
    minPurchase: campaign.minPurchase,
    reductionAmount: campaign.reductionAmount,
    totalQuantity: campaign.totalQuantity,
    claimed,
    redeemed,
    status: campaign.status,
    validFrom: campaign.validFrom,
    validTo: campaign.validTo,
    createdAt: campaign.createdAt,
    coupons: campaign.coupons,
  });
});

app.get('/api/campaigns/:id/stats', (req, res) => {
  const campaign = campaigns.find(c => c.id === req.params.id);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  const stats = getCampaignStats(campaign);
  res.json({ id: campaign.id, name: campaign.name, type: campaign.type, ...stats });
});

app.patch('/api/campaigns/:id/status', (req, res) => {
  const campaign = campaigns.find(c => c.id === req.params.id);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  const { status } = req.body;
  if (status !== 'active' && status !== 'paused') {
    return res.status(400).json({ error: 'Invalid status' });
  }
  campaign.status = status;
  broadcastUpdate();
  res.json({ id: campaign.id, status: campaign.status });
});

app.get('/api/stats', (req, res) => {
  const stats = getTotalStats();
  res.json(stats);
});

wss.on('connection', (ws) => {
  const stats = getTotalStats();
  ws.send(JSON.stringify({ type: 'stats_update', stats, timeSeries: timeSeriesData.slice(-30) }));
});

setInterval(simulateEvents, 15000);

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
