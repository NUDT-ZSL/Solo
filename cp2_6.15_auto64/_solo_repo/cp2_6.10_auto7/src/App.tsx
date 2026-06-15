import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import InspirationBoard from './InspirationBoard';

type Route = 'login' | 'register' | 'board';

export interface AuthState {
  token: string;
  userId: string;
  highlightIndex: number;
  isFirstLoginToday: boolean;
}

export type InspirationCategory = 'text' | 'image' | 'color' | 'audio';

export interface Inspiration {
  id: string;
  userId: string;
  category: InspirationCategory;
  content: string;
  tags: string[];
  colorComplement?: string;
  createdAt: number;
  updatedAt: number;
}

const TOKEN_KEY = 'ib_token';
const UID_KEY = 'ib_uid';

export const getStoredAuth = (): string | null => {
  try {
    const t = localStorage.getItem(TOKEN_KEY);
    const u = localStorage.getItem(UID_KEY);
    return t && u ? t : null;
  } catch {
    return null;
  }
};

export const apiFetch = (path: string, options: RequestInit = {}): Promise<Response> => {
  const token = getStoredAuth();
  const headers = new Headers(options.headers || {});
  if (token) headers.set('x-auth-token', token);
  if (options.body && typeof options.body !== 'string' && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(path, { ...options, headers });
};

const initBgParticles = (): (() => void) => {
  const canvas = document.getElementById('bg-particles') as HTMLCanvasElement | null;
  if (!canvas) return () => {};
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  let raf = 0;
  let w = 0;
  let h = 0;
  const dpr = window.devicePixelRatio || 1;
  type P = { x: number; y: number; vx: number; vy: number; r: number; a: number };
  let parts: P[] = [];
  const resize = () => {
    w = canvas.clientWidth = window.innerWidth;
    h = canvas.clientHeight = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.floor((w * h) / 18000);
    parts = Array.from({ length: n }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.4 + 0.4,
      a: Math.random() * 0.3 + 0.15,
    }));
  };
  resize();
  window.addEventListener('resize', resize);
  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    for (const p of parts) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;
      ctx.beginPath();
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
      grad.addColorStop(0, `rgba(140,160,255,${p.a})`);
      grad.addColorStop(1, 'rgba(140,160,255,0)');
      ctx.fillStyle = grad;
      ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    raf = requestAnimationFrame(draw);
  };
  draw();
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
  };
};

const globalCss = `
* { box-sizing: border-box; }
input, button, textarea { font-family: inherit; }

@keyframes cardSpringIn {
  0% { transform: translateY(60px) scale(0.85); opacity: 0; }
  60% { transform: translateY(-8px) scale(1.03); opacity: 1; }
  80% { transform: translateY(4px) scale(0.99); }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}
@keyframes cardDeleteOut {
  0% { transform: scale(1) rotate(0); opacity: 1; }
  100% { transform: scale(0) rotate(360deg); opacity: 0; }
}
@keyframes flipFadeOut {
  0% { transform: rotateY(0); opacity: 1; }
  100% { transform: rotateY(120deg); opacity: 0; }
}
@keyframes complementaryBorderGlow {
  0%, 100% { box-shadow: 0 0 0 5px var(--comp-color), 0 0 10px var(--comp-color), 0 0 20px var(--comp-color); }
  50% { box-shadow: 0 0 0 5px var(--comp-color), 0 0 25px var(--comp-color), 0 0 40px var(--comp-color); }
}
@keyframes starParticles {
  0% { transform: scale(0); opacity: 1; }
  100% { transform: scale(1); opacity: 0; }
}
@keyframes borderGlow {
  0%, 100% { box-shadow: 0 0 0 rgba(255,255,255,0.1), inset 0 0 0 rgba(255,255,255,0); }
  50% { box-shadow: 0 0 14px rgba(255,255,255,0.4), inset 0 0 10px rgba(255,255,255,0.2); }
}
@keyframes rotate3s {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes ripple {
  0% { transform: scale(0.6); opacity: 0.8; }
  100% { transform: scale(2.4); opacity: 0; }
}
@keyframes starFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
.glass {
  background: rgba(255,255,255,0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.1);
}
input, textarea, select {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 10px;
  color: #E8E8E8;
  padding: 10px 14px;
  outline: none;
  transition: box-shadow 150ms ease, border-color 150ms ease;
  font-size: 14px;
  width: 100%;
}
input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.35); }
input:focus, textarea:focus, select:focus {
  box-shadow: 0 0 8px rgba(91,127,255,0.6);
  border-color: rgba(91,127,255,0.7);
}
button {
  cursor: pointer;
  border: none;
  outline: none;
  transition: all 150ms ease;
  font-family: inherit;
}
button:focus-visible {
  box-shadow: 0 0 8px rgba(91,127,255,0.6);
}
.btn-primary {
  background: linear-gradient(135deg, #5B7FFF 0%, #7B9FFF 100%);
  color: #fff;
  padding: 10px 18px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 14px;
}
.btn-primary:hover { filter: brightness(1.08); transform: translateY(-1px); }
.btn-primary:active { transform: translateY(0); }
.btn-primary:disabled { filter: grayscale(0.6); cursor: not-allowed; transform: none; }
.btn-ghost {
  background: rgba(255,255,255,0.08);
  color: #E0E0E0;
  padding: 10px 18px;
  border-radius: 10px;
  font-weight: 500;
  border: 1px solid rgba(255,255,255,0.12);
  font-size: 14px;
}
.btn-ghost:hover { background: rgba(255,255,255,0.14); }
.auth-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.auth-card {
  width: 100%;
  max-width: 420px;
  border-radius: 20px;
  padding: 40px 32px;
}
.auth-title {
  font-size: 28px;
  font-weight: 700;
  color: #F0F0F0;
  margin: 0 0 8px;
  text-align: center;
}
.auth-sub {
  color: rgba(255,255,255,0.5);
  text-align: center;
  margin: 0 0 28px;
  font-size: 14px;
}
.field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.field label { font-size: 13px; color: rgba(255,255,255,0.7); }
.err-msg {
  background: rgba(255,80,80,0.15);
  color: #FF9B9B;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  margin-bottom: 16px;
  border: 1px solid rgba(255,80,80,0.3);
}
.auth-switch {
  margin-top: 18px;
  text-align: center;
  color: rgba(255,255,255,0.6);
  font-size: 14px;
}
.auth-switch a {
  color: #9BB0FF;
  text-decoration: none;
  cursor: pointer;
  font-weight: 500;
}
.auth-switch a:hover { text-decoration: underline; }
.tag-chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: opacity 200ms ease, transform 150ms ease;
  user-select: none;
}
.tag-chip:hover { transform: translateY(-1px); }
.tag-chip.dimmed { opacity: 0.3; }

.color-card {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  border-radius: 16px;
  overflow: hidden;
  animation: complementaryBorderGlow 2s ease-in-out infinite;
}
.color-card-text {
  color: #fff;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 2px;
  text-shadow: 0 2px 8px rgba(0,0,0,0.5), 0 0 20px rgba(0,0,0,0.3);
  font-family: ui-monospace, monospace;
}

.highlight-card {
  position: relative;
  background: linear-gradient(135deg, #FF9A5B 0%, #FF7A9E 50%, #FF5B8B 100%);
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(255,122,158,0.4);
  height: 100%;
}
.highlight-title {
  color: #fff;
  font-size: 22px;
  font-weight: 700;
  margin: 0;
  letter-spacing: 1px;
  text-shadow: 0 2px 10px rgba(0,0,0,0.3);
}
.highlight-star-wrap {
  position: relative;
  width: 72px;
  height: 72px;
  margin: 16px 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.highlight-star {
  animation: rotate3s 3s linear infinite;
  filter: drop-shadow(0 0 12px rgba(255,255,255,0.8));
}
.highlight-particle {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #fff;
  pointer-events: none;
  animation: starParticles 800ms ease-out forwards;
  box-shadow: 0 0 8px rgba(255,255,255,0.9);
}

.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  z-index: 100;
  transition: background 300ms ease;
  background: linear-gradient(180deg, rgba(30,42,56,0.9) 0%, rgba(30,42,56,0) 100%);
}
.nav-bar.scrolled {
  background: linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
.nav-title {
  font-size: 24px;
  font-weight: 700;
  color: #E0E0E0;
  letter-spacing: 0.5px;
}
.add-btn {
  width: 44px;
  height: 44px;
  border-radius: 22px;
  background: #5B7FFF;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: width 300ms ease, background 300ms ease, border-radius 300ms ease;
  overflow: hidden;
  gap: 8px;
  padding: 0;
  border: none;
  font-weight: 600;
  font-size: 14px;
}
.add-btn:hover {
  width: 140px;
  border-radius: 22px;
  background: #7B9FFF;
}
.add-btn .btn-text {
  white-space: nowrap;
  opacity: 0;
  transition: opacity 200ms ease;
}
.add-btn:hover .btn-text {
  opacity: 1;
}
.logout-btn {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.2);
  color: rgba(255,255,255,0.7);
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  transition: all 200ms ease;
}
.logout-btn:hover {
  background: rgba(255,255,255,0.1);
  color: #fff;
  border-color: rgba(255,255,255,0.4);
}

.board-wrap {
  min-height: 100vh;
  padding-top: 84px;
  padding-bottom: 40px;
  display: flex;
  align-items: center;
  box-sizing: border-box;
}
.board-scroll {
  width: 80%;
  max-width: 1600px;
  margin: 0 auto;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 24px 12px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.3) transparent;
}
.board-scroll::-webkit-scrollbar { height: 8px; }
.board-scroll::-webkit-scrollbar-track { background: transparent; }
.board-scroll::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.25);
  border-radius: 4px;
}
.board-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.4); }
.board-inner {
  display: flex;
  gap: 24px;
  padding: 20px 10px;
  align-items: stretch;
}

.insp-card {
  position: relative;
  flex-shrink: 0;
  width: 220px;
  height: 280px;
  border-radius: 16px;
  background: rgba(255,255,255,0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.1);
  animation: cardSpringIn 500ms cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  opacity: 0;
  overflow: hidden;
  transform-style: preserve-3d;
  transition: transform 500ms ease;
  cursor: pointer;
}
.insp-card.deleting {
  animation: cardDeleteOut 350ms ease-in forwards !important;
}
.insp-card.flipped {
  transform: rotateY(180deg);
}
.card-face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
}
.card-back {
  transform: rotateY(180deg);
  background: rgba(255,255,255,0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 14px;
  gap: 8px;
}
.card-back textarea {
  flex: 1;
  resize: none;
  font-size: 13px;
  line-height: 1.5;
}
.card-back .btn-row {
  display: flex;
  gap: 8px;
}
.card-back .btn-row button {
  flex: 1;
  padding: 8px 12px;
  font-size: 13px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-weight: 500;
}
.card-back .btn-save {
  background: linear-gradient(135deg, #5B7FFF, #7B9FFF);
  color: #fff;
}
.card-back .btn-cancel {
  background: rgba(255,255,255,0.1);
  color: #E0E0E0;
  border: 1px solid rgba(255,255,255,0.15);
}

.card-delete-btn {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(0,0,0,0.4);
  border: none;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: background 200ms ease, transform 150ms ease;
  opacity: 0;
}
.insp-card:hover .card-delete-btn {
  opacity: 1;
}
.card-delete-btn:hover {
  background: rgba(255,80,80,0.8);
  transform: scale(1.1);
}
.card-edit-btn {
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(0,0,0,0.4);
  border: none;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: background 200ms ease, transform 150ms ease;
  opacity: 0;
}
.insp-card:hover .card-edit-btn {
  opacity: 1;
}
.card-edit-btn:hover {
  background: rgba(91,127,255,0.8);
  transform: scale(1.1);
}

.card-tags {
  position: absolute;
  bottom: 10px;
  left: 12px;
  right: 12px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  z-index: 5;
}
.card-content {
  flex: 1;
  overflow: hidden;
  color: #E8E8E8;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 8px;
}
.card-content img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}
.card-category {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 10px;
  color: rgba(255,255,255,0.6);
  background: rgba(0,0,0,0.3);
  padding: 3px 8px;
  border-radius: 999px;
  font-weight: 500;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 20px;
  animation: fadeIn 200ms ease;
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.modal-content {
  background: rgba(30,30,50,0.9);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 20px;
  padding: 28px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  animation: modalIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes modalIn {
  from { transform: scale(0.9) translateY(20px); opacity: 0; }
  to { transform: scale(1) translateY(0); opacity: 1; }
}
.modal-title {
  font-size: 20px;
  font-weight: 700;
  color: #F0F0F0;
  margin: 0 0 20px;
}
.category-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}
.category-tab {
  flex: 1;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.7);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 200ms ease;
}
.category-tab.active {
  background: linear-gradient(135deg, #5B7FFF, #7B9FFF);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 4px 12px rgba(91,127,255,0.4);
}
.modal-btn-row {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}

.filter-bar {
  width: 80%;
  max-width: 1600px;
  margin: 0 auto 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  padding: 0 12px;
}
.filter-label {
  font-size: 13px;
  color: rgba(255,255,255,0.5);
  margin-right: 4px;
}
.filter-clear {
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  color: #E0E0E0;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  cursor: pointer;
  transition: all 200ms ease;
}
.filter-clear:hover {
  background: rgba(255,255,255,0.18);
}

@media (max-width: 768px) {
  .board-scroll { width: 100%; }
  .board-inner {
    flex-direction: column;
    gap: 12px;
    padding: 12px 10px;
  }
  .insp-card {
    width: 100%;
    height: 280px;
  }
  .nav-bar { padding: 0 16px; }
  .add-btn:hover { width: 44px; }
  .add-btn .btn-text { display: none; }
  .board-wrap { padding-top: 74px; }
  .filter-bar { width: 100%; }
}
`;

const tagColors = [
  'linear-gradient(135deg,#FF7A7A,#FF9E7A)',
  'linear-gradient(135deg,#7AC8FF,#7A98FF)',
  'linear-gradient(135deg,#7AFFB8,#7AFFD7)',
  'linear-gradient(135deg,#FFD77A,#FFB07A)',
  'linear-gradient(135deg,#C77AFF,#9B7AFF)',
  'linear-gradient(135deg,#FF7AD7,#FF7AAE)',
  'linear-gradient(135deg,#7AFFF0,#7AE8FF)',
  'linear-gradient(135deg,#B8FF7A,#8CFF7A)',
];

export const tagColorFor = (tag: string): string => {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) | 0;
  return tagColors[Math.abs(h) % tagColors.length];
};

function LoginPage({ onSuccess, onSwitch }: { onSuccess: (a: AuthState) => void; onSwitch: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!email || !password) { setErr('请填写邮箱和密码'); return; }
    setLoading(true);
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const d = await r.json();
      if (!d.success) { setErr(d.error || '登录失败'); setLoading(false); return; }
      localStorage.setItem(TOKEN_KEY, d.data.token);
      localStorage.setItem(UID_KEY, d.data.userId);
      onSuccess({ token: d.data.token, userId: d.data.userId, highlightIndex: d.data.highlightIndex, isFirstLoginToday: d.data.isFirstLoginToday });
    } catch {
      setErr('网络错误，请稍后再试');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="field">
        <label>邮箱</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" autoComplete="email" />
      </div>
      <div className="field">
        <label>密码</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少 6 位" autoComplete="current-password" />
      </div>
      {err && <div className="err-msg">{err}</div>}
      <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px', fontSize: 15 }} disabled={loading}>
        {loading ? '登录中...' : '登 录'}
      </button>
      <div className="auth-switch">
        还没有账号？<a onClick={onSwitch}>立即注册</a>
      </div>
    </form>
  );
}

function RegisterPage({ onSuccess, onSwitch }: { onSuccess: (a: AuthState) => void; onSwitch: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!email || !password) { setErr('请填写邮箱和密码'); return; }
    if (password !== confirm) { setErr('两次密码不一致'); return; }
    setLoading(true);
    try {
      const r = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const d = await r.json();
      if (!d.success) { setErr(d.error || '注册失败'); setLoading(false); return; }
      localStorage.setItem(TOKEN_KEY, d.data.token);
      localStorage.setItem(UID_KEY, d.data.userId);
      onSuccess({ token: d.data.token, userId: d.data.userId, highlightIndex: 0, isFirstLoginToday: true });
    } catch {
      setErr('网络错误，请稍后再试');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="field">
        <label>邮箱</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" autoComplete="email" />
      </div>
      <div className="field">
        <label>密码</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少 6 位" autoComplete="new-password" />
      </div>
      <div className="field">
        <label>确认密码</label>
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="再次输入密码" autoComplete="new-password" />
      </div>
      {err && <div className="err-msg">{err}</div>}
      <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px', fontSize: 15 }} disabled={loading}>
        {loading ? '注册中...' : '注 册'}
      </button>
      <div className="auth-switch">
        已有账号？<a onClick={onSwitch}>去登录</a>
      </div>
    </form>
  );
}

function App() {
  const [route, setRoute] = useState<Route>('login');
  const [auth, setAuth] = useState<AuthState | null>(null);

  useEffect(() => {
    const dispose = initBgParticles();
    return () => dispose && dispose();
  }, []);

  useEffect(() => {
    const t = getStoredAuth();
    const u = localStorage.getItem(UID_KEY);
    if (t && u) {
      setAuth({ token: t, userId: u!, highlightIndex: 0, isFirstLoginToday: false });
      setRoute('board');
    }
  }, []);

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(UID_KEY);
    setAuth(null);
    setRoute('login');
  };

  return (
    <>
      <style>{globalCss}</style>
      {route === 'board' && auth ? (
        <InspirationBoard auth={auth} onLogout={logout} />
      ) : (
          <div className="auth-wrap">
            <div className="glass auth-card">
              <h1 className="auth-title">灵感切片板</h1>
              <p className="auth-sub">收集你的每一个创意瞬间</p>
              {route === 'login' ? (
                <LoginPage
                  onSuccess={(a) => { setAuth(a); setRoute('board'); }}
                  onSwitch={() => setRoute('register')}
                />
              ) : (
                <RegisterPage
                  onSuccess={(a) => { setAuth(a); setRoute('board'); }}
                  onSwitch={() => setRoute('login')}
                />
              )}
            </div>
          </div>
        )}
    </>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
