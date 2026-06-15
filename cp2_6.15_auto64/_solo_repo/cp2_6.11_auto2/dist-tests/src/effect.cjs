"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EffectSystem = void 0;
const board_1 = require("./board");
class EffectSystem {
    constructor() {
        this.particles = [];
        this.pieceAnimations = new Map();
        this.victoryGlow = {
            active: false,
            intensity: 0,
            line: null,
        };
        this.boardOpacity = 1;
        this.boardFading = null;
        this.boardFadeProgress = 0;
        this.boardFadeDuration = 300;
    }
    update(deltaTime) {
        this.updateParticles(deltaTime);
        this.updatePieceAnimations(deltaTime);
        this.updateVictoryGlow(deltaTime);
        this.updateBoardFade(deltaTime);
    }
    updateParticles(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * deltaTime * 0.06;
            p.y += p.vy * deltaTime * 0.06;
            p.vy += 0.15 * deltaTime * 0.06;
            p.life -= deltaTime;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    updatePieceAnimations(deltaTime) {
        for (const [_key, anim] of this.pieceAnimations) {
            if (anim.phase === 'done')
                continue;
            anim.progress += deltaTime;
            const t = Math.min(anim.progress / anim.duration, 1);
            if (anim.phase === 'growing') {
                anim.scale = this.easeOutElastic(t, 0, 1.2, 1);
                if (t >= 0.6) {
                    anim.phase = 'shrinking';
                    anim.progress = 0;
                }
            }
            else if (anim.phase === 'shrinking') {
                anim.scale = 1.2 - this.easeOutQuad(t, 0, 0.2, 1);
                if (t >= 1) {
                    anim.phase = 'done';
                    anim.scale = 1;
                }
            }
        }
    }
    easeOutElastic(t, b, c, d) {
        const p = d * 0.3;
        const a = c;
        const s = p * 0.25;
        if (t === 0)
            return b;
        if ((t /= d) === 1)
            return b + c;
        return a * Math.pow(2, -10 * t) * Math.sin((t * d - s) * (2 * Math.PI) / p) + c + b;
    }
    easeOutQuad(t, b, c, d) {
        return -c * (t /= d) * (t - 2) + b;
    }
    updateVictoryGlow(deltaTime) {
        if (this.victoryGlow.active) {
            this.victoryGlow.intensity = Math.min(1, this.victoryGlow.intensity + deltaTime * 0.003);
        }
        else {
            this.victoryGlow.intensity = Math.max(0, this.victoryGlow.intensity - deltaTime * 0.005);
        }
    }
    updateBoardFade(deltaTime) {
        if (this.boardFading === null)
            return;
        this.boardFadeProgress += deltaTime;
        const t = Math.min(this.boardFadeProgress / this.boardFadeDuration, 1);
        if (this.boardFading === 'out') {
            this.boardOpacity = 1 - t;
        }
        else {
            this.boardOpacity = t;
        }
        if (t >= 1) {
            this.boardFading = null;
        }
    }
    spawnBurstParticles(centerX, centerY, count = 40) {
        count = Math.min(count, 50);
        const colors = [board_1.PLAYER1_COLOR, board_1.PLAYER2_COLOR];
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 5;
            this.particles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: 2 + Math.random() * 2,
                life: 600 + Math.random() * 200,
                maxLife: 800,
            });
        }
    }
    startPieceAnimation(row, col) {
        const key = `${row}-${col}`;
        this.pieceAnimations.set(key, {
            row,
            col,
            scale: 0,
            targetScale: 1,
            phase: 'growing',
            progress: 0,
            duration: 200,
        });
    }
    getPieceScale(row, col) {
        const key = `${row}-${col}`;
        const anim = this.pieceAnimations.get(key);
        return anim ? anim.scale : 1;
    }
    clearPieceAnimations() {
        this.pieceAnimations.clear();
    }
    startBoardFadeOut() {
        this.boardFading = 'out';
        this.boardFadeProgress = 0;
        this.boardOpacity = 1;
    }
    startBoardFadeIn() {
        this.boardFading = 'in';
        this.boardFadeProgress = 0;
        this.boardOpacity = 0;
    }
    getBoardOpacity() {
        return this.boardOpacity;
    }
    isBoardFading() {
        return this.boardFading !== null;
    }
    startVictoryGlow(line) {
        this.victoryGlow.active = true;
        this.victoryGlow.line = line;
        this.victoryGlow.intensity = 0;
    }
    stopVictoryGlow() {
        this.victoryGlow.active = false;
    }
    getVictoryGlow() {
        return { intensity: this.victoryGlow.intensity, line: this.victoryGlow.line };
    }
    getParticles() {
        return this.particles;
    }
    clearAll() {
        this.particles = [];
        this.pieceAnimations.clear();
        this.victoryGlow = { active: false, intensity: 0, line: null };
        this.boardOpacity = 1;
        this.boardFading = null;
        this.boardFadeProgress = 0;
    }
}
exports.EffectSystem = EffectSystem;
