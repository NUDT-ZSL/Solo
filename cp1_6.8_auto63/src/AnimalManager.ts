import { AnimalData, AnimalType, Season, TreeData, ANIMAL_COLORS, TREE_ANIMAL_AFFINITY } from './types';
import { TreeSystem } from './TreeSystem';

export class AnimalManager {
  animals: AnimalData[] = [];
  private nextId = 0;

  spawnAnimal(type: AnimalType, x: number, y: number): AnimalData {
    const speed = type === 'butterfly' ? 40 : type === 'bird' ? 55 : 25;
    const animal: AnimalData = {
      id: this.nextId++,
      type,
      x,
      y,
      targetX: x,
      targetY: y,
      speed,
      animPhase: Math.random() * Math.PI * 2,
      animSpeed: type === 'butterfly' ? 8 : type === 'bird' ? 5 : 3,
      targetTreeId: null,
      idle: false,
      idleTimer: 0,
      direction: Math.random() > 0.5 ? 1 : -1,
    };
    this.animals.push(animal);
    return animal;
  }

  removeAnimal(id: number) {
    this.animals = this.animals.filter(a => a.id !== id);
  }

  clear() {
    this.animals = [];
    this.nextId = 0;
  }

  trySpawnForTree(tree: TreeData, treeSystem: TreeSystem): AnimalData | null {
    const affinity = TREE_ANIMAL_AFFINITY[tree.type];
    const sameTypeCount = this.animals.filter(a => a.type === affinity).length;
    const treeCount = treeSystem.trees.length;
    const maxAnimals = Math.floor(treeCount * 0.6) + 1;

    if (sameTypeCount >= maxAnimals) return null;

    const offsetX = (Math.random() - 0.5) * 60;
    const offsetY = -10 - Math.random() * 20;
    return this.spawnAnimal(affinity, tree.x + offsetX, tree.y + offsetY);
  }

  update(dt: number, treeSystem: TreeSystem, canvasW: number, canvasH: number) {
    for (const animal of this.animals) {
      animal.animPhase += animal.animSpeed * dt;

      if (animal.idle) {
        animal.idleTimer -= dt;
        if (animal.idleTimer <= 0) {
          animal.idle = false;
          this.pickNewTarget(animal, treeSystem, canvasW, canvasH);
        }
        continue;
      }

      const dx = animal.targetX - animal.x;
      const dy = animal.targetY - animal.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 5) {
        animal.idle = true;
        animal.idleTimer = 1 + Math.random() * 3;
        continue;
      }

      const moveSpeed = animal.speed * dt;
      const nx = dx / dist;
      const ny = dy / dist;
      animal.x += nx * moveSpeed;
      animal.y += ny * moveSpeed;
      animal.direction = dx > 0 ? 1 : -1;
    }
  }

  private pickNewTarget(animal: AnimalData, treeSystem: TreeSystem, canvasW: number, canvasH: number) {
    const groundY = canvasH * 0.85;

    if (treeSystem.trees.length > 0 && Math.random() > 0.3) {
      const tree = treeSystem.trees[Math.floor(Math.random() * treeSystem.trees.length)];
      animal.targetTreeId = tree.id;
      animal.targetX = tree.x + (Math.random() - 0.5) * 40;
      animal.targetY = tree.y - tree.maxHeight * tree.growth * 0.3 + (Math.random() - 0.5) * 20;
    } else {
      animal.targetX = 50 + Math.random() * (canvasW - 100);
      animal.targetY = groundY - 20 - Math.random() * 100;
    }
  }

  draw(ctx: CanvasRenderingContext2D, time: number) {
    for (const animal of this.animals) {
      ctx.save();
      ctx.translate(animal.x, animal.y);
      ctx.scale(animal.direction, 1);

      switch (animal.type) {
        case 'squirrel': this.drawSquirrel(ctx, animal, time); break;
        case 'butterfly': this.drawButterfly(ctx, animal, time); break;
        case 'bird': this.drawBird(ctx, animal, time); break;
      }

      ctx.restore();
    }
  }

  private drawSquirrel(ctx: CanvasRenderingContext2D, animal: AnimalData, time: number) {
    const colors = ANIMAL_COLORS.squirrel;
    const hop = animal.idle ? 0 : Math.abs(Math.sin(animal.animPhase)) * 5;
    const tailWag = Math.sin(animal.animPhase * 0.5) * 0.2;

    ctx.save();
    ctx.translate(0, -hop);

    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = colors.body;
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(6, -2, 4, 3, 0, 0, Math.PI * 2);
    ctx.fillStyle = colors.body;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(9, -3, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = colors.body;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(10, -4, 0.8, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a1a';
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(-7, -2 + Math.sin(tailWag) * 3, 5, 8, tailWag - 0.5, 0, Math.PI * 2);
    ctx.fillStyle = colors.accent;
    ctx.fill();

    ctx.restore();
  }

  private drawButterfly(ctx: CanvasRenderingContext2D, animal: AnimalData, time: number) {
    const colors = ANIMAL_COLORS.butterfly;
    const wingFlap = Math.sin(animal.animPhase) * 0.6;
    const hover = Math.sin(time * 0.003 + animal.animPhase) * 3;

    ctx.save();
    ctx.translate(0, hover);

    ctx.save();
    ctx.scale(1, Math.cos(wingFlap));
    ctx.beginPath();
    ctx.ellipse(-5, -2, 6, 4, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = colors.body;
    ctx.globalAlpha = 0.8;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.scale(1, Math.cos(wingFlap));
    ctx.beginPath();
    ctx.ellipse(5, -2, 6, 4, 0.3, 0, Math.PI * 2);
    ctx.fillStyle = colors.accent;
    ctx.globalAlpha = 0.8;
    ctx.fill();
    ctx.restore();

    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, 1.5, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#4A148C';
    ctx.fill();

    ctx.restore();
  }

  private drawBird(ctx: CanvasRenderingContext2D, animal: AnimalData, time: number) {
    const colors = ANIMAL_COLORS.bird;
    const wingFlap = Math.sin(animal.animPhase) * 25;
    const bob = Math.sin(time * 0.004 + animal.animPhase) * 2;

    ctx.save();
    ctx.translate(0, bob);

    ctx.beginPath();
    ctx.ellipse(0, 0, 7, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = colors.body;
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(5, -1, 4, 3, -0.2, 0, Math.PI * 2);
    ctx.fillStyle = colors.body;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(9, -1);
    ctx.lineTo(14, 0);
    ctx.lineTo(9, 1);
    ctx.closePath();
    ctx.fillStyle = '#FF8F00';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(7, -2, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a1a';
    ctx.fill();

    ctx.save();
    ctx.translate(-5, -3);
    ctx.rotate((-30 + wingFlap) * Math.PI / 180);
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 3, 0, 0, Math.PI * 2);
    ctx.fillStyle = colors.accent;
    ctx.globalAlpha = 0.7;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(5, -3);
    ctx.rotate((30 - wingFlap) * Math.PI / 180);
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 3, 0, 0, Math.PI * 2);
    ctx.fillStyle = colors.accent;
    ctx.globalAlpha = 0.7;
    ctx.fill();
    ctx.restore();

    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
