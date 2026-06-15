export interface TimeState {
  date: Date;
  julianDate: number;
  siderealTime: number;
  sunRa: number;
  sunDec: number;
  skyRotation: number;
}

export class TimeControl {
  private currentDate: Date;
  private longitude: number = 116.4;
  private latitude: number = 39.9;
  private onUpdateCallback: ((state: TimeState) => void) | null = null;

  constructor(initialDate?: Date) {
    this.currentDate = initialDate || new Date();
  }

  public setDate(date: Date): void {
    this.currentDate = new Date(date);
    this.notifyUpdate();
  }

  public getDate(): Date {
    return new Date(this.currentDate);
  }

  public setOnUpdateCallback(callback: (state: TimeState) => void): void {
    this.onUpdateCallback = callback;
    this.notifyUpdate();
  }

  public getJulianDate(date: Date = this.currentDate): number {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    const hour = date.getUTCHours();
    const minute = date.getUTCMinutes();
    const second = date.getUTCSeconds();

    let y = year;
    let m = month;
    
    if (m <= 2) {
      y -= 1;
      m += 12;
    }

    const A = Math.floor(y / 100);
    const B = 2 - A + Math.floor(A / 4);
    
    const JD = Math.floor(365.25 * (y + 4716)) 
             + Math.floor(30.6001 * (m + 1)) 
             + day + B - 1524.5
             + (hour + minute / 60 + second / 3600) / 24;
    
    return JD;
  }

  public getJulianCenturies(JD: number): number {
    return (JD - 2451545.0) / 36525.0;
  }

  public getMeanSiderealTime(JD: number, longitude: number): number {
    const T = this.getJulianCenturies(JD);
    
    const GMST = 280.46061837 
                + 360.98564736629 * (JD - 2451545.0)
                + 0.0003032 * T * T;
    
    let LST = GMST + longitude;
    LST = ((LST % 360) + 360) % 360;
    
    return LST / 15;
  }

  public getSunPosition(JD: number): { ra: number; dec: number } {
    const T = this.getJulianCenturies(JD);
    
    const L = (280.46646 + 36000.76983 * T + 0.0003032 * T * T) % 360;
    const G = ((357.52911 + 35999.05029 * T - 0.0001537 * T * T) % 360) * Math.PI / 180;
    const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;
    
    const obliquity = (23 + (26 + (21.448 - 46.815 * T - 0.00059 * T * T + 0.001813 * T * T * T) / 60) / 60) * Math.PI / 180;
    
    const sunEq = Math.sin(G) * (1.914602 - 0.004817 * T - 0.000014 * T * T)
                 + Math.sin(2 * G) * (0.019993 - 0.000101 * T)
                 + Math.sin(3 * G) * 0.000289;
    
    const sunTrueLong = (L + sunEq) * Math.PI / 180;
    const sunTrueAnomaly = G + sunEq * Math.PI / 180;
    const sunDistance = (1.000001018 * (1 - e * e)) / (1 + e * Math.cos(sunTrueAnomaly));
    
    const sunApparentLong = sunTrueLong - 0.00569 * Math.PI / 180 - 0.00478 * Math.sin((125.04 - 1934.136 * T) * Math.PI / 180) * Math.PI / 180;
    
    const sinDec = Math.sin(obliquity) * Math.sin(sunApparentLong);
    const cosDec = Math.sqrt(1 - sinDec * sinDec);
    
    const tanRAx = Math.cos(sunApparentLong);
    const tanRAy = Math.sin(sunApparentLong) * Math.cos(obliquity);
    
    let ra = Math.atan2(tanRAy, tanRAx) * 180 / Math.PI;
    ra = (ra + 360) % 360;
    
    const dec = Math.asin(sinDec) * 180 / Math.PI;
    
    return {
      ra: ra / 15,
      dec: dec
    };
  }

  public getSkyRotation(JD: number, longitude: number): number {
    const siderealTime = this.getMeanSiderealTime(JD, longitude);
    const sunPos = this.getSunPosition(JD);
    
    const rotation = (siderealTime * 15 - 90) * Math.PI / 180;
    
    return rotation;
  }

  public getCurrentState(): TimeState {
    const JD = this.getJulianDate();
    const sunPos = this.getSunPosition(JD);
    const siderealTime = this.getMeanSiderealTime(JD, this.longitude);
    const skyRotation = this.getSkyRotation(JD, this.longitude);
    
    return {
      date: new Date(this.currentDate),
      julianDate: JD,
      siderealTime: siderealTime,
      sunRa: sunPos.ra,
      sunDec: sunPos.dec,
      skyRotation: skyRotation
    };
  }

  public getFormattedDateTime(): string {
    const d = this.currentDate;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  public getHTMLDateTimeValue(): string {
    const d = this.currentDate;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  public parseHTMLDateTimeValue(value: string): Date {
    const [datePart, timePart] = value.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    
    return new Date(year, month - 1, day, hours, minutes);
  }

  public setLatitudeLongitude(lat: number, lon: number): void {
    this.latitude = lat;
    this.longitude = lon;
    this.notifyUpdate();
  }

  public tick(deltaSeconds: number): void {
    this.currentDate = new Date(this.currentDate.getTime() + deltaSeconds * 1000);
    this.notifyUpdate();
  }

  private notifyUpdate(): void {
    if (this.onUpdateCallback) {
      this.onUpdateCallback(this.getCurrentState());
    }
  }
}
