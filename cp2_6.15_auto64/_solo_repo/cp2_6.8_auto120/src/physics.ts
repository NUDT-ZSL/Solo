export interface Vector2 {
  x: number;
  y: number;
}

export interface Planet {
  id: string;
  position: Vector2;
  mass: number;
  radius: number;
  color: string;
  isDragging: boolean;
  highlightAlpha: number;
}

export interface Ship {
  position: Vector2;
  velocity: Vector2;
  isFlying: boolean;
  trail: Vector2[];
}

export interface HUDData {
  speed: number;
  nearestPlanetDistance: number | null;
  angularMomentum: number;
}

const SHIP_MASS = 1;
const MAX_TRAIL_LENGTH = 100;

export class PhysicsEngine {
  public update(ship: Ship, planets: Planet[], G: number): HUDData {
    if (!ship.isFlying) {
      return {
        speed: 0,
        nearestPlanetDistance: null,
        angularMomentum: 0
      };
    }

    const acceleration: Vector2 = { x: 0, y: 0 };
    let nearestPlanet: Planet | null = null;
    let nearestDistance = Infinity;

    for (const planet of planets) {
      const dx = planet.position.x - ship.position.x;
      const dy = planet.position.y - ship.position.y;
      const distSq = dx * dx + dy * dy;
      const distance = Math.sqrt(distSq);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestPlanet = planet;
      }

      if (distSq < 1) continue;

      const force = (G * planet.mass) / distSq;
      acceleration.x += (dx / distance) * force;
      acceleration.y += (dy / distance) * force;
    }

    ship.velocity.x += acceleration.x;
    ship.velocity.y += acceleration.y;
    ship.position.x += ship.velocity.x;
    ship.position.y += ship.velocity.y;

    ship.trail.push({ x: ship.position.x, y: ship.position.y });
    if (ship.trail.length > MAX_TRAIL_LENGTH) {
      ship.trail.shift();
    }

    const speed = Math.sqrt(ship.velocity.x ** 2 + ship.velocity.y ** 2);

    let angularMomentum = 0;
    if (nearestPlanet) {
      const rpx = ship.position.x - nearestPlanet.position.x;
      const rpy = ship.position.y - nearestPlanet.position.y;
      angularMomentum = SHIP_MASS * speed * Math.sqrt(rpx * rpx + rpy * rpy);
    }

    return {
      speed,
      nearestPlanetDistance: nearestDistance === Infinity ? null : nearestDistance,
      angularMomentum
    };
  }

  public checkPlanetHit(ship: Ship, planets: Planet[]): boolean {
    for (const planet of planets) {
      const dx = planet.position.x - ship.position.x;
      const dy = planet.position.y - ship.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < planet.radius) {
        return true;
      }
    }
    return false;
  }

  public isShipOutOfBounds(ship: Ship, width: number, height: number): boolean {
    const margin = 200;
    return (
      ship.position.x < -margin ||
      ship.position.x > width + margin ||
      ship.position.y < -margin ||
      ship.position.y > height + margin
    );
  }
}
