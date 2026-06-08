import { CombatSystem, WEAPONS, SKILLS } from './combatSystem';
import { EntityManager } from './entityManager';
import type { Weapon, Skill } from './types';

const GRID_SIZE = 40;
const GRID_COLOR = '#333333';
const TARGET_COLOR = '#2ECC71';
const DPS_UPDATE_INTERVAL = 1000;

const combat = new CombatSystem();
const entities = new EntityManager();

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let lastTime = 0;
let lastDpsUpdate = 0;
let skillSlotAssignMode = 0;
let mouseX = 0;
let mouseY = 0;

const uiElements: Record<string, HTMLElement> = {};

function resizeCanvas(): void {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  entities.setCanvasSize(rect.width, rect.height);
}

function drawWeaponIcon(iconCtx: CanvasRenderingContext2D, weapon: Weapon, size: number): void {
  iconCtx.save();
  const cx = size / 2;
  const cy = size / 2;
  iconCtx.translate(cx, cy);
  switch (weapon.id) {
    case 'iron_sword':
    case 'great_sword': {
      iconCtx.fillStyle = weapon.color;
      iconCtx.beginPath();
      iconCtx.moveTo(0, -size * 0.35);
      iconCtx.lineTo(size * 0.12, size * 0.15);
      iconCtx.lineTo(-size * 0.12, size * 0.15);
      iconCtx.closePath();
      iconCtx.fill();
      iconCtx.fillStyle = '#5D4037';
      iconCtx.fillRect(-size * 0.18, size * 0.15, size * 0.36, size * 0.08);
      iconCtx.fillRect(-size * 0.06, size * 0.22, size * 0.12, size * 0.14);
      break;
    }
    case 'short_bow':
    case 'long_bow': {
      iconCtx.strokeStyle = weapon.color;
      iconCtx.lineWidth = 3;
      iconCtx.beginPath();
      iconCtx.arc(0, 0, size * 0.32, -Math.PI * 0.6, Math.PI * 0.6);
      iconCtx.stroke();
      iconCtx.strokeStyle = '#BDC3C7';
      iconCtx.lineWidth = 1;
      iconCtx.beginPath();
      iconCtx.moveTo(size * 0.18, -size * 0.25);
      iconCtx.lineTo(size * 0.18, size * 0.25);
      iconCtx.stroke();
      break;
    }
    case 'fire_staff':
    case 'frost_staff': {
      iconCtx.fillStyle = '#5D4037';
      iconCtx.fillRect(-size * 0.05, -size * 0.1, size * 0.1, size * 0.4);
      iconCtx.fillStyle = weapon.color;
      iconCtx.beginPath();
      iconCtx.arc(0, -size * 0.18, size * 0.2, 0, Math.PI * 2);
      iconCtx.fill();
      iconCtx.fillStyle = 'rgba(255,255,255,0.4)';
      iconCtx.beginPath();
      iconCtx.arc(-size * 0.06, -size * 0.24, size * 0.08, 0, Math.PI * 2);
      iconCtx.fill();
      break;
    }
  }
  iconCtx.restore();
}

function drawSkillIcon(iconCtx: CanvasRenderingContext2D, skill: Skill, size: number): void {
  iconCtx.save();
  const cx = size / 2;
  const cy = size / 2;
  iconCtx.translate(cx, cy);
  switch (skill.type) {
    case 'fire': {
      const r = size * 0.3;
      const gradient = iconCtx.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
      gradient.addColorStop(0, '#FFE0B2');
      gradient.addColorStop(1, skill.color);
      iconCtx.fillStyle = gradient;
      iconCtx.beginPath();
      iconCtx.arc(0, 0, r, 0, Math.PI * 2);
      iconCtx.fill();
      break;
    }
    case 'ice': {
      iconCtx.fillStyle = skill.color;
      const s = size * 0.42;
      iconCtx.fillRect(-s / 2, -s / 2, s, s);
      iconCtx.strokeStyle = '#FFFFFF';
      iconCtx.lineWidth = 1.5;
      iconCtx.beginPath();
      iconCtx.moveTo(-s * 0.3, 0);
      iconCtx.lineTo(s * 0.3, 0);
      iconCtx.moveTo(0, -s * 0.3);
      iconCtx.lineTo(0, s * 0.3);
      iconCtx.stroke();
      break;
    }
    case 'heal': {
      iconCtx.fillStyle = skill.color;
      const w = size * 0.14;
      const h = size * 0.4;
      iconCtx.fillRect(-w / 2, -h / 2, w, h);
      iconCtx.fillRect(-h / 2, -w / 2, h, w);
      break;
    }
  }
  iconCtx.restore();
}

function renderWeaponIconCanvas(weapon: Weapon): string {
  const c = document.createElement('canvas');
  c.className = 'icon-canvas';
  c.width = 40;
  c.height = 40;
  const cx = c.getContext('2d');
  if (cx) {
    drawWeaponIcon(cx, weapon, 40);
  }
  return c.toDataURL();
}

function renderSkillIconCanvas(skill: Skill): string {
  const c = document.createElement('canvas');
  c.className = 'icon-canvas';
  c.width = 40;
  c.height = 40;
  const cx = c.getContext('2d');
  if (cx) {
    drawSkillIcon(cx, skill, 40);
  }
  return c.toDataURL();
}

function buildWeaponGrid(): void {
  const grid = uiElements.weaponGrid;
  grid.innerHTML = '';
  WEAPONS.forEach((weapon) => {
    const div = document.createElement('div');
    div.className = 'weapon-item';
    div.dataset.weaponId = weapon.id;
    const img = document.createElement('img');
    img.src = renderWeaponIconCanvas(weapon);
    const name = document.createElement('div');
    name.className = 'item-name';
    name.textContent = weapon.name;
    const tip = document.createElement('div');
    tip.className = 'item-tooltip';
    tip.textContent = weapon.description;
    div.appendChild(img);
    div.appendChild(name);
    div.appendChild(tip);
    div.addEventListener('click', () => {
      combat.selectWeapon(weapon.id);
      updateWeaponSelection();
      updateWeaponInfo();
      updatePowerScore();
    });
    grid.appendChild(div);
  });
  combat.selectWeapon(WEAPONS[0].id);
  updateWeaponSelection();
}

function buildSkillPalette(): void {
  const palette = uiElements.skillPalette;
  palette.innerHTML = '';
  SKILLS.forEach((skill) => {
    const div = document.createElement('div');
    div.className = 'skill-item';
    div.dataset.skillId = skill.id;
    const img = document.createElement('img');
    img.src = renderSkillIconCanvas(skill);
    const name = document.createElement('div');
    name.className = 'item-name';
    name.textContent = skill.name;
    const tip = document.createElement('div');
    tip.className = 'item-tooltip';
    tip.textContent = skill.description;
    div.appendChild(img);
    div.appendChild(name);
    div.appendChild(tip);
    div.addEventListener('click', () => {
      assignNextSkillSlot(skill.id);
    });
    palette.appendChild(div);
  });
}

function assignNextSkillSlot(skillId: string): void {
  for (let i = 0; i < combat.skillSlots.length; i++) {
    if (combat.skillSlots[i].skillId === skillId) {
      combat.assignSkillToSlot(null, i);
      renderSkillSlots();
      updateSkillSelection();
      updatePowerScore();
      return;
    }
  }
  for (let i = 0; i < combat.skillSlots.length; i++) {
    if (combat.skillSlots[i].skillId === null) {
      combat.assignSkillToSlot(skillId, i);
      renderSkillSlots();
      updateSkillSelection();
      updatePowerScore();
      return;
    }
  }
  combat.assignSkillToSlot(skillId, skillSlotAssignMode);
  skillSlotAssignMode = (skillSlotAssignMode + 1) % 3;
  renderSkillSlots();
  updateSkillSelection();
  updatePowerScore();
}

function updateWeaponSelection(): void {
  const items = uiElements.weaponGrid.querySelectorAll('.weapon-item');
  items.forEach((el) => {
    const div = el as HTMLDivElement;
    if (div.dataset.weaponId === combat.selectedWeaponId) {
      div.classList.add('selected');
    } else {
      div.classList.remove('selected');
    }
  });
}

function updateSkillSelection(): void {
  const assignedIds = new Set(
    combat.skillSlots.filter((s) => s.skillId).map((s) => s.skillId as string)
  );
  const items = uiElements.skillPalette.querySelectorAll('.skill-item');
  items.forEach((el) => {
    const div = el as HTMLDivElement;
    if (assignedIds.has(div.dataset.skillId as string)) {
      div.classList.add('slot-selected');
    } else {
      div.classList.remove('slot-selected');
    }
  });
}

function updateWeaponInfo(): void {
  const weapon = combat.getSelectedWeapon();
  const info = uiElements.weaponInfo;
  if (weapon) {
    info.innerHTML = `
      <div class="stat-row"><span class="stat-label">名称</span><span class="stat-value">${weapon.name}</span></div>
      <div class="stat-row"><span class="stat-label">基础伤害</span><span class="stat-value">${weapon.baseDamage}</span></div>
      <div class="stat-row"><span class="stat-label">攻击速度</span><span class="stat-value">${weapon.attackSpeed}/s</span></div>
      <div class="stat-row"><span class="stat-label">攻击范围</span><span class="stat-value">${weapon.attackRange}px</span></div>
    `;
  } else {
    info.innerHTML = '<div style="font-size:11px;color:rgba(255,255,255,0.5);">未选择武器</div>';
  }
}

function renderSkillSlots(): void {
  const slots = uiElements.skillSlots;
  slots.innerHTML = '';
  for (let i = 0; i < combat.skillSlots.length; i++) {
    const skill = combat.getSkillInSlot(i);
    const slotEl = document.createElement('div');
    slotEl.className = 'skill-slot' + (skill ? '' : ' empty');
    const ring = document.createElement('canvas');
    ring.className = 'cooldown-ring';
    ring.width = 60;
    ring.height = 60;
    ring.dataset.slotIndex = String(i);
    const badge = document.createElement('div');
    badge.className = 'skill-key-badge';
    badge.textContent = String(i + 1);
    const info = document.createElement('div');
    info.className = 'skill-slot-info';
    if (skill) {
      info.innerHTML = `
        <div class="skill-slot-name" style="color:${skill.color}">${skill.name}</div>
        <div class="skill-slot-cd" data-slot-cd="${i}">就绪</div>
      `;
    } else {
      info.innerHTML = `
        <div class="skill-slot-name" style="color:rgba(255,255,255,0.4)">空槽位</div>
        <div class="skill-slot-cd">点击左侧技能填充</div>
      `;
    }
    slotEl.appendChild(ring);
    slotEl.appendChild(badge);
    slotEl.appendChild(info);
    slotEl.addEventListener('click', () => {
      if (skill) {
        combat.assignSkillToSlot(null, i);
        renderSkillSlots();
        updateSkillSelection();
        updatePowerScore();
      }
    });
    slots.appendChild(slotEl);
  }
}

function drawCooldownRings(): void {
  for (let i = 0; i < combat.skillSlots.length; i++) {
    const ring = uiElements.skillSlots.querySelector(
      `canvas.cooldown-ring[data-slot-index="${i}"]`
    ) as HTMLCanvasElement | null;
    if (ring) {
      const rctx = ring.getContext('2d');
      if (rctx) {
        const w = ring.width;
        const h = ring.height;
        rctx.clearRect(0, 0, w, h);
        const skill = combat.getSkillInSlot(i);
        const cx = w / 2;
        const cy = h / 2;
        const radius = 18;
        if (skill) {
          rctx.save();
          rctx.translate(10, 10);
          drawSkillIcon(rctx, skill, 40);
          rctx.restore();
          const pct = combat.getSlotCooldownPercent(i);
          if (pct > 0) {
            rctx.save();
            rctx.strokeStyle = 'rgba(0,0,0,0.6)';
            rctx.lineWidth = 4;
            rctx.beginPath();
            rctx.arc(cx, cy, radius, 0, Math.PI * 2);
            rctx.stroke();
            rctx.strokeStyle = skill.color;
            rctx.lineWidth = 4;
            rctx.beginPath();
            rctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - pct));
            rctx.stroke();
            rctx.restore();
          } else {
            rctx.strokeStyle = 'rgba(255,255,255,0.2)';
            rctx.lineWidth = 3;
            rctx.beginPath();
            rctx.arc(cx, cy, radius, 0, Math.PI * 2);
            rctx.stroke();
          }
        } else {
          rctx.strokeStyle = 'rgba(255,255,255,0.15)';
          rctx.lineWidth = 3;
          rctx.beginPath();
          rctx.arc(cx, cy, radius, 0, Math.PI * 2);
          rctx.stroke();
        }
      }
    }
    const cdEl = uiElements.skillSlots.querySelector(
      `[data-slot-cd="${i}"]`
    ) as HTMLElement | null;
    if (cdEl) {
      const slot = combat.skillSlots[i];
      if (slot.skillId && slot.cooldownRemaining > 0) {
        cdEl.textContent = `冷却: ${slot.cooldownRemaining.toFixed(1)}s`;
      } else if (slot.skillId) {
        cdEl.textContent = '就绪';
      }
    }
  }
}

function updatePowerScore(): void {
  uiElements.powerScore.textContent = String(combat.calculatePowerScore());
}

function updateDpsDisplay(): void {
  const dps = combat.calculateDps();
  uiElements.dpsDisplay.textContent = dps.toFixed(0);
}

function updateStats(): void {
  uiElements.totalDamage.textContent = Math.floor(combat.stats.totalDamage).toString();
  uiElements.killCount.textContent = combat.stats.killCount.toString();
  uiElements.peakDps.textContent = combat.stats.peakDps.toFixed(0);
  uiElements.battleTime.textContent = combat.getBattleDurationSeconds() + 's';
  renderSkillUsageBars();
}

function renderSkillUsageBars(): void {
  const container = uiElements.skillUsageBars;
  container.innerHTML = '';
  let maxCount = 0;
  SKILLS.forEach((s) => {
    const c = combat.stats.skillUsageCounts[s.id] || 0;
    if (c > maxCount) maxCount = c;
  });
  SKILLS.forEach((skill) => {
    const count = combat.stats.skillUsageCounts[skill.id] || 0;
    const wrapper = document.createElement('div');
    wrapper.className = 'usage-bar-wrapper';
    const bar = document.createElement('div');
    bar.className = 'usage-bar';
    const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
    bar.style.height = `${Math.max(pct, 4)}%`;
    bar.style.color = skill.color;
    const label = document.createElement('div');
    label.className = 'usage-bar-label';
    label.textContent = skill.name;
    const countEl = document.createElement('div');
    countEl.className = 'usage-bar-count';
    countEl.textContent = String(count);
    wrapper.appendChild(bar);
    wrapper.appendChild(countEl);
    wrapper.appendChild(label);
    container.appendChild(wrapper);
  });
}

function triggerSkillFlash(slotIndex: number): void {
  const skill = combat.getSkillInSlot(slotIndex);
  if (!skill) return;
  const item = uiElements.skillPalette.querySelector(
    `.skill-item[data-skill-id="${skill.id}"]`
  ) as HTMLElement | null;
  if (item) {
    item.classList.remove('skill-flash');
    void item.offsetWidth;
    item.classList.add('skill-flash');
  }
}

function drawGrid(): void {
  const rect = canvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  ctx.save();
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTargets(): void {
  for (const t of entities.targets) {
    ctx.save();
    let baseColor = TARGET_COLOR;
    if (t.frozen) {
      baseColor = '#3498DB';
    }
    const gradient = ctx.createRadialGradient(t.x, t.y, t.radius * 0.2, t.x, t.y, t.radius);
    gradient.addColorStop(0, baseColor);
    gradient.addColorStop(1, t.frozen ? '#2980B9' : '#27AE60');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
    ctx.fill();
    if (t.hitFlash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${t.hitFlash * 10})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
    const barW = t.radius * 2;
    const barH = 4;
    const barX = t.x - t.radius;
    const barY = t.y - t.radius - 10;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(barX, barY, barW, barH);
    const hpPct = Math.max(0, t.hp / t.maxHp);
    ctx.fillStyle = hpPct > 0.5 ? '#2ECC71' : hpPct > 0.25 ? '#F1C40F' : '#E74C3C';
    ctx.fillRect(barX, barY, barW * hpPct, barH);
    if (t.burning) {
      ctx.strokeStyle = '#E67E22';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.radius + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (t.frozen) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      const r = t.radius + 6;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(t.x + Math.cos(a) * r, t.y + Math.sin(a) * r);
        ctx.lineTo(
          t.x + Math.cos(a) * (r + 5),
          t.y + Math.sin(a) * (r + 5)
        );
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

function drawParticles(): void {
  for (const p of entities.particles) {
    const alpha = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawSkillEffects(): void {
  for (const e of entities.skillEffects) {
    const t = e.life / e.maxLife;
    ctx.save();
    if (e.type === 'fire') {
      const alpha = 1 - t;
      const grad = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.radius);
      grad.addColorStop(0, `rgba(255,200,100,${alpha})`);
      grad.addColorStop(0.5, `rgba(230,126,34,${alpha * 0.7})`);
      grad.addColorStop(1, 'rgba(230,126,34,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === 'ice') {
      const alpha = 1 - t;
      ctx.strokeStyle = `rgba(52,152,219,${alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(52,152,219,${alpha * 0.3})`;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === 'heal') {
      const alpha = 1 - t;
      ctx.strokeStyle = `rgba(46,204,113,${alpha})`;
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius * (0.5 + i * 0.25), 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

function render(): void {
  const rect = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);
  drawGrid();
  drawSkillEffects();
  drawTargets();
  drawParticles();
}

function gameLoop(timestamp: number): void {
  if (!lastTime) lastTime = timestamp;
  const dt = Math.min(0.05, (timestamp - lastTime) / 1000);
  lastTime = timestamp;
  combat.update(dt);
  const dotEvents = entities.update(dt);
  if (dotEvents.length > 0) {
    const kills = entities.applyDamage(dotEvents);
    combat.applyDamageEvents(dotEvents);
    if (kills > 0) {
      combat.stats.killCount += kills;
    }
  }
  if (timestamp - lastDpsUpdate >= DPS_UPDATE_INTERVAL) {
    lastDpsUpdate = timestamp;
    updateDpsDisplay();
    updateStats();
  }
  drawCooldownRings();
  render();
  requestAnimationFrame(gameLoop);
}

function handleCanvasClick(e: MouseEvent): void {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const now = performance.now();
  if (combat.canAttackWithWeapon(now)) {
    const events = combat.calculateWeaponDamage(entities.targets, x, y);
    if (events.length > 0) {
      const kills = entities.applyDamage(events);
      combat.applyDamageEvents(events);
      if (kills > 0) {
        combat.stats.killCount += kills;
      }
    }
  }
}

function handleSkillCast(slotIndex: number): void {
  const castX = mouseX;
  const castY = mouseY;
  const { events, skill } = combat.castSkill(slotIndex, castX, castY, entities.targets);
  if (skill) {
    triggerSkillFlash(slotIndex);
    entities.spawnSkillEffect(skill.type, castX, castY, skill.effectRadius, skill.color);
    if (events.length > 0) {
      const kills = entities.applyDamage(events);
      combat.applyDamageEvents(events);
      if (kills > 0) {
        combat.stats.killCount += kills;
      }
    }
  }
}

function handleKeyDown(e: KeyboardEvent): void {
  if (e.key === '1') handleSkillCast(0);
  else if (e.key === '2') handleSkillCast(1);
  else if (e.key === '3') handleSkillCast(2);
}

function handleMouseMove(e: MouseEvent): void {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
}

function handleReset(): void {
  combat.resetStats();
  entities.reset();
  updateStats();
  updateDpsDisplay();
  drawCooldownRings();
}

function setupMobileToggles(): void {
  const leftBtn = document.getElementById('toggleLeftBtn');
  const rightBtn = document.getElementById('toggleRightBtn');
  const leftPanel = document.getElementById('leftPanel');
  const rightPanel = document.getElementById('rightPanel');
  if (leftBtn && leftPanel) {
    leftBtn.addEventListener('click', () => {
      leftPanel.classList.toggle('open');
      rightPanel?.classList.remove('open');
    });
  }
  if (rightBtn && rightPanel) {
    rightBtn.addEventListener('click', () => {
      rightPanel.classList.toggle('open');
      leftPanel?.classList.remove('open');
    });
  }
}

function init(): void {
  canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  const c = canvas.getContext('2d');
  if (!c) {
    console.error('无法获取Canvas 2D上下文');
    return;
  }
  ctx = c;
  uiElements.weaponGrid = document.getElementById('weaponGrid') as HTMLDivElement;
  uiElements.skillPalette = document.getElementById('skillPalette') as HTMLDivElement;
  uiElements.skillSlots = document.getElementById('skillSlots') as HTMLDivElement;
  uiElements.weaponInfo = document.getElementById('weaponInfo') as HTMLDivElement;
  uiElements.dpsDisplay = document.getElementById('dpsDisplay') as HTMLDivElement;
  uiElements.powerScore = document.getElementById('powerScore') as HTMLSpanElement;
  uiElements.totalDamage = document.getElementById('totalDamage') as HTMLDivElement;
  uiElements.killCount = document.getElementById('killCount') as HTMLDivElement;
  uiElements.peakDps = document.getElementById('peakDps') as HTMLDivElement;
  uiElements.battleTime = document.getElementById('battleTime') as HTMLDivElement;
  uiElements.skillUsageBars = document.getElementById('skillUsageBars') as HTMLDivElement;
  const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  canvas.addEventListener('click', handleCanvasClick);
  canvas.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('keydown', handleKeyDown);
  resetBtn.addEventListener('click', handleReset);
  setupMobileToggles();
  buildWeaponGrid();
  buildSkillPalette();
  renderSkillSlots();
  updateWeaponInfo();
  updatePowerScore();
  updateStats();
  updateDpsDisplay();
  drawCooldownRings();
  renderSkillUsageBars();
  requestAnimationFrame(gameLoop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
