import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';

interface MarketItem {
  symbol: string;
  name: string;
  open: number;
  close: number;
  high: number;
  low: number;
  price: number;
  volume: number;
  change: number;
  changePercent: number;
  timestamp: number;
}

interface HistoryBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface ChartViewProps {
  symbol: string;
  marketData: MarketItem[];
  socketRef: React.MutableRefObject<Socket | null>;
}

interface MACDData {
  dif: number;
  dea: number;
  macd: number;
}

function calcEMA(data: number[], period: number): number[] {
  const result: number[] = [];
  const k = 2 / (period + 1);
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(data[i]);
    } else {
      result.push(data[i] * k + result[i - 1] * (1 - k));
    }
  }
  return result;
}

function calcMACD(closes: number[], short = 12, long = 26, signal = 9): MACDData[] {
  if (closes.length < long) return [];
  const emaShort = calcEMA(closes, short);
  const emaLong = calcEMA(closes, long);
  const dif = emaShort.map((v, i) => v - emaLong[i]);
  const dea = calcEMA(dif, signal);
  return dif.map((d, i) => ({
    dif: d,
    dea: dea[i],
    macd: (d - dea[i]) * 2,
  }));
}

function calcRSI(closes: number[], period = 14): number[] {
  const result: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      result.push(50);
      continue;
    }
    let gains = 0;
    let losses = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = closes[j] - closes[j - 1];
      if (diff > 0) gains += diff;
      else losses -= diff;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) result.push(100);
    else {
      const rs = avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
    }
  }
  return result;
}

const ChartView: React.FC<ChartViewProps> = ({ symbol, marketData, socketRef }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [bars, setBars] = useState<HistoryBar[]>([]);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const animFrameRef = useRef<number>(0);
  const barsRef = useRef<HistoryBar[]>([]);

  useEffect(() => {
    fetch(`/api/history/${symbol}`)
      .then((r) => r.json())
      .then((data: HistoryBar[]) => {
        setBars(data);
        barsRef.current = data;
      })
      .catch(() => {});
  }, [symbol]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handler = (data: MarketItem[]) => {
      const stock = data.find((s) => s.symbol === symbol);
      if (!stock) return;

      setBars((prev) => {
        const now = Date.now();
        const lastBar = prev[prev.length - 1];
        let newBars: HistoryBar[];

        if (lastBar && now - lastBar.time < 30000) {
          newBars = [...prev];
          newBars[newBars.length - 1] = {
            ...lastBar,
            close: stock.price,
            high: Math.max(lastBar.high, stock.price),
            low: Math.min(lastBar.low, stock.price),
            volume: lastBar.volume + Math.floor(Math.random() * 3000),
          };
        } else {
          newBars = [...prev, {
            time: now,
            open: stock.price,
            high: stock.price,
            low: stock.price,
            close: stock.price,
            volume: Math.floor(Math.random() * 50000),
          }];
        }

        if (newBars.length > 100) newBars = newBars.slice(-100);
        barsRef.current = newBars;
        return newBars;
      });
    };

    socket.on('market-data', handler);
    return () => {
      socket.off('market-data', handler);
    };
  }, [symbol, socketRef]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const currentBars = barsRef.current;
    const chartH = H * 0.5;
    const volumeH = H * 0.12;
    const macdH = H * 0.18;
    const rsiH = H * 0.15;
    const gapH = H * 0.017;
    const leftPad = 50;
    const rightPad = 60;

    ctx.fillStyle = '#0d1b2a';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = '#2a2a3e';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(leftPad, y);
      ctx.lineTo(W - rightPad, y);
      ctx.stroke();
    }

    if (currentBars.length < 2) {
      ctx.fillStyle = '#8892b0';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('等待行情数据...', W / 2, H / 2);
      return;
    }

    const displayBars = currentBars.slice(-60);
    const barWidth = (W - leftPad - rightPad) / displayBars.length;
    const candleWidth = Math.max(1, barWidth * 0.7);
    const wickWidth = Math.max(1, candleWidth * 0.15);

    const allHigh = Math.max(...displayBars.map((b) => b.high));
    const allLow = Math.min(...displayBars.map((b) => b.low));
    const priceRange = allHigh - allLow || 1;
    const pricePad = priceRange * 0.1;

    const yPrice = (price: number) =>
      ((allHigh + pricePad - price) / (priceRange + 2 * pricePad)) * chartH;

    const closes = displayBars.map((b) => b.close);
    const macdData = calcMACD(closes);
    const rsiData = calcRSI(closes);

    displayBars.forEach((bar, i) => {
      const x = leftPad + i * barWidth + barWidth / 2;
      const isUp = bar.close >= bar.open;
      const color = isUp ? '#4caf50' : '#f44336';
      const bodyTop = yPrice(Math.max(bar.open, bar.close));
      const bodyBottom = yPrice(Math.min(bar.open, bar.close));
      const bodyHeight = Math.max(1, bodyBottom - bodyTop);

      ctx.strokeStyle = color;
      ctx.lineWidth = wickWidth;
      ctx.beginPath();
      ctx.moveTo(x, yPrice(bar.high));
      ctx.lineTo(x, yPrice(bar.low));
      ctx.stroke();

      ctx.fillStyle = color;
      if (isUp) {
        ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
      } else {
        ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
      }
    });

    const lastPrice = displayBars[displayBars.length - 1].close;
    const lastY = yPrice(lastPrice);
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(leftPad, lastY);
    ctx.lineTo(W - rightPad, lastY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#e94560';
    ctx.fillRect(W - rightPad, lastY - 10, rightPad, 20);
    ctx.fillStyle = '#fff';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(lastPrice.toFixed(2), W - rightPad + 4, lastY + 4);

    for (let i = 0; i <= 3; i++) {
      const price = allHigh + pricePad - ((priceRange + 2 * pricePad) / 3) * i;
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(price.toFixed(2), leftPad - 4, (chartH / 3) * i + 4);
    }

    const volTop = chartH + gapH;
    const maxVol = Math.max(...displayBars.map((b) => b.volume)) || 1;
    displayBars.forEach((bar, i) => {
      const x = leftPad + i * barWidth + barWidth / 2;
      const isUp = bar.close >= bar.open;
      const h = (bar.volume / maxVol) * volumeH;
      ctx.fillStyle = isUp ? 'rgba(76,175,80,0.4)' : 'rgba(244,67,54,0.4)';
      ctx.fillRect(x - candleWidth / 2, volTop + volumeH - h, candleWidth, h);
    });

    const macdTop = volTop + volumeH + gapH;
    if (macdData.length > 0) {
      const displayMacd = macdData.slice(-60);
      const maxMacd = Math.max(...displayMacd.map((m) => Math.max(Math.abs(m.macd), Math.abs(m.dif), Math.abs(m.dea)))) || 1;
      const macdMid = macdTop + macdH / 2;

      ctx.strokeStyle = '#2a2a3e';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(leftPad, macdMid);
      ctx.lineTo(W - rightPad, macdMid);
      ctx.stroke();

      displayMacd.forEach((m, i) => {
        const x = leftPad + i * barWidth + barWidth / 2;
        const h = (m.macd / maxMacd) * (macdH / 2);
        ctx.fillStyle = m.macd >= 0 ? 'rgba(244,67,54,0.6)' : 'rgba(76,175,80,0.6)';
        ctx.fillRect(x - candleWidth / 2, macdMid - h, candleWidth, h);
      });

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      displayMacd.forEach((m, i) => {
        const x = leftPad + i * barWidth + barWidth / 2;
        const y = macdMid - (m.dif / maxMacd) * (macdH / 2);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      ctx.strokeStyle = '#ff9800';
      ctx.beginPath();
      displayMacd.forEach((m, i) => {
        const x = leftPad + i * barWidth + barWidth / 2;
        const y = macdMid - (m.dea / maxMacd) * (macdH / 2);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    const rsiTop = macdTop + macdH + gapH;
    if (rsiData.length > 0) {
      const displayRsi = rsiData.slice(-60);

      ctx.strokeStyle = '#2a2a3e';
      ctx.lineWidth = 0.5;
      [30, 50, 70].forEach((level) => {
        const y = rsiTop + rsiH - (level / 100) * rsiH;
        ctx.beginPath();
        ctx.moveTo(leftPad, y);
        ctx.lineTo(W - rightPad, y);
        ctx.stroke();
      });

      ctx.strokeStyle = '#ffeb3b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      displayRsi.forEach((r, i) => {
        const x = leftPad + i * barWidth + barWidth / 2;
        const y = rsiTop + rsiH - (r / 100) * rsiH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      ctx.fillStyle = '#ffeb3b';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'left';
      const lastRsi = displayRsi[displayRsi.length - 1];
      ctx.fillText(`RSI(14): ${lastRsi.toFixed(1)}`, leftPad + 4, rsiTop + 12);
    }

    if (mousePos && mousePos.x >= leftPad && mousePos.x <= W - rightPad) {
      const barIndex = Math.floor((mousePos.x - leftPad) / barWidth);
      if (barIndex >= 0 && barIndex < displayBars.length) {
        const bar = displayBars[barIndex];

        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 0.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(mousePos.x, 0);
        ctx.lineTo(mousePos.x, H);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, mousePos.y);
        ctx.lineTo(W, mousePos.y);
        ctx.stroke();
        ctx.setLineDash([]);

        const tooltipX = mousePos.x > W / 2 ? 10 : W - 160;
        const tooltipY = 10;
        ctx.fillStyle = 'rgba(22,33,62,0.9)';
        ctx.fillRect(tooltipX, tooltipY, 150, 90);
        ctx.strokeStyle = '#0f3460';
        ctx.lineWidth = 1;
        ctx.strokeRect(tooltipX, tooltipY, 150, 90);

        ctx.fillStyle = '#e0e0e0';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`开: ${bar.open.toFixed(2)}`, tooltipX + 8, tooltipY + 18);
        ctx.fillText(`高: ${bar.high.toFixed(2)}`, tooltipX + 8, tooltipY + 34);
        ctx.fillText(`低: ${bar.low.toFixed(2)}`, tooltipX + 8, tooltipY + 50);
        ctx.fillText(`收: ${bar.close.toFixed(2)}`, tooltipX + 8, tooltipY + 66);
        ctx.fillText(`量: ${bar.volume.toLocaleString()}`, tooltipX + 8, tooltipY + 82);
      }
    }
  }, [mousePos]);

  useEffect(() => {
    let running = true;
    const render = () => {
      if (!running) return;
      draw();
      animFrameRef.current = requestAnimationFrame(render);
    };
    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [draw]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseLeave = () => {
    setMousePos(null);
  };

  const currentStock = marketData.find((s) => s.symbol === symbol);

  return (
    <div ref={containerRef} style={styles.container} className="fade-in">
      <div style={styles.header}>
        <h3 style={styles.title}>
          {currentStock ? `${currentStock.symbol} ${currentStock.name}` : symbol} - K线图
        </h3>
        {currentStock && (
          <div style={styles.priceInfo}>
            <span style={{ color: currentStock.change >= 0 ? '#4caf50' : '#f44336', fontSize: 16, fontWeight: 700 }}>
              {currentStock.price.toFixed(2)}
            </span>
            <span style={{ color: currentStock.change >= 0 ? '#4caf50' : '#f44336', fontSize: 12 }}>
              {currentStock.changePercent >= 0 ? '+' : ''}{currentStock.changePercent.toFixed(2)}%
            </span>
          </div>
        )}
      </div>
      <canvas
        ref={canvasRef}
        style={styles.canvas}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: '#16213e',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    minHeight: 400,
    display: 'flex',
    flexDirection: 'column' as const,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: 600,
    color: '#e0e0e0',
    margin: 0,
  },
  priceInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  canvas: {
    width: '100%',
    height: 400,
    cursor: 'crosshair',
    borderRadius: 8,
  },
};

export default ChartView;
