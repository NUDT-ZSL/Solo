import * as THREE from 'three';

export interface SunPosition {
  azimuth: number;
  altitude: number;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  timezone: number;
}

const DEFAULT_LOCATION: GeoLocation = {
  latitude: 39.9,
  longitude: 116.4,
  timezone: 8,
};

export class SunSimulator {
  public light: THREE.DirectionalLight;
  public helper: THREE.DirectionalLightHelper;

  private targetPosition: THREE.Vector3 = new THREE.Vector3();
  private currentPosition: THREE.Vector3 = new THREE.Vector3();
  private targetIntensity: number = 1;
  private currentIntensity: number = 1;

  private location: GeoLocation;
  private currentDayOfYear: number = 172;
  private currentHour: number = 12;

  private readonly sunDistance: number = 200;
  private readonly maxIntensity: number = 1.5;
  private readonly minIntensity: number = 0.1;

  constructor(scene: THREE.Scene, location?: GeoLocation) {
    this.location = { ...DEFAULT_LOCATION, ...location };

    this.light = new THREE.DirectionalLight(0xffffff, this.currentIntensity);
    this.light.castShadow = true;
    this.light.shadow.mapSize.width = 2048;
    this.light.shadow.mapSize.height = 2048;
    this.light.shadow.camera.near = 0.5;
    this.light.shadow.camera.far = 500;
    this.light.shadow.camera.left = -100;
    this.light.shadow.camera.right = 100;
    this.light.shadow.camera.top = 100;
    this.light.shadow.camera.bottom = -100;
    this.light.shadow.bias = -0.0005;
    this.light.shadow.normalBias = 0.02;

    this.helper = new THREE.DirectionalLightHelper(this.light, 10, 0xffaa00);
    this.helper.visible = false;

    scene.add(this.light);
    scene.add(this.helper);

    this.updateSunPosition(this.currentDayOfYear, this.currentHour, true);
  }

  public calculateSunPosition(dayOfYear: number, hour: number): SunPosition {
    const solarNoonUtc = 12 - this.location.longitude / 15;
    const localSolarTime = hour + (solarNoonUtc - 12) / 1 + (this.location.timezone - this.location.longitude / 15);
    const hourAngle = this.calculateHourAngle(localSolarTime);
    const declination = this.calculateDeclination(dayOfYear);
    const latitudeRad = THREE.MathUtils.degToRad(this.location.latitude);

    const sinAltitude =
      Math.sin(latitudeRad) * Math.sin(declination) +
      Math.cos(latitudeRad) * Math.cos(declination) * Math.cos(hourAngle);

    const altitude = Math.asin(Math.max(-1, Math.min(1, sinAltitude)));

    const cosAzDenom = Math.cos(altitude);
    if (Math.abs(cosAzDenom) < 1e-10) {
      return { azimuth: 0, altitude: Math.max(0, altitude) };
    }

    const cosAzimuth =
      (Math.sin(declination) * Math.cos(latitudeRad) -
        Math.cos(declination) * Math.sin(latitudeRad) * Math.cos(hourAngle)) /
      cosAzDenom;

    const sinAzimuth = -Math.cos(declination) * Math.sin(hourAngle) / cosAzDenom;

    let azimuth = Math.atan2(sinAzimuth, Math.max(-1, Math.min(1, cosAzimuth)));
    azimuth = azimuth + Math.PI;

    return {
      azimuth: azimuth,
      altitude: Math.max(0, altitude),
    };
  }

  private calculateDeclination(dayOfYear: number): number {
    return THREE.MathUtils.degToRad(
      23.45 * Math.sin(THREE.MathUtils.degToRad((360 / 365) * (dayOfYear - 81)))
    );
  }

  private calculateHourAngle(solarTime: number): number {
    return THREE.MathUtils.degToRad(15 * (solarTime - 12));
  }

  private calculateIntensity(altitude: number): number {
    const normalizedAltitude = altitude / (Math.PI / 2);
    const intensity =
      this.minIntensity +
      (this.maxIntensity - this.minIntensity) * Math.pow(normalizedAltitude, 0.5);
    return Math.max(this.minIntensity, Math.min(this.maxIntensity, intensity));
  }

  public updateSunPosition(
    dayOfYear: number,
    hour: number,
    immediate: boolean = false
  ): void {
    this.currentDayOfYear = dayOfYear;
    this.currentHour = hour;

    const { azimuth, altitude } = this.calculateSunPosition(dayOfYear, hour);

    const x = this.sunDistance * Math.sin(azimuth) * Math.cos(altitude);
    const y = this.sunDistance * Math.sin(altitude);
    const z = this.sunDistance * Math.cos(azimuth) * Math.cos(altitude);

    this.targetPosition.set(x, Math.max(y, 1), z);
    this.targetIntensity = this.calculateIntensity(altitude);

    if (immediate) {
      this.currentPosition.copy(this.targetPosition);
      this.currentIntensity = this.targetIntensity;
      this.light.position.copy(this.currentPosition);
      this.light.intensity = this.currentIntensity;
    }
  }

  public update(deltaTime: number): void {
    const lerpFactor = 1 - Math.exp(-deltaTime * 5);

    this.currentPosition.lerp(this.targetPosition, lerpFactor);
    this.currentIntensity = THREE.MathUtils.lerp(
      this.currentIntensity,
      this.targetIntensity,
      lerpFactor
    );

    this.light.position.copy(this.currentPosition);
    this.light.intensity = this.currentIntensity;

    this.light.target.position.set(0, 0, 0);
    this.light.target.updateMatrixWorld();

    this.helper.update();
  }

  public getCurrentDayOfYear(): number {
    return this.currentDayOfYear;
  }

  public getCurrentHour(): number {
    return this.currentHour;
  }

  public getSunPosition(): THREE.Vector3 {
    return this.currentPosition.clone();
  }

  public setLocation(location: Partial<GeoLocation>): void {
    this.location = { ...this.location, ...location };
    this.updateSunPosition(this.currentDayOfYear, this.currentHour, true);
  }

  public getLocation(): GeoLocation {
    return { ...this.location };
  }

  public getLatitude(): number {
    return this.location.latitude;
  }

  public getLongitude(): number {
    return this.location.longitude;
  }

  public getTimezone(): number {
    return this.location.timezone;
  }

  public dispose(): void {
    this.light.dispose();
    this.helper.dispose();
  }
}
