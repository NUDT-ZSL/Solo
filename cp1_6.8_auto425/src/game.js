import { Level } from './level.js';
import { Player } from './player.js';
import { Effects } from './effects.js';

const STATES = { MENU: 0, PLAYING: 1, PAUSED: 2, COMPLETE: 3 };

export class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.effects = new Effects();
    this.state = STATES.MENU;
    this.currentLevelIndex = 0;
    this.level = null;
    this.player = null;
    this.keys = {};
    this.keyProcessed = {};
    this.elapsedTime = 0;
    this.lastTime = 0;
    this.portalParticlesTimer = 0;

    this._setupCanvas();
    this._setupUI();
    this._setupInput();
    this._showMenu();

    requestAnimationFrame((t) => this._loop(t));
  }

  _setupCanvas() {
    this._resizeCanvas();
    window.addEventListener('resize', () => this._resizeCanvas());
  }

  _resizeCanvas() {
    const maxW = window.innerWidth - 20;
    const maxH = window.innerHeight - 20;

    if (this.level) {
      const lw = this.level.width * Level.TILE_SIZE;
      const lh = this.level.height * Level.TILE_SIZE;
      const scale = Math.min(maxW / lw, maxH / lh, 2);
      this.canvas.width = lw;
      this.canvas.height = lh;
      this.canvas.style.width = Math.floor(lw * scale) + 'px';
      this.canvas.style.height = Math.floor(lh * scale) + 'px';
    } else {
      const w = 10 * Level.TILE_SIZE;
      const h = 8 * Level.TILE_SIZE;
      const scale = Math.min(maxW / w, maxH / h, 2);
      this.canvas.width = w;
      this.canvas.height = h;
      this.canvas.style.width = Math.floor(w * scale) + 'px';
      this.canvas.style.height = Math.floor(h * scale) + 'px';
    }
  }

  _setupUI() {
    this.elLevelText = document.getElementById('level-text');
    this.elStars = document.getElementById('hud-stars');
    this.elSequenceHint = document.getElementById('sequence-hint');
    this.elPauseOverlay = document.getElementById('pause-overlay');
    this.elCompleteOverlay = document.getElementById('level-complete-overlay');
    this.elCompleteStars = document.getElementById('complete-stars');
    this.elMenuOverlay = document.getElementById('menu-overlay');
    this.elBtnPause = document.getElementById('btn-pause');
    this.elBtnResume = document.getElementById('btn-resume');
    this.elBtnRestartPause = document.getElementById('btn-restart-pause');
    this.elBtnNext = document.getElementById('btn-next');
    this.elBtnStart = document.getElementById('btn-start');

    this.elBtnPause.addEventListener('click', () => this._pause());
    this.elBtnResume.addEventListener('click', () => this._resume());
    this.elBtnRestartPause.addEventListener('click', () => this._restart());
    this.elBtnNext.addEventListener('click', () => this._nextLevel());
    this.elBtnStart.addEventListener('click', () => this._startGame());
  }

  _setupInput() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      if (['w', 'a', 's', 'd', 'r', 'escape'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
      this.keyProcessed[e.key.toLowerCase()] = false;
    });
  }

  _isKeyJustPressed(key) {
    if (this.keys[key] && !this.keyProcessed[key]) {
      this.keyProcessed[key] = true;
      return true;
    }
    return false;
  }

  _showMenu() {
    this.state = STATES.MENU;
    this.elMenuOverlay.style.display = 'flex';
    this.elPauseOverlay.classList.remove('active');
    this.elCompleteOverlay.classList.remove('active');
  }

  _startGame() {
    this.elMenuOverlay.style.display = 'none';
    this._loadLevel(this.currentLevelIndex);
  }

  _loadLevel(index) {
    this.level = new Level(index);
    this.player = new Player(this.level.data.playerStart.x, this.level.data.playerStart.y);
    this.player.onStepComplete = (event) => {
      if (event === 'portal') {
        this._completeLevel();
      }
    };
    this.effects.clear();
    this.elapsedTime = 0;
    this.state = STATES.PLAYING;
    this.portalParticlesTimer = 0;

    this._resizeCanvas();
    this._updateHUD();

    this.elPauseOverlay.classList.remove('active');
    this.elCompleteOverlay.classList.remove('active');
  }

  _pause() {
    if (this.state !== STATES.PLAYING) return;
    this.state = STATES.PAUSED;
    this.elPauseOverlay.classList.add('active');
  }

  _resume() {
    if (this.state !== STATES.PAUSED) return;
    this.state = STATES.PLAYING;
    this.elPauseOverlay.classList.remove('active');
  }

  _restart() {
    this.elPauseOverlay.classList.remove('active');
    this.elCompleteOverlay.classList.remove('active');
    this._loadLevel(this.currentLevelIndex);
  }

  _completeLevel() {
    this.state = STATES.COMPLETE;
    const stars = this.level.calculateStars(this.elapsedTime, this.player.steps);
    this.effects.playWinSound();

    let starsHTML = '';
    for (let i = 0; i < 3; i++) {
      starsHTML += i < stars
        ? '<span class="star-on">&#9733;</span>'
        : '<span class="star-off">&#9733;</span>';
    }
    this.elCompleteStars.innerHTML = starsHTML;

    setTimeout(() => {
      this.elCompleteOverlay.classList.add('active');
    }, 400);
  }

  _nextLevel() {
    this.elCompleteOverlay.classList.remove('active');
    this.currentLevelIndex++;
    if (this.currentLevelIndex >= Level.totalLevels) {
      this.currentLevelIndex = 0;
      this._showMenu();
    } else {
      this._loadLevel(this.currentLevelIndex);
    }
  }

  _updateHUD() {
    if (!this.level) return;
    const d = this.level.data;
    this.elLevelText.textContent = `LV.${d.id} ${d.name}`;

    const stars = this.state === STATES.COMPLETE
      ? this.level.calculateStars(this.elapsedTime, this.player.steps)
      : 0;
    let starsHTML = '';
    for (let i = 0; i < 3; i++) {
      starsHTML += i < stars
        ? '<span class="star-on">&#9733;</span>'
        : '<span class="star-off">&#9733;</span>';
    }
    this.elStars.innerHTML = starsHTML;

    let seqHTML = '<div style="margin-bottom:2px">ORDER:</div>';
    this.level.sequence.forEach((elem, idx) => {
      const info = Level.ELEMENTS[elem];
      const done = idx < this.level.currentStep;
      const op = done ? 1 : 0.4;
      seqHTML += `<span style="display:inline-block;width:10px;height:10px;background:${info.color};opacity:${op};margin-right:3px;vertical-align:middle;image-rendering:pixelated;"></span>`;
    });
    this.elSequenceHint.innerHTML = seqHTML;
  }

  _handleInput() {
    if (this.state !== STATES.PLAYING) return;
    if (!this.player || this.player.moving) return;

    if (this._isKeyJustPressed('w') || this._isKeyJustPressed('arrowup')) {
      this.player.tryMove(0, -1, this.level);
      this.effects.playStepSound();
    } else if (this._isKeyJustPressed('s') || this._isKeyJustPressed('arrowdown')) {
      this.player.tryMove(0, 1, this.level);
      this.effects.playStepSound();
    } else if (this._isKeyJustPressed('a') || this._isKeyJustPressed('arrowleft')) {
      this.player.tryMove(-1, 0, this.level);
      this.effects.playStepSound();
    } else if (this._isKeyJustPressed('d') || this._isKeyJustPressed('arrowright')) {
      this.player.tryMove(1, 0, this.level);
      this.effects.playStepSound();
    }

    if (this._isKeyJustPressed('r')) {
      this._restart();
    }

    if (this._isKeyJustPressed('escape')) {
      this._pause();
    }
  }

  _update(dt) {
    if (this.state === STATES.PLAYING) {
      this.elapsedTime += dt;
      this.level.update(dt);
      this.player.update(dt, this.level, this.effects);
      this.effects.update(dt);

      if (this.level.portalOpen) {
        this.portalParticlesTimer += dt;
        if (this.portalParticlesTimer > 0.15) {
          this.portalParticlesTimer = 0;
          const p = this.level.data.portalPos;
          this.effects.spawnPortalParticles(p.x * Level.TILE_SIZE, p.y * Level.TILE_SIZE);
        }
      }

      this._updateHUD();
    } else if (this.state === STATES.COMPLETE) {
      this.effects.update(dt);
      if (this.level) this.level.update(dt);
    }
  }

  _render() {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;

    if (this.state === STATES.MENU) {
      const w = this.canvas.width;
      const h = this.canvas.height;
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#0a0a2e');
      grad.addColorStop(1, '#1a0a2e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(42, 42, 74, 0.3)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += Level.TILE_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += Level.TILE_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(w, y + 0.5);
        ctx.stroke();
      }

      const t = Date.now() * 0.001;
      ['fire', 'water', 'earth', 'wind'].forEach((elem, i) => {
        const info = Level.ELEMENTS[elem];
        const bx = w / 2 - 100 + i * 55;
        const by = h / 2 + 30 + Math.sin(t * 2 + i) * 5;
        ctx.fillStyle = info.color + '44';
        ctx.fillRect(bx, by, 20, 20);
        ctx.fillStyle = info.color;
        ctx.fillRect(bx + 4, by + 4, 12, 12);
      });

      return;
    }

    if (!this.level) return;

    this.level.draw(ctx);
    this.effects.draw(ctx);
    if (this.player) this.player.draw(ctx);
  }

  _loop(timestamp) {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    this._handleInput();
    this._update(dt);
    this._render();

    requestAnimationFrame((t) => this._loop(t));
  }
}

const game = new Game();
