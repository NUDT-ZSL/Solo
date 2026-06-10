import type { PixelPos } from './player';

export interface LevelTheme {
    id: number;
    name: string;
    accentColor: string;
}

export const LEVEL_THEMES: LevelTheme[] = [
    { id: 1, name: '第一关：初始跃迁', accentColor: '#00FFAA' },
    { id: 2, name: '第二关：折射初试', accentColor: '#00D4FF' },
    { id: 3, name: '第三关：镜面回廊', accentColor: '#AABBFF' },
    { id: 4, name: '第四关：分岔迷途', accentColor: '#BB88FF' },
    { id: 5, name: '第五关：混沌迷宫', accentColor: '#FF88DD' },
    { id: 6, name: '第六关：时序迷阵', accentColor: '#FF8888' },
    { id: 7, name: '第七关：双锁之门', accentColor: '#FFAA55' },
    { id: 8, name: '第八关：三联核心', accentColor: '#FFDD44' },
    { id: 9, name: '第九关：量子终局', accentColor: '#FFD700' }
];

export interface LevelButtonState {
    id: number;
    unlocked: boolean;
    isCurrent: boolean;
    hovered: boolean;
    position: PixelPos;
    size: number;
}

export interface LockParticle {
    position: PixelPos;
    velocity: PixelPos;
    rotation: number;
    rotationSpeed: number;
    life: number;
    maxLife: number;
    active: boolean;
}

export interface HexagonCluster {
    position: PixelPos;
    size: number;
    rotation: number;
    opacity: number;
}

export interface WaveTransition {
    active: boolean;
    startTime: number;
    duration: number;
    centerX: number;
    centerY: number;
}

export interface GameOverUI {
    active: boolean;
    buttonHovered: boolean;
}

export interface TopBarState {
    levelName: string;
    lives: number;
    maxLives: number;
}

export interface LevelMenuState {
    active: boolean;
    buttons: LevelButtonState[];
    unlockAnimations: Map<number, LockParticle[]>;
    maxUnlockedLevel: number;
}

export class UIManager {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    hexagonClusters: HexagonCluster[];
    waveTransition: WaveTransition;
    gameOverUI: GameOverUI;
    topBar: TopBarState;
    levelMenu: LevelMenuState;
    responsiveScale: number;
    private themeDisplayTime: number;
    private themeDisplayAlpha: number;
    private currentThemeName: string;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.responsiveScale = 1;
        this.themeDisplayTime = 0;
        this.themeDisplayAlpha = 0;
        this.currentThemeName = '';

        this.hexagonClusters = this.generateHexagonClusters();
        this.waveTransition = {
            active: false,
            startTime: 0,
            duration: 1000,
            centerX: 0,
            centerY: 0
        };
        this.gameOverUI = {
            active: false,
            buttonHovered: false
        };
        this.topBar = {
            levelName: LEVEL_THEMES[0].name,
            lives: 5,
            maxLives: 5
        };
        this.levelMenu = {
            active: true,
            buttons: [],
            unlockAnimations: new Map(),
            maxUnlockedLevel: 1
        };

        this.initLevelMenuButtons();
    }

    getResponsiveFontSize(minPx: number = 14, preferredVw: number = 1.5, maxPx: number = 24): number {
        const vw = window.innerWidth / 100;
        const preferred = vw * preferredVw;
        return Math.max(minPx, Math.min(maxPx, preferred));
    }

    private generateHexagonClusters(): HexagonCluster[] {
        const clusters: HexagonCluster[] = [];
        const clusterCount = 12;
        for (let i = 0; i < clusterCount; i++) {
            clusters.push({
                position: {
                    x: Math.random() * this.canvas.width,
                    y: Math.random() * this.canvas.height
                },
                size: 15 + Math.random() * 35,
                rotation: Math.random() * Math.PI * 2,
                opacity: 0.05 + Math.random() * 0.1
            });
        }
        return clusters;
    }

    regenerateHexagonClusters(): void {
        this.hexagonClusters = this.generateHexagonClusters();
    }

    private initLevelMenuButtons(): void {
        const buttons: LevelButtonState[] = [];
        const cols = 3;
        const rows = 3;
        const total = 9;
        const spacing = 20;
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        const buttonSize = Math.min(canvasWidth, canvasHeight) / 5;
        const gridWidth = cols * buttonSize + (cols - 1) * spacing;
        const gridHeight = rows * buttonSize + (rows - 1) * spacing;
        const startX = (canvasWidth - gridWidth) / 2;
        const startY = (canvasHeight - gridHeight) / 2 + 30;

        for (let i = 0; i < total; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            buttons.push({
                id: i + 1,
                unlocked: i + 1 <= this.levelMenu.maxUnlockedLevel,
                isCurrent: false,
                hovered: false,
                position: {
                    x: startX + col * (buttonSize + spacing),
                    y: startY + row * (buttonSize + spacing)
                },
                size: buttonSize
            });
        }
        this.levelMenu.buttons = buttons;
    }

    updateResponsiveScale(): void {
        this.responsiveScale = Math.min(this.canvas.width / 1280, this.canvas.height / 720);
    }

    resize(): void {
        this.updateResponsiveScale();
        this.hexagonClusters = this.generateHexagonClusters();
        this.initLevelMenuButtons();
    }

    showLevelTheme(themeName: string): void {
        this.currentThemeName = themeName;
        this.themeDisplayTime = Date.now();
        this.themeDisplayAlpha = 1;
    }

    startWaveTransition(centerX?: number, centerY?: number): void {
        this.waveTransition.active = true;
        this.waveTransition.startTime = Date.now();
        this.waveTransition.centerX = centerX ?? this.canvas.width / 2;
        this.waveTransition.centerY = centerY ?? this.canvas.height / 2;
    }

    isWaveTransitionComplete(): boolean {
        if (!this.waveTransition.active) return true;
        return Date.now() - this.waveTransition.startTime >= this.waveTransition.duration;
    }

    startUnlockAnimation(levelId: number, centerX: number, centerY: number): void {
        const particles: LockParticle[] = [];
        for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 * i) / 5;
            particles.push({
                position: { x: centerX, y: centerY },
                velocity: {
                    x: Math.cos(angle) * 3,
                    y: Math.sin(angle) * 3
                },
                rotation: 0,
                rotationSpeed: 0.1 + Math.random() * 0.1,
                life: 800,
                maxLife: 800,
                active: true
            });
        }
        this.levelMenu.unlockAnimations.set(levelId, particles);
    }

    handleMenuClick(x: number, y: number): number | null {
        if (!this.levelMenu.active) return null;

        for (const button of this.levelMenu.buttons) {
            const dx = x - (button.position.x + button.size / 2);
            const dy = y - (button.position.y + button.size / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < button.size / 2) {
                if (button.unlocked) {
                    return button.id;
                } else {
                    return -button.id;
                }
            }
        }
        return null;
    }

    handleMenuHover(x: number, y: number): void {
        if (!this.levelMenu.active) return;

        for (const button of this.levelMenu.buttons) {
            const dx = x - (button.position.x + button.size / 2);
            const dy = y - (button.position.y + button.size / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);
            button.hovered = dist < button.size / 2;
        }
    }

    handleGameOverClick(x: number, y: number): boolean {
        if (!this.gameOverUI.active) return false;

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2 + 60;
        const buttonWidth = 180 * this.responsiveScale;
        const buttonHeight = 50 * this.responsiveScale;

        return x >= centerX - buttonWidth / 2 &&
            x <= centerX + buttonWidth / 2 &&
            y >= centerY - buttonHeight / 2 &&
            y <= centerY + buttonHeight / 2;
    }

    handleGameOverHover(x: number, y: number): void {
        if (!this.gameOverUI.active) return;

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2 + 60;
        const buttonWidth = 180 * this.responsiveScale;
        const buttonHeight = 50 * this.responsiveScale;

        this.gameOverUI.buttonHovered = x >= centerX - buttonWidth / 2 &&
            x <= centerX + buttonWidth / 2 &&
            y >= centerY - buttonHeight / 2 &&
            y <= centerY + buttonHeight / 2;
    }

    handleResetClick(x: number, y: number): boolean {
        const barHeight = 70 * this.responsiveScale;
        const buttonRadius = 22 * this.responsiveScale;
        const centerX = this.canvas.width - buttonRadius - 30;
        const centerY = barHeight / 2;
        const dx = x - centerX;
        const dy = y - centerY;
        return Math.sqrt(dx * dx + dy * dy) < buttonRadius;
    }

    update(deltaTime: number): void {
        const elapsed = Date.now() - this.themeDisplayTime;
        if (elapsed > 1500) {
            this.themeDisplayAlpha = Math.max(0, 1 - (elapsed - 1500) / 500);
        }

        for (const [, particles] of this.levelMenu.unlockAnimations) {
            for (const p of particles) {
                if (!p.active) continue;
                p.position.x += p.velocity.x;
                p.position.y += p.velocity.y;
                p.rotation += p.rotationSpeed;
                p.life -= deltaTime;
                if (p.life <= 0) {
                    p.active = false;
                }
            }
        }
    }

    draw(): void {
        this.drawDecorativeHexagons();

        if (this.levelMenu.active) {
            this.drawLevelMenu();
        }

        this.drawWaveTransition();
    }

    drawTopBar(): void {
        const ctx = this.ctx;
        const barHeight = 70 * this.responsiveScale;
        const fontSize = this.getResponsiveFontSize(14, 1.5, 24);

        ctx.save();
        ctx.fillStyle = 'rgba(10, 10, 15, 0.9)';
        ctx.fillRect(0, 0, this.canvas.width, barHeight);

        ctx.strokeStyle = 'rgba(0, 255, 170, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, barHeight);
        ctx.lineTo(this.canvas.width, barHeight);
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${fontSize}px "Segoe UI", sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.topBar.levelName, 30, barHeight / 2);

        this.drawLives(this.canvas.width / 2, barHeight / 2, this.topBar.lives, this.topBar.maxLives);
        this.drawResetButton(this.canvas.width - 50, barHeight / 2);

        ctx.restore();

        if (this.themeDisplayAlpha > 0) {
            this.drawLevelThemeDisplay();
        }
    }

    private drawLives(centerX: number, centerY: number, lives: number, maxLives: number): void {
        const ctx = this.ctx;
        const diamondSize = 12 * this.responsiveScale;
        const spacing = 20 * this.responsiveScale;
        const totalWidth = maxLives * diamondSize + (maxLives - 1) * spacing;
        const startX = centerX - totalWidth / 2 + diamondSize / 2;

        for (let i = 0; i < maxLives; i++) {
            const x = startX + i * (diamondSize + spacing);
            const isActive = i < lives;

            ctx.save();
            ctx.translate(x, centerY);
            ctx.rotate(Math.PI / 4);

            if (isActive) {
                const gradient = ctx.createLinearGradient(-diamondSize / 2, -diamondSize / 2, diamondSize / 2, diamondSize / 2);
                gradient.addColorStop(0, '#00FFAA');
                gradient.addColorStop(1, '#00AABB');
                ctx.fillStyle = gradient;
                ctx.shadowColor = '#00FFAA';
                ctx.shadowBlur = 10;
            } else {
                ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
                ctx.strokeStyle = 'rgba(100, 100, 100, 0.5)';
            }

            ctx.fillRect(-diamondSize / 2, -diamondSize / 2, diamondSize, diamondSize);

            if (!isActive) {
                ctx.lineWidth = 1;
                ctx.strokeRect(-diamondSize / 2, -diamondSize / 2, diamondSize, diamondSize);
            }

            ctx.restore();
        }
    }

    private drawResetButton(centerX: number, centerY: number): void {
        const ctx = this.ctx;
        const radius = 22 * this.responsiveScale;
        const time = Date.now() / 1000;

        ctx.save();
        ctx.translate(centerX, centerY);

        ctx.strokeStyle = '#00FFAA';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00FFAA';
        ctx.shadowBlur = 8;

        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.save();
        ctx.rotate(time);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.6, 0, Math.PI * 1.5);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(radius * 0.6, 0);
        ctx.lineTo(radius * 0.4, -radius * 0.2);
        ctx.lineTo(radius * 0.4, radius * 0.2);
        ctx.closePath();
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.restore();

        ctx.restore();
    }

    private drawLevelThemeDisplay(): void {
        const ctx = this.ctx;
        const fontSize = this.getResponsiveFontSize(24, 3, 48);

        ctx.save();
        ctx.globalAlpha = this.themeDisplayAlpha;
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${fontSize}px "Segoe UI", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#00FFAA';
        ctx.shadowBlur = 20;
        ctx.fillText(this.currentThemeName, this.canvas.width / 2, this.canvas.height / 2);
        ctx.restore();
    }

    drawDecorativeHexagons(): void {
        const ctx = this.ctx;

        for (const cluster of this.hexagonClusters) {
            ctx.save();
            ctx.translate(cluster.position.x, cluster.position.y);
            ctx.rotate(cluster.rotation);
            ctx.globalAlpha = cluster.opacity;
            ctx.strokeStyle = '#1A1A2E';
            ctx.lineWidth = 1;

            for (let i = 0; i < 3; i++) {
                const hexSize = cluster.size * (1 - i * 0.25);
                ctx.beginPath();
                for (let j = 0; j < 6; j++) {
                    const angle = (Math.PI * 2 * j) / 6;
                    const x = Math.cos(angle) * hexSize;
                    const y = Math.sin(angle) * hexSize;
                    if (j === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
                ctx.closePath();
                ctx.stroke();
            }
            ctx.restore();
        }
    }

    private drawLevelMenu(): void {
        const ctx = this.ctx;
        const fontSize = this.getResponsiveFontSize(32, 4, 56);
        const subFontSize = this.getResponsiveFontSize(14, 1.2, 20);

        ctx.save();
        ctx.fillStyle = 'rgba(10, 10, 15, 0.95)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${fontSize}px "Segoe UI", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.shadowColor = '#00FFAA';
        ctx.shadowBlur = 20;
        ctx.fillText('量子迷宫：粒子跃迁', this.canvas.width / 2, 40);

        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = `${subFontSize}px "Segoe UI", sans-serif`;
        ctx.fillText(`已解锁至第 ${this.levelMenu.maxUnlockedLevel} 关`, this.canvas.width / 2, 40 + fontSize + 10);

        for (const button of this.levelMenu.buttons) {
            this.drawLevelButton(button);
        }

        for (const [levelId, particles] of this.levelMenu.unlockAnimations) {
            const button = this.levelMenu.buttons.find(b => b.id === levelId);
            if (button) {
                const centerX = button.position.x + button.size / 2;
                const centerY = button.position.y + button.size / 2;
                for (const p of particles) {
                    if (!p.active) continue;
                    const alpha = p.life / p.maxLife;
                    this.drawSmallHexagon(p.position.x, p.position.y, 8, p.rotation, '#FFD700', alpha);
                }
            }
        }

        ctx.restore();
    }

    private drawLevelButton(button: LevelButtonState): void {
        const ctx = this.ctx;
        const centerX = button.position.x + button.size / 2;
        const centerY = button.position.y + button.size / 2;
        const radius = button.size / 2;
        const fontSize = this.getResponsiveFontSize(20, 2.5, 32);

        ctx.save();
        ctx.translate(centerX, centerY);

        let baseColor: string;
        let glowColor: string;

        if (button.isCurrent) {
            const time = Date.now() / 300;
            const pulse = (Math.sin(time) + 1) / 2;
            baseColor = `rgba(255, 215, 0, ${0.8 + pulse * 0.2})`;
            glowColor = '#FFD700';
        } else if (button.unlocked) {
            baseColor = button.hovered ? 'rgba(255, 215, 0, 0.9)' : 'rgba(255, 215, 0, 0.6)';
            glowColor = '#FFD700';
        } else {
            baseColor = button.hovered ? 'rgba(0, 170, 187, 0.5)' : 'rgba(0, 170, 187, 0.3)';
            glowColor = '#00AABB';
        }

        if (button.hovered || button.isCurrent) {
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = 20;
        }

        ctx.strokeStyle = baseColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.stroke();

        ctx.fillStyle = button.unlocked ? 'rgba(255, 215, 0, 0.1)' : 'rgba(0, 170, 187, 0.1)';
        ctx.fill();

        ctx.shadowBlur = 0;

        if (button.unlocked) {
            ctx.fillStyle = '#FFFFFF';
            ctx.font = `bold ${fontSize}px "Segoe UI", sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(button.id.toString(), 0, 0);
        } else {
            this.drawLockIcon(0, 0, radius * 0.5);
        }

        ctx.restore();
    }

    private drawLockIcon(x: number, y: number, size: number): void {
        const ctx = this.ctx;

        ctx.save();
        ctx.translate(x, y);

        ctx.fillStyle = '#00AABB';
        ctx.shadowColor = '#00AABB';
        ctx.shadowBlur = 10;

        ctx.fillRect(-size * 0.5, -size * 0.1, size, size * 0.7);

        ctx.strokeStyle = '#00AABB';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, -size * 0.1, size * 0.35, Math.PI, 0, false);
        ctx.stroke();

        ctx.fillStyle = '#0A0A0F';
        ctx.beginPath();
        ctx.arc(0, size * 0.25, size * 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-size * 0.04, size * 0.15, size * 0.08, size * 0.25);

        ctx.restore();
    }

    private drawSmallHexagon(x: number, y: number, size: number, rotation: number, color: string, alpha: number): void {
        const ctx = this.ctx;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;

        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 * i) / 6;
            const px = Math.cos(angle) * size;
            const py = Math.sin(angle) * size;
            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    private drawWaveTransition(): void {
        if (!this.waveTransition.active) return;

        const ctx = this.ctx;
        const elapsed = Date.now() - this.waveTransition.startTime;
        const progress = Math.min(1, elapsed / this.waveTransition.duration);

        if (progress >= 1) {
            this.waveTransition.active = false;
            return;
        }

        const maxRadius = Math.sqrt(
            this.canvas.width * this.canvas.width + this.canvas.height * this.canvas.height
        );
        const currentRadius = maxRadius * progress;
        const waveWidth = 100;

        ctx.save();

        ctx.fillStyle = 'rgba(26, 26, 46, 0.8)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.globalCompositeOperation = 'destination-out';
        const gradient = ctx.createRadialGradient(
            this.waveTransition.centerX,
            this.waveTransition.centerY,
            Math.max(0, currentRadius - waveWidth),
            this.waveTransition.centerX,
            this.waveTransition.centerY,
            currentRadius
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.restore();

        ctx.save();
        ctx.strokeStyle = `rgba(255, 255, 255, ${1 - progress})`;
        ctx.lineWidth = 3;
        ctx.shadowColor = '#FFFFFF';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(this.waveTransition.centerX, this.waveTransition.centerY, currentRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    drawGameOver(): void {
        if (!this.gameOverUI.active) return;

        const ctx = this.ctx;
        const titleFontSize = this.getResponsiveFontSize(36, 5, 72);
        const buttonFontSize = this.getResponsiveFontSize(18, 2, 28);
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const buttonWidth = 180 * this.responsiveScale;
        const buttonHeight = 50 * this.responsiveScale;

        ctx.save();

        ctx.fillStyle = 'rgba(10, 10, 15, 0.85)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${titleFontSize}px "Segoe UI", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#00FFAA';
        ctx.shadowBlur = 30;
        ctx.fillText('粒子消散', centerX, centerY - 50);

        const time = Date.now() / 500;
        const pulse = (Math.sin(time) + 1) / 2;
        const buttonAlpha = this.gameOverUI.buttonHovered ? 1 : 0.6 + pulse * 0.4;

        ctx.globalAlpha = buttonAlpha;
        const buttonGradient = ctx.createLinearGradient(
            centerX - buttonWidth / 2,
            centerY + 60 - buttonHeight / 2,
            centerX + buttonWidth / 2,
            centerY + 60 + buttonHeight / 2
        );
        buttonGradient.addColorStop(0, '#00FFAA');
        buttonGradient.addColorStop(1, '#00AABB');

        ctx.fillStyle = buttonGradient;
        ctx.shadowColor = '#00FFAA';
        ctx.shadowBlur = 20;

        this.drawRoundedRect(
            centerX - buttonWidth / 2,
            centerY + 60 - buttonHeight / 2,
            buttonWidth,
            buttonHeight,
            10
        );
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#0A0A0F';
        ctx.font = `bold ${buttonFontSize}px "Segoe UI", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('重新开始', centerX, centerY + 60);

        ctx.restore();
    }

    private drawRoundedRect(x: number, y: number, width: number, height: number, radius: number): void {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    updateTopBar(levelName: string, lives: number): void {
        this.topBar.levelName = levelName;
        this.topBar.lives = lives;
    }

    setLevelMenuActive(active: boolean): void {
        this.levelMenu.active = active;
    }

    setGameOverActive(active: boolean): void {
        this.gameOverUI.active = active;
        this.gameOverUI.buttonHovered = false;
    }

    unlockLevel(levelId: number): void {
        const button = this.levelMenu.buttons.find(b => b.id === levelId);
        if (button) {
            button.unlocked = true;
        }
        if (levelId > this.levelMenu.maxUnlockedLevel) {
            this.levelMenu.maxUnlockedLevel = levelId;
        }
    }

    setCurrentLevel(levelId: number): void {
        for (const button of this.levelMenu.buttons) {
            button.isCurrent = button.id === levelId;
        }
    }
}

export function drawReceiver(ctx: CanvasRenderingContext2D, position: PixelPos, unlocked: boolean): void {
    const time = Date.now() / 1000;
    const pulse = (Math.sin(time * 2) + 1) / 2;
    const baseRadius = 18;
    const radius = baseRadius + pulse * 4;

    ctx.save();
    ctx.translate(position.x, position.y);

    const outerColor = unlocked ? '#FFD700' : '#9B59B6';
    const innerColor = unlocked ? '#FFD700' : '#BB88FF';

    const gradient = ctx.createRadialGradient(0, 0, 5, 0, 0, 40);
    gradient.addColorStop(0, unlocked ? 'rgba(255, 215, 0, 0.6)' : 'rgba(155, 89, 182, 0.6)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, 40, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = outerColor;
    ctx.lineWidth = 2;
    ctx.shadowColor = outerColor;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = innerColor;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.6, 0, Math.PI * 2);
    ctx.fill();

    if (unlocked) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.3, time, time + Math.PI);
        ctx.stroke();
    }

    ctx.restore();
}

export function drawObstacle(
    ctx: CanvasRenderingContext2D,
    position: PixelPos,
    type: 'stone' | 'energy' | 'moving',
    size: number
): void {
    ctx.save();
    ctx.translate(position.x, position.y);

    if (type === 'stone') {
        ctx.fillStyle = '#4A4A5A';
        ctx.strokeStyle = '#6A6A7A';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-size / 2, size / 4);
        ctx.lineTo(-size / 3, -size / 3);
        ctx.lineTo(size / 4, -size / 2);
        ctx.lineTo(size / 2, size / 5);
        ctx.lineTo(size / 3, size / 2);
        ctx.lineTo(-size / 4, size / 3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    } else if (type === 'energy') {
        const time = Date.now() / 500;
        const glow = (Math.sin(time) + 1) / 2;
        ctx.fillStyle = `rgba(255, 100, 100, ${0.7 + glow * 0.3})`;
        ctx.shadowColor = '#FF6464';
        ctx.shadowBlur = 15 + glow * 10;
        ctx.fillRect(-size / 2, -size / 6, size, size / 3);
    } else if (type === 'moving') {
        ctx.fillStyle = '#FF88DD';
        ctx.shadowColor = '#FF88DD';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
            const x = Math.cos(angle) * size / 2;
            const y = Math.sin(angle) * size / 2;
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
    }

    ctx.restore();
}
