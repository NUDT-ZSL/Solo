import Phaser from 'phaser';

const COLORS = [0x7ED957, 0x6BCB4B, 0x8FE86B, 0x5DB846];

export class Island extends Phaser.GameObjects.Container {
  private platform: Phaser.GameObjects.Graphics;
  private grassTufts: Phaser.GameObjects.Graphics;
  public islandWidth: number;
  public islandHeight: number;
  public bodyRef: Phaser.Physics.Arcade.StaticBody | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, width?: number) {
    super(scene, x, y);
    this.islandWidth = width || Phaser.Math.Between(80, 200);
    this.islandHeight = 24;

    this.platform = new Phaser.GameObjects.Graphics(scene);
    this.grassTufts = new Phaser.GameObjects.Graphics(scene);

    this.add(this.platform);
    this.add(this.grassTufts);

    this.drawIsland();
    scene.add.existing(this);
  }

  private drawIsland(): void {
    const w = this.islandWidth;
    const h = this.islandHeight;
    const r = h / 2;
    const color = Phaser.Utils.Array.GetRandom(COLORS);

    this.platform.fillStyle(color, 1);
    this.platform.fillRoundedRect(-w / 2, -h / 2, w, h, { tl: r, tr: r, bl: 4, br: 4 });

    this.platform.fillStyle(Phaser.Display.Color.IntegerToColor(color).brighten(15).color, 0.5);
    this.platform.fillRoundedRect(-w / 2 + 4, -h / 2 + 2, w - 8, h / 2 - 2, { tl: r - 2, tr: r - 2, bl: 2, br: 2 });

    this.grassTufts.fillStyle(0x9EF57A, 1);
    const tuftCount = Math.floor(w / 20);
    for (let i = 0; i < tuftCount; i++) {
      const tx = -w / 2 + 10 + (i * (w - 20)) / tuftCount + Phaser.Math.Between(-3, 3);
      const th = Phaser.Math.Between(4, 8);
      this.grassTufts.fillTriangle(tx - 3, -h / 2, tx, -h / 2 - th, tx + 3, -h / 2);
    }
  }

  enablePhysics(scene: Phaser.Scene): Phaser.Physics.Arcade.StaticBody {
    if (this.bodyRef) return this.bodyRef;

    const body = new Phaser.Physics.Arcade.StaticBody(scene.physics.world, this as unknown as Phaser.GameObjects.GameObject);
    body.setSize(this.islandWidth, this.islandHeight);
    body.setOffset(-this.islandWidth / 2, -this.islandHeight / 2);
    body.updateFromGameObject();
    this.bodyRef = body;
    (this as unknown as Phaser.GameObjects.GameObject).body = body;
    scene.physics.add.existing(this as unknown as Phaser.GameObjects.GameObject, true);
    return body;
  }

  disablePhysics(): void {
    if (this.bodyRef) {
      this.bodyRef.destroy();
      this.bodyRef = null;
    }
  }

  reset(x: number, y: number, width?: number): void {
    this.islandWidth = width || Phaser.Math.Between(80, 200);
    this.setPosition(x, y);
    this.platform.clear();
    this.grassTufts.clear();
    this.drawIsland();
    this.setActive(true);
    this.setVisible(true);
    if (this.bodyRef) {
      this.bodyRef.setSize(this.islandWidth, this.islandHeight);
      this.bodyRef.setOffset(-this.islandWidth / 2, -this.islandHeight / 2);
      this.bodyRef.updateFromGameObject();
    }
  }
}
