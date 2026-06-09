import type { GameState, Card, Creature, EnergyOrb, Depth } from './game';

const COLORS = {
  bgTop: '#001122',
  bgBottom: '#003355',
  primary: '#003355',
  accent: '#00FFAA',
  accent2: '#00DDFF',
  danger: '#FF3366',
  text: '#E0F0FF',
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
}

function rgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

function drawDunes(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const layers = 3;
  for (let l = 0; l < layers; l++) {
    const alpha = 0.15 + l * 0.05;
    const amp = 10 + l * 5;
    const wl = 200 + l * 100;
    const offset = (t * 0.0002 * (1 + l * 0.5)) % 1;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 4) {
      const y = h - 60 - l * 25 + Math.sin((x / wl + offset) * Math.PI * 2) * amp;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = rgba('#003355', alpha);
    ctx.fill();
  }
  for (let l = 0; l < layers; l++) {
    const alpha = 0.12 + l * 0.04;
    const amp = 8 + l * 4;
    const wl = 180 + l * 90;
    const offset = (t * 0.00015 * (1 + l * 0.5) + 0.5) % 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let x = 0; x <= w; x += 4) {
      const y = 40 + l * 25 + Math.sin((x / wl + offset) * Math.PI * 2) * amp;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, 0);
    ctx.closePath();
    ctx.fillStyle = rgba('#002244', alpha);
    ctx.fill();
  }
}

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, COLORS.bgTop);
  g.addColorStop(1, COLORS.bgBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 40; i++) {
    const x = (i * 137 + t * 0.01) % w;
    const y = ((i * 97) % h + Math.sin(t * 0.0005 + i) * 15) % h;
    const r = 0.8 + (i % 3) * 0.5;
    ctx.fillStyle = rgba('#66FFFF', 0.08 + (i % 5) * 0.02);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  drawDunes(ctx, w, h, t);
}

function drawCoral(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  const stems = [
    { x: 0, y: 0, h: 60, w: 10 },
    { x: -25, y: 10, h: 45, w: 8 },
    { x: 25, y: 5, h: 50, w: 9 },
    { x: -12, y: -5, h: 40, w: 7 },
    { x: 18, y: -8, h: 35, w: 7 },
  ];
  for (const s of stems) {
    const grd = ctx.createLinearGradient(s.x, s.y, s.x, s.y - s.h);
    grd.addColorStop(0, 'rgba(100,60,80,0.7)');
    grd.addColorStop(1, 'rgba(180,100,130,0.5)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.ellipse(s.x, s.y - s.h / 2, s.w / 2, s.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 5; i++) {
      const py = s.y - s.h * (0.2 + i * 0.15);
      ctx.fillStyle = rgba('#FF88AA', 0.5);
      ctx.beginPath();
      ctx.arc(s.x - 3, py, 2, 0, Math.PI * 2);
      ctx.arc(s.x + 3, py + 3, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawSonar(ctx: CanvasRenderingContext2D, state: GameState, t: number) {
  if (!state.sonarActive || state.phase !== 'sonar' || state.currentPlayer !== 'player') return;
  const { sonarX: x, sonarY: y, sonarRadius: r } = state;
  ctx.save();
  for (let i = 0; i < 4; i++) {
    const rr = r * (0.3 + i * 0.25);
    const pulse = (Math.sin(t * 0.004 + i) * 0.5 + 0.5) * 0.1 + 0.15;
    ctx.strokeStyle = rgba('#00FF88', pulse);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, rr, 0, Math.PI * 2);
    ctx.stroke();
  }
  const sweepAngle = (t * 0.003) % (Math.PI * 2);
  const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
  grd.addColorStop(0, 'rgba(0,255,136,0.1)');
  grd.addColorStop(1, 'rgba(0,255,136,0)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(0,255,136,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, r, sweepAngle - 0.4, sweepAngle);
  ctx.closePath();
  ctx.fillStyle = 'rgba(0,255,136,0.08)';
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawEnergyOrb(ctx: CanvasRenderingContext2D, orb: EnergyOrb, t: number, selected: boolean) {
  if (orb.consumed) return;
  ctx.save();
  const float = Math.sin(t * 0.003 + orb.x) * 2;
  const x = orb.x;
  const y = orb.y + float;
  const size = orb.size * (1 + (orb.pulseCount > 0 && orb.pulseTimer > 0.125 ? 0.25 : 0));

  if (orb.ripple > 0) {
    ctx.strokeStyle = rgba('#00FFAA', orb.ripple * 0.6);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, size + (1 - orb.ripple) * 30, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (orb.highlighted > 0) {
    const glow = 0.5 + Math.sin(t * 0.01) * 0.3;
    ctx.shadowColor = '#FFFF00';
    ctx.shadowBlur = 20 * glow;
  }

  if (selected) {
    ctx.shadowColor = '#00FFAA';
    ctx.shadowBlur = 25;
  }

  const grd = ctx.createRadialGradient(x - size * 0.3, y - size * 0.3, 1, x, y, size);
  grd.addColorStop(0, orb.color1);
  grd.addColorStop(1, orb.color2);
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath();
  ctx.arc(x - size * 0.3, y - size * 0.35, size * 0.25, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function depthColor(d: Depth): string {
  if (d === 'surface') return '#88EEFF';
  if (d === 'middle') return '#00DDFF';
  return '#6644FF';
}

function skillName(s: string): string {
  switch (s) {
    case 'paralyze': return '麻痹';
    case 'devour': return '吞噬';
    case 'camouflage': return '伪装';
    default: return '—';
  }
}

function depthName(d: Depth): string {
  if (d === 'surface') return '表层';
  if (d === 'middle') return '中层';
  return '深层';
}

function drawCard(ctx: CanvasRenderingContext2D, card: Card, x: number, y: number, w: number, h: number, hover: boolean, t: number) {
  ctx.save();
  const yOffset = hover ? -5 : 0;
  const scale = hover ? 1.05 : (card.selected ? 1.12 : 1);
  ctx.translate(x + w / 2, y + h / 2 + yOffset);
  ctx.scale(scale, scale);
  ctx.translate(-w / 2, -h / 2);

  if (hover || card.selected) {
    ctx.shadowColor = '#00FFAA';
    ctx.shadowBlur = 18;
  }

  const r = 10;
  const grd = ctx.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, '#000510');
  grd.addColorStop(1, '#002244');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, r);
  ctx.fill();

  const dc = depthColor(card.template.depth);
  ctx.strokeStyle = card.selected ? '#00FFAA' : dc;
  ctx.lineWidth = card.selected ? 3 : 2;
  ctx.stroke();

  ctx.fillStyle = rgba(dc, 0.12);
  ctx.fillRect(6, 6, w - 12, h - 12);

  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(card.template.emoji, w / 2, h * 0.32);

  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = COLORS.text;
  ctx.fillText(card.template.name, w / 2, h * 0.52);

  ctx.font = '10px sans-serif';
  ctx.fillStyle = dc;
  ctx.fillText(depthName(card.template.depth), w / 2, h * 0.62);

  ctx.font = '10px sans-serif';
  ctx.fillStyle = '#FFAA66';
  ctx.fillText(skillName(card.template.skill), w / 2, h * 0.70);

  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = '#FF6688';
  ctx.textAlign = 'left';
  ctx.fillText(`⚔ ${card.template.baseAttack}`, 10, h - 12);
  ctx.fillStyle = '#00FFAA';
  ctx.textAlign = 'right';
  ctx.fillText(`♥ ${card.template.baseHealth}`, w - 10, h - 12);

  ctx.restore();
}

function drawCreature(ctx: CanvasRenderingContext2D, c: Creature, t: number) {
  if (c.health <= 0) return;
  ctx.save();
  const shake = c.shakeTime > 0 ? (Math.random() - 0.5) * 6 : 0;
  const x = c.x + shake;
  const y = c.y;
  ctx.globalAlpha = c.alpha;

  if (c.resonance) {
    ctx.shadowColor = '#00DDFF';
    ctx.shadowBlur = 15 + Math.sin(t * 0.006) * 5;
  }

  if (c.flashing > 0) {
    ctx.shadowColor = '#FF3366';
    ctx.shadowBlur = 20 + c.flashing * 30;
  }

  const size = 42;
  ctx.fillStyle = rgba(depthColor(c.template.depth), 0.2);
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = 'bold 42px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (c.flashing > 0 && Math.floor(t / 50) % 2 === 0) {
    ctx.fillStyle = '#FF6688';
  }
  ctx.fillText(c.template.emoji, x, y);

  const barW = 70;
  const barH = 7;
  const barX = x - barW / 2;
  const barY = y - 50;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(barX, barY, barW, barH);
  const hpRatio = Math.max(0, c.health / c.maxHealth);
  const hpGrd = ctx.createLinearGradient(barX, barY, barX, barY + barH);
  hpGrd.addColorStop(0, '#00FFAA');
  hpGrd.addColorStop(1, '#008866');
  ctx.fillStyle = hpGrd;
  ctx.fillRect(barX, barY, barW * hpRatio, barH);
  ctx.strokeStyle = '#00FFAA';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, barH);

  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.text;
  ctx.fillText(`${c.health}/${c.maxHealth}`, x, barY - 4);

  ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = '#FF6688';
  ctx.textAlign = 'left';
  ctx.fillText(`⚔${c.attack}`, x - 35, y + 50);
  ctx.fillStyle = depthColor(c.template.depth);
  ctx.textAlign = 'right';
  ctx.fillText(depthName(c.template.depth), x + 35, y + 50);

  ctx.restore();
}

function drawResonanceLinks(ctx: CanvasRenderingContext2D, state: GameState, t: number) {
  for (const side of ['player', 'enemy'] as const) {
    const creatures = side === 'player' ? state.playerCreatures : state.enemyCreatures;
    const groups: Record<string, Creature[]> = { surface: [], middle: [], deep: [] };
    for (const c of creatures) if (c.health > 0) groups[c.template.depth].push(c);
    for (const d of ['surface', 'middle', 'deep'] as const) {
      const arr = groups[d];
      if (arr.length >= 2) {
        const pulse = (Math.sin(t * 0.004) * 0.5 + 0.5) * 0.3 + 0.4;
        ctx.strokeStyle = rgba('#00DDFF', pulse);
        ctx.lineWidth = 2;
        for (let i = 0; i < arr.length - 1; i++) {
          const a = arr[i], b = arr[i + 1];
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2 - 30;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.quadraticCurveTo(mx, my, b.x, b.y);
          ctx.stroke();
        }
      }
    }
  }
}

function drawAttackWaves(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const w of state.attackWaves) {
    const x = lerp(w.x1, w.x2, w.progress);
    const y = lerp(w.y1, w.y2, w.progress);
    const alpha = 1 - w.progress;
    ctx.save();
    ctx.strokeStyle = rgba(w.color, alpha);
    ctx.lineWidth = 4;
    ctx.shadowColor = w.color;
    ctx.shadowBlur = 12;
    const tailLen = 40;
    const tx = x - (w.x2 - w.x1) / Math.hypot(w.x2 - w.x1, w.y2 - w.y1 + 0.01) * tailLen * (1 - w.progress * 0.5);
    const ty = y - (w.y2 - w.y1) / Math.hypot(w.x2 - w.x1 + 0.01, w.y2 - w.y1) * tailLen * (1 - w.progress * 0.5);
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.fillStyle = rgba('#FFFFFF', alpha);
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawFloatingTexts(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.save();
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  for (const t of state.floatingTexts) {
    ctx.globalAlpha = t.alpha;
    ctx.fillStyle = t.color;
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.lineWidth = 3;
    ctx.strokeText(t.text, t.x, t.y);
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.restore();
}

function drawBubbles(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const b of state.bubbles) {
    ctx.save();
    ctx.globalAlpha = b.alpha;
    ctx.fillStyle = 'rgba(150,220,255,0.5)';
    ctx.strokeStyle = 'rgba(200,240,255,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function drawHUD(ctx: CanvasRenderingContext2D, state: GameState) {
  const w = state.canvasW;
  ctx.save();
  const barH = 44;
  const grd = ctx.createLinearGradient(0, 0, 0, barH);
  grd.addColorStop(0, 'rgba(0,30,60,0.7)');
  grd.addColorStop(1, 'rgba(0,20,40,0.5)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, barH);
  ctx.strokeStyle = rgba('#00FFAA', 0.25);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, barH);
  ctx.lineTo(w, barH);
  ctx.stroke();

  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = COLORS.text;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(`第 ${state.turn} 回合`, w / 2, barH / 2);

  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  const playerOrbs = state.playerOrbs.filter(o => !o.consumed).length;
  ctx.fillStyle = COLORS.accent;
  ctx.fillText(`⬢ 我方能量: ${playerOrbs}`, 180, barH / 2);
  ctx.fillStyle = COLORS.text;
  ctx.fillText(`✋ 手牌: ${state.playerHand.length}`, 340, barH / 2);

  ctx.textAlign = 'right';
  const enemyOrbs = state.enemyOrbs.filter(o => !o.consumed).length;
  ctx.fillStyle = '#FF88AA';
  ctx.fillText(`敌方能量: ${enemyOrbs} ⬢`, w - 180, barH / 2);
  ctx.fillStyle = COLORS.text;
  ctx.fillText(`手牌: ${state.enemyHand.length} ✋`, w - 340, barH / 2);

  const phaseText = state.phase === 'sonar' ? '声呐探测' : state.phase === 'battle' ? '战斗阶段' : '回合结束';
  ctx.fillStyle = state.currentPlayer === 'player' ? COLORS.accent : '#FF88AA';
  ctx.fillText(`${state.currentPlayer === 'player' ? '我方' : '敌方'} · ${phaseText}`, w - 20, barH / 2);
  ctx.restore();
}

function drawBattlefieldHint(ctx: CanvasRenderingContext2D, state: GameState) {
  const w = state.canvasW;
  const h = state.canvasH;
  ctx.save();
  const hintH = 38;
  const hintY = h * 0.6 + (h * 0.4 - hintH) / 2;
  const grd = ctx.createLinearGradient(0, hintY, 0, hintY + hintH);
  grd.addColorStop(0, 'rgba(0,10,25,0)');
  grd.addColorStop(0.3, 'rgba(0,15,35,0.55)');
  grd.addColorStop(0.7, 'rgba(0,15,35,0.55)');
  grd.addColorStop(1, 'rgba(0,10,25,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(w * 0.1, h * 0.5, w * 0.8, h * 0.1);

  if (state.messageTimer > 0 && state.message) {
    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = rgba(COLORS.text, Math.min(1, state.messageTimer));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.message, w / 2, h * 0.55);
  }

  if (state.currentPlayer === 'player' && state.phase === 'battle' && !state.inEndPhase) {
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = rgba(COLORS.accent, 0.85);
    ctx.textAlign = 'center';
    const txt = state.selectedCardId
      ? '已选择卡牌 → 点击左下方能量卵召唤（右键/ESC取消）'
      : '点击下方卡牌选择，再点击能量卵消耗召唤';
    ctx.fillText(txt, w / 2, h * 0.575);
  }
  ctx.restore();
}

function drawEndButton(ctx: CanvasRenderingContext2D, state: GameState): { x: number; y: number; w: number; h: number } {
  const w = state.canvasW;
  const h = state.canvasH;
  const bw = 110, bh = 38;
  const bx = w - bw - 20;
  const by = h - bh - 20;
  ctx.save();
  const disabled = state.currentPlayer !== 'player' || state.inEndPhase || state.gameOver;
  ctx.fillStyle = disabled ? 'rgba(60,70,90,0.6)' : 'rgba(0,255,170,0.2)';
  ctx.strokeStyle = disabled ? 'rgba(100,120,140,0.4)' : COLORS.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 8);
  ctx.fill();
  ctx.stroke();
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = disabled ? 'rgba(180,200,220,0.5)' : COLORS.accent;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('结束回合', bx + bw / 2, by + bh / 2);
  ctx.restore();
  return { x: bx, y: by, w: bw, h: bh };
}

function drawGameOver(ctx: CanvasRenderingContext2D, state: GameState) {
  if (!state.gameOver) return;
  const w = state.canvasW, h = state.canvasH;
  ctx.save();
  ctx.fillStyle = `rgba(0,0,10,${state.darkenAmount * 0.7})`;
  ctx.fillRect(0, 0, w, h);
  if (state.darkenAmount > 0.6) {
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (state.winner === 'enemy') {
      ctx.fillStyle = '#FF3366';
      ctx.shadowColor = '#FF3366';
      ctx.shadowBlur = 30;
      ctx.fillText('深渊吞没', w / 2, h / 2);
    } else {
      ctx.fillStyle = COLORS.accent;
      ctx.shadowColor = COLORS.accent;
      ctx.shadowBlur = 30;
      ctx.fillText('你征服了深渊', w / 2, h / 2);
    }
    ctx.font = '16px sans-serif';
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.text;
    ctx.fillText('刷新页面重新开始', w / 2, h / 2 + 60);
  }
  ctx.restore();
}

export interface RenderResult {
  cardRects: { id: string; x: number; y: number; w: number; h: number }[];
  endBtn: { x: number; y: number; w: number; h: number };
}

export function render(ctx: CanvasRenderingContext2D, state: GameState, t: number): RenderResult {
  const w = state.canvasW, h = state.canvasH;
  drawBackground(ctx, w, h, t);

  drawCoral(ctx, w * 0.15, h * 0.88, 1);
  drawCoral(ctx, w * 0.85, h * 0.12, 1);

  drawSonar(ctx, state, t);

  for (const orb of state.enemyOrbs) drawEnergyOrb(ctx, orb, t, false);
  for (const orb of state.playerOrbs) drawEnergyOrb(ctx, orb, t, state.selectedCardId !== null && !orb.consumed);

  drawResonanceLinks(ctx, state, t);

  for (const c of state.enemyCreatures) drawCreature(ctx, c, t);
  for (const c of state.playerCreatures) drawCreature(ctx, c, t);

  drawAttackWaves(ctx, state);
  drawBubbles(ctx, state);

  const cardRects: { id: string; x: number; y: number; w: number; h: number }[] = [];
  const cw = 90, ch = 128;
  const total = state.playerHand.length;
  const gap = 16;
  const totalW = total * cw + (total - 1) * gap;
  const startX = (w - totalW) / 2;
  const cardY = h - ch - 70;
  for (let i = 0; i < total; i++) {
    const card = state.playerHand[i];
    const cx = startX + i * (cw + gap);
    drawCard(ctx, card, cx, cardY, cw, ch, state.hoverCardId === card.id, t);
    cardRects.push({ id: card.id, x: cx, y: cardY, w: cw, h: ch });
  }

  drawBattlefieldHint(ctx, state);

  const enemyHandCount = state.enemyHand.length;
  for (let i = 0; i < enemyHandCount; i++) {
    const ew = 70, eh = 100;
    const eg = 10;
    const etotal = enemyHandCount * ew + (enemyHandCount - 1) * eg;
    const ex = (w - etotal) / 2 + i * (ew + eg);
    const ey = 55;
    ctx.save();
    ctx.fillStyle = '#000814';
    ctx.strokeStyle = '#FF6688';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(ex, ey, ew, eh, 8);
    ctx.fill();
    ctx.stroke();
    ctx.font = '28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FF6688';
    ctx.fillText('❓', ex + ew / 2, ey + eh / 2);
    ctx.restore();
  }

  drawHUD(ctx, state);
  drawFloatingTexts(ctx, state);
  const endBtn = drawEndButton(ctx, state);
  drawGameOver(ctx, state);

  return { cardRects, endBtn };
}
