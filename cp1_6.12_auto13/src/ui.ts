const SUBJECTS = [
  'YOU',
  'YOUR JOURNEY',
  'YOUR SPIRIT',
  'YOUR DREAM',
  'YOUR POTENTIAL',
  'YOUR COURAGE',
  'YOUR FUTURE',
  'THE CITY',
  'THE NIGHT',
  'EVERY STEP',
  'EVERY JUMP',
];

const VERBS = [
  'NEVER STOPS',
  'KEEPS GOING',
  'BREAKS BOUNDARIES',
  'SHINES BRIGHT',
  'DEFIES LIMITS',
  'UNLEASHES POWER',
  'PUSHES FORWARD',
  'RISES ABOVE',
  'TRANSCENDS FEAR',
  'IGNITES THE DARKNESS',
  'OVERCOMES ALL',
  'IS INFINITE',
  'KNOWS NO LIMITS',
  'IS UNSTOPPABLE',
  'REACHES NEW HEIGHTS',
];

const OBJECTS = [
  'THE SKY',
  'THE CYBER WORLD',
  'YOUR GOALS',
  'THE NEON LIGHTS',
  'THE SHADOWS',
  'YOUR FEARS',
  'ALL OBSTACLES',
  'THE DISTANCE',
  'THE HORIZON',
  'YOUR PAST',
  'THE RAIN',
  'THE STORM',
  'EXPECTATIONS',
];

const ENDINGS = [
  'KEEP RUNNING!',
  'NEVER GIVE UP!',
  'STAY DETERMINED!',
  'FORWARD IS THE ONLY WAY!',
  'THE NIGHT IS YOUNG!',
  'JUMP HIGHER!',
  'RUN FASTER!',
  'DREAM BIGGER!',
  'YOU GOT THIS!',
  'ONE MORE STEP!',
  'DON\'T LOOK BACK!',
  'FOCUS ON THE GOAL!',
  'PAIN IS TEMPORARY!',
  'GLORY IS ETERNAL!',
  'CHAMPIONS NEVER QUIT!',
  'RISE AGAIN!',
  'BE THE LEGEND!',
];

const CLASSIC_PHRASES = [
  'EVERY JUMP IS A STEP FORWARD!',
  'THE ONLY LIMIT IS YOUR MIND!',
  'KEEP RUNNING, KEEP DREAMING!',
  'FALL SEVEN TIMES, STAND UP EIGHT!',
  'YOUR POTENTIAL IS INFINITE!',
  'NEVER GIVE UP, NEVER BACK DOWN!',
  'PAIN IS TEMPORARY, GLORY IS FOREVER!',
  'THE CITY AWAITS YOUR NEXT MOVE!',
  'YOU ARE FASTER THAN YOU THINK!',
  'DREAM BIG, JUMP HIGHER!',
  'MISTAKES ARE JUST LESSONS!',
  'EVERY END IS A NEW BEGINNING!',
  'PUSH YOUR LIMITS, BREAK BOUNDARIES!',
  'RUN LIKE THE WORLD DEPENDS ON IT!',
  'YOUR JOURNEY HAS ONLY JUST BEGUN!',
  'BE FEARLESS IN THE PURSUIT OF GREATNESS!',
  'SMALL STEPS LEAD TO GIANT LEAPS!',
  'THE FUTURE BELONGS TO THE BRAVE!',
  'YOU ARE YOUR ONLY COMPETITION!',
  'TODAY IS YOUR DAY TO SHINE!',
  'IN THE DARKNESS, WE FIND OUR LIGHT!',
  'THE NEON LIGHTS GUIDE YOUR PATH!',
  'RUN THROUGH THE STORM, EMERGE STRONGER!',
  'EVERY FALL TEACHES YOU TO FLY!',
];

export type ButtonCallback = () => void;

export class UIManager {
  private canvasWidth: number;
  private canvasHeight: number;
  private highScore: number = 0;
  private currentScore: number = 0;
  private isGameOver: boolean = false;
  private motivationalPhrase: string = '';
  private restartButtonRect: { x: number; y: number; width: number; height: number } | null = null;
  private onRestartCallback: ButtonCallback | null = null;
  private isStarted: boolean = false;
  private phraseSeed: number = 0;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.loadHighScore();
    this.updatePhraseSeed();
  }

  resize(canvasWidth: number, canvasHeight: number): void {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.restartButtonRect = null;
  }

  private loadHighScore(): void {
    try {
      const saved = localStorage.getItem('cyberpunk_runner_highscore');
      if (saved) {
        this.highScore = parseInt(saved, 10);
      }
    } catch {
      this.highScore = 0;
    }
  }

  saveHighScore(score: number): void {
    if (score > this.highScore) {
      this.highScore = score;
      try {
        localStorage.setItem('cyberpunk_runner_highscore', this.highScore.toString());
      } catch {
      }
    }
  }

  setScore(score: number): void {
    this.currentScore = score;
  }

  setGameOver(isOver: boolean, finalScore: number): void {
    this.isGameOver = isOver;
    if (isOver) {
      this.saveHighScore(finalScore);
      this.updatePhraseSeed();
      this.motivationalPhrase = this.generatePhrase();
    } else {
      this.motivationalPhrase = '';
    }
    this.restartButtonRect = null;
  }

  setStarted(started: boolean): void {
    this.isStarted = started;
  }

  setRestartCallback(callback: ButtonCallback): void {
    this.onRestartCallback = callback;
  }

  private updatePhraseSeed(): void {
    this.phraseSeed = Math.floor(Math.random() * 1000000);
  }

  private seededRandom(seed: number): number {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  private pick<T>(arr: T[], index: number): T {
    return arr[index % arr.length];
  }

  private generatePhrase(): string {
    const useCombinatorial = this.seededRandom(this.phraseSeed) > 0.4;

    if (useCombinatorial) {
      const s1 = this.seededRandom(this.phraseSeed + 1);
      const s2 = this.seededRandom(this.phraseSeed + 2);
      const s3 = this.seededRandom(this.phraseSeed + 3);
      const s4 = this.seededRandom(this.phraseSeed + 4);

      const hasObject = s1 > 0.3;
      const hasEnding = s2 > 0.2;

      const subject = this.pick(SUBJECTS, Math.floor(s1 * SUBJECTS.length));
      const verb = this.pick(VERBS, Math.floor(s2 * VERBS.length));
      const object = hasObject ? this.pick(OBJECTS, Math.floor(s3 * OBJECTS.length)) : null;
      const ending = hasEnding ? this.pick(ENDINGS, Math.floor(s4 * ENDINGS.length)) : null;

      let parts: string[] = [];
      parts.push(`${subject} ${verb}`);
      if (object) parts.push(object);
      if (ending) parts.push(ending);

      return parts.join(' ');
    } else {
      const idx = Math.floor(this.seededRandom(this.phraseSeed) * CLASSIC_PHRASES.length);
      return CLASSIC_PHRASES[idx];
    }
  }

  handleClick(x: number, y: number): boolean {
    if (this.isGameOver && this.restartButtonRect && this.onRestartCallback) {
      const r = this.restartButtonRect;
      if (x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height) {
        this.onRestartCallback();
        return true;
      }
    }
    return false;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.isStarted && !this.isGameOver) {
      return;
    }

    this.renderScorePanel(ctx);

    if (this.isGameOver) {
      this.renderGameOverPanel(ctx);
    }
  }

  private renderScorePanel(ctx: CanvasRenderingContext2D): void {
    const panelX = 20;
    const panelY = 20;
    const panelW = 220;
    const panelH = 90;

    ctx.save();
    ctx.fillStyle = 'rgba(26, 10, 46, 0.6)';
    ctx.shadowColor = '#00fff7';
    ctx.shadowBlur = 10;
    this.roundRect(ctx, panelX, panelY, panelW, panelH, 10);
    ctx.fill();

    ctx.strokeStyle = '#00fff7';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 15;
    this.roundRect(ctx, panelX, panelY, panelW, panelH, 10);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.textBaseline = 'top';

    ctx.fillStyle = '#00fff7';
    ctx.shadowColor = '#00fff7';
    ctx.shadowBlur = 8;
    ctx.fillText('SCORE', panelX + 16, panelY + 14);

    ctx.font = '16px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00fff7';
    ctx.shadowBlur = 12;
    ctx.fillText(this.currentScore.toString().padStart(6, '0'), panelX + 16, panelY + 34);

    ctx.font = '9px "Press Start 2P", monospace';
    ctx.fillStyle = '#ff00ff';
    ctx.shadowColor = '#ff00ff';
    ctx.shadowBlur = 8;
    ctx.fillText('HIGH SCORE', panelX + 16, panelY + 60);

    ctx.font = '12px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ff00ff';
    ctx.shadowBlur = 10;
    ctx.fillText(this.highScore.toString().padStart(6, '0'), panelX + 16, panelY + 75);

    ctx.restore();
  }

  private renderGameOverPanel(ctx: CanvasRenderingContext2D): void {
    const panelW = Math.min(420, this.canvasWidth - 60);
    const panelH = 340;
    const panelX = (this.canvasWidth - panelW) / 2;
    const panelY = (this.canvasHeight - panelH) / 2;

    ctx.save();
    ctx.fillStyle = 'rgba(10, 0, 21, 0.85)';
    ctx.shadowColor = '#ff00ff';
    ctx.shadowBlur = 30;
    this.roundRect(ctx, panelX, panelY, panelW, panelH, 16);
    ctx.fill();

    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 40;
    this.roundRect(ctx, panelX, panelY, panelW, panelH, 16);
    ctx.stroke();

    ctx.strokeStyle = '#00fff7';
    ctx.lineWidth = 1;
    ctx.shadowBlur = 20;
    this.roundRect(ctx, panelX + 4, panelY + 4, panelW - 8, panelH - 8, 12);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    ctx.font = '20px "Press Start 2P", monospace';
    ctx.fillStyle = '#ff00ff';
    ctx.shadowColor = '#ff00ff';
    ctx.shadowBlur = 20;
    ctx.fillText('GAME OVER', panelX + panelW / 2, panelY + 30);

    ctx.font = '9px "Press Start 2P", monospace';
    ctx.fillStyle = '#00fff7';
    ctx.shadowColor = '#00fff7';
    ctx.shadowBlur = 10;
    ctx.fillText('YOUR SCORE', panelX + panelW / 2, panelY + 80);

    ctx.font = '24px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00fff7';
    ctx.shadowBlur = 25;
    ctx.fillText(this.currentScore.toString(), panelX + panelW / 2, panelY + 105);

    ctx.font = '9px "Press Start 2P", monospace';
    ctx.fillStyle = '#ff00ff';
    ctx.shadowColor = '#ff00ff';
    ctx.shadowBlur = 10;
    ctx.fillText('HIGH SCORE', panelX + panelW / 2, panelY + 150);

    ctx.font = '18px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffaa00';
    ctx.shadowColor = '#ffaa00';
    ctx.shadowBlur = 20;
    ctx.fillText(this.highScore.toString(), panelX + panelW / 2, panelY + 170);

    const phraseY = panelY + 210;
    const phraseMaxWidth = panelW - 40;
    this.wrapText(
      ctx,
      this.motivationalPhrase,
      panelX + panelW / 2,
      phraseY,
      phraseMaxWidth,
      18
    );

    const btnW = 200;
    const btnH = 50;
    const btnX = panelX + (panelW - btnW) / 2;
    const btnY = panelY + panelH - 70;
    this.restartButtonRect = { x: btnX, y: btnY, width: btnW, height: btnH };

    ctx.save();
    ctx.fillStyle = 'rgba(0, 255, 247, 0.15)';
    ctx.shadowColor = '#00fff7';
    ctx.shadowBlur = 25;
    this.roundRect(ctx, btnX, btnY, btnW, btnH, 8);
    ctx.fill();

    ctx.strokeStyle = '#00fff7';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 30;
    this.roundRect(ctx, btnX, btnY, btnW, btnH, 8);
    ctx.stroke();

    ctx.font = '12px "Press Start 2P", monospace';
    ctx.fillStyle = '#00fff7';
    ctx.shadowColor = '#00fff7';
    ctx.shadowBlur = 15;
    ctx.fillText('RESTART', btnX + btnW / 2, btnY + 18);
    ctx.restore();

    ctx.restore();
  }

  private wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ): void {
    const words = text.split(' ');
    let line = '';
    let lineCount = 0;
    const testSize = '8px "Press Start 2P", monospace';
    ctx.font = testSize;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, y + lineCount * lineHeight);
        line = words[n] + ' ';
        lineCount++;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y + lineCount * lineHeight);
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  getHighScore(): number {
    return this.highScore;
  }
}
