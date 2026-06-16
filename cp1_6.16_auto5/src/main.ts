import { SolarSystem, Planet } from './solarSystem';
import { Renderer } from './renderer';
import { UIManager, UIEventCallbacks } from './ui';

class App {
  private container: HTMLElement;
  private solarSystem: SolarSystem;
  private renderer: Renderer;
  private ui: UIManager;
  private animationId: number | null = null;
  private startTime: number = 0;
  private selectedPlanet: Planet | null = null;
  private startDate: Date;

  constructor() {
    this.container = document.getElementById('app')!;
    this.startDate = new Date();

    this.solarSystem = new SolarSystem();
    this.renderer = new Renderer(this.container);

    const callbacks: UIEventCallbacks = {
      onSpeedChange: this.onSpeedChange.bind(this),
      onPlanetSelect: this.onPlanetSelect.bind(this),
      onConstellationToggle: this.onConstellationToggle.bind(this),
      onTrackPlanet: this.onTrackPlanet.bind(this),
      onClearTrajectory: this.onClearTrajectory.bind(this),
      onClosePanel: this.onClosePanel.bind(this)
    };

    this.ui = new UIManager(this.container, callbacks);

    this.bindEvents();
    this.start();
  }

  private bindEvents(): void {
    const canvas = this.renderer.getDomElement();

    canvas.addEventListener('click', (e) => {
      const planetId = this.renderer.getPlanetIdFromMouseEvent(e);
      if (planetId) {
        this.selectPlanet(planetId);
      } else {
        this.deselectPlanet();
      }
    });

    canvas.addEventListener('mousemove', (e) => {
      const planetId = this.renderer.getPlanetIdFromMouseEvent(e);
      this.renderer.setHoveredPlanet(planetId);

      if (planetId) {
        canvas.style.cursor = 'pointer';
      } else {
        canvas.style.cursor = 'grab';
      }
    });

    canvas.addEventListener('mousedown', () => {
      canvas.style.cursor = 'grabbing';
    });

    canvas.addEventListener('mouseup', () => {
      canvas.style.cursor = 'grab';
    });

    canvas.addEventListener('mouseleave', () => {
      this.renderer.setHoveredPlanet(null);
      canvas.style.cursor = 'default';
    });

    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const isUIElement = target.closest('#app > div:not(canvas)') !== null;
      const isCanvas = target.tagName === 'CANVAS';

      if (!isUIElement && !isCanvas) {
        this.deselectPlanet();
      }
    });
  }

  private selectPlanet(planetId: string): void {
    const planet = this.solarSystem.getPlanetById(planetId);
    if (planet) {
      this.selectedPlanet = planet;
      this.renderer.setSelectedPlanet(planetId);
      this.ui.setSelectedPlanet(planetId);

      const info = planet.getInfo();
      const color = planet.getData().color;
      this.ui.showInfoPanel(info, color);
    }
  }

  private deselectPlanet(): void {
    this.selectedPlanet = null;
    this.renderer.setSelectedPlanet(null);
    this.ui.setSelectedPlanet(null);
    this.ui.hideInfoPanel();
  }

  private onSpeedChange(speed: number): void {
    this.solarSystem.setSpeedMultiplier(speed);
  }

  private onPlanetSelect(planetId: string | null): void {
    if (planetId) {
      this.selectPlanet(planetId);
    } else {
      this.deselectPlanet();
    }
  }

  private onConstellationToggle(_visible: boolean): void {
    const isVisible = this.renderer.toggleConstellations();
    this.ui.setConstellationsVisible(isVisible);
  }

  private onTrackPlanet(): void {
    if (this.selectedPlanet) {
      const planetId = this.selectedPlanet.getData().id;
      const isTracking = this.solarSystem.getTrackedPlanetId() === planetId;

      if (isTracking) {
        this.solarSystem.stopTracking();
        this.ui.setTrackingActive(false);
      } else {
        this.solarSystem.startTracking(planetId);
        this.ui.setTrackingActive(true);
      }
    }
  }

  private onClearTrajectory(): void {
    this.solarSystem.clearTrajectory();
  }

  private onClosePanel(): void {
    this.deselectPlanet();
  }

  private start(): void {
    this.startTime = performance.now();
    this.animate();
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));

    const currentTime = performance.now();
    const elapsed = (currentTime - this.startTime) / 1000;

    this.solarSystem.update(elapsed);

    const planetStates = this.solarSystem.getPlanetStates();
    this.renderer.render(planetStates, elapsed);

    const trackedPlanetId = this.solarSystem.getTrackedPlanetId();
    if (trackedPlanetId) {
      const trajectory = this.solarSystem.getTrajectory(trackedPlanetId);
      this.renderer.updateTrajectory(trackedPlanetId, trajectory);
    } else {
      this.solarSystem.getPlanets().forEach(planet => {
        const id = planet.getData().id;
        const traj = this.solarSystem.getTrajectory(id);
        if (traj.length === 0) {
          this.renderer.updateTrajectory(id, []);
        }
      });
    }

    const simulatedDate = this.solarSystem.getSimulatedDate(this.startDate);
    this.ui.updateDateTime(simulatedDate);
  }

  public dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.renderer.dispose();
    this.ui.dispose();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
