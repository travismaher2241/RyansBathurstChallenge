export class SkyRenderer {
  private skyCanvas: HTMLCanvasElement;
  private skyCtx: CanvasRenderingContext2D;
  private readonly width = 1200;
  private readonly height = 300;
  private valleyCanvas: HTMLCanvasElement;

  constructor() {
    this.skyCanvas = document.createElement('canvas');
    this.skyCanvas.width = this.width;
    this.skyCanvas.height = this.height;
    this.skyCtx = this.skyCanvas.getContext('2d')!;
    this.generateSkyTexture();
    this.valleyCanvas = document.createElement('canvas');
    this.valleyCanvas.width = this.width;
    this.valleyCanvas.height = this.height;
    this.generateValleyTexture();
  }

  private generateValleyTexture(): void {
    const ctx = this.valleyCanvas.getContext('2d')!;
    const w = this.width, h = this.height;
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#508fb8'); sky.addColorStop(.65, '#b5ccd0'); sky.addColorStop(1, '#e1d9b6');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    // Periodic ridges avoid a seam at north. A distant valley rather than a
    // near mountain wall makes the view open out as the car climbs.
    for (let layer = 0; layer < 3; layer++) {
      ctx.fillStyle = ['#92a8a4', '#9fae95', '#abb18b'][layer];
      ctx.beginPath(); ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 4) {
        const a = x / w * Math.PI * 2;
        ctx.lineTo(x, 195 + layer * 24 + Math.sin(a * 3) * (9 - layer * 2) + Math.cos(a * 7) * 4);
      }
      ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
    }
    // An artistic Bathurst basin: soft patchwork fields and a small town,
    // not surveyed building positions. World-heading scrolling anchors the view.
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 24; col++) {
        const x = col * 50 + (row % 2) * 12, y = 252 + row * 12;
        ctx.fillStyle = ['#b8b489', '#a4ad82', '#c3b991', '#a4aa80'][(col * 7 + row) % 4];
        ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+43,y-3); ctx.lineTo(x+50,y+8); ctx.lineTo(x+3,y+10); ctx.fill();
        ctx.strokeStyle = '#919f7e'; ctx.lineWidth = .6;
        ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+43,y-3); ctx.stroke();
      }
    }
    for (let i = 0; i < 100; i++) {
      const x = 340 + (i * 37 % 290), y = 242 + (i * 13 % 23);
      ctx.fillStyle = i % 3 ? '#c7c6b2' : '#9d9e94'; ctx.fillRect(x,y,3 + i % 5,2);
    }
  }

  private generateSkyTexture(): void {
    const ctx = this.skyCtx;
    const w = this.width;
    const h = this.height;

    // 1. Australian Outback / Bathurst Sky Gradient (Deep azure blue down to warm hazy horizon)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.7);
    skyGrad.addColorStop(0, '#023e8a');   // Deep Australian blue
    skyGrad.addColorStop(0.4, '#0077b6');
    skyGrad.addColorStop(0.75, '#48cae4');
    skyGrad.addColorStop(1.0, '#90e0ef');  // Warm horizon haze
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Warm sun glare
    const sunGrad = ctx.createRadialGradient(w * 0.7, h * 0.25, 4, w * 0.7, h * 0.25, 120);
    sunGrad.addColorStop(0, 'rgba(255, 255, 240, 0.95)');
    sunGrad.addColorStop(0.2, 'rgba(255, 240, 180, 0.6)');
    sunGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 0, w, h);

    // Light scattered Australian clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    const clouds = [
      { x: 120, y: 50, rx: 70, ry: 18 },
      { x: 160, y: 44, rx: 50, ry: 15 },
      { x: 420, y: 70, rx: 90, ry: 20 },
      { x: 470, y: 62, rx: 60, ry: 16 },
      { x: 800, y: 40, rx: 80, ry: 18 },
      { x: 840, y: 35, rx: 55, ry: 14 },
      { x: 1050, y: 65, rx: 75, ry: 17 },
    ];
    for (const c of clouds) {
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Far Distant Blue Mountains (Parallax Layer 1) - Periodic over width w
    ctx.fillStyle = '#4a6fa5';
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, h * 0.62);
    for (let x = 0; x <= w; x += 20) {
      const angle = (x / w) * Math.PI * 2;
      const y = h * 0.62 + Math.sin(angle * 2) * 20 + Math.cos(angle * 4) * 12;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // 3. Mount Panorama Main Ridge & Iconic Profile (Wahluu) - Periodic over width w
    ctx.fillStyle = '#2d5a3f'; // Australian dry gum-forested ridge
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, h * 0.74);
    for (let x = 0; x <= w; x += 15) {
      const angle = (x / w) * Math.PI * 2;
      // High peak around center, periodic
      const peak = Math.sin(angle) * 28 + Math.cos(angle * 3) * 14 + Math.sin(angle * 5) * 6;
      const y = h * 0.74 - peak;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // Foreground rural foothills & eucalyptus silhouette - Periodic
    ctx.fillStyle = '#1e3f2b';
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, h * 0.86);
    for (let x = 0; x <= w; x += 15) {
      const angle = (x / w) * Math.PI * 2;
      const y = h * 0.86 + Math.sin(angle * 4) * 8 + Math.cos(angle * 8) * 5;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // Prominent radio tower on top of the peak
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.25, h * 0.74 - 35);
    ctx.lineTo(w * 0.25, h * 0.74 - 65);
    ctx.moveTo(w * 0.75, h * 0.74 - 35);
    ctx.lineTo(w * 0.75, h * 0.74 - 65);
    ctx.stroke();
  }

  public render(ctx: CanvasRenderingContext2D, screenW: number, horizonY: number, cameraHeadingRad: number, trackHeightM: number = 0): void {
    // Parallax scrolling based on camera heading
    const normalizedHeading = ((cameraHeadingRad % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const scrollX = (normalizedHeading / (Math.PI * 2)) * this.width;

    const destH = Math.max(120, horizonY);
    const destY = horizonY - destH;

    // Blend with physical climb height; no camera/road changes or sudden sector switch.
    const valleyBlend = Math.max(0, Math.min(1, (trackHeightM - 65) / 85));
    // A fixed angular field of view also keeps the panorama stable on resize.
    const panoramaScale = screenW / (this.width * 0.42);
    let currentDestX = 0;
    let sourceX = scrollX % this.width;

    while (currentDestX < screenW) {
      const sliceW = Math.min(this.width - sourceX, (screenW - currentDestX) / panoramaScale);
      ctx.drawImage(
        this.skyCanvas,
        sourceX, 0, sliceW, this.height,
        currentDestX, destY, sliceW * panoramaScale, destH
      );
      if (valleyBlend > 0) {
        ctx.save(); ctx.globalAlpha = valleyBlend;
        ctx.drawImage(this.valleyCanvas, sourceX, 0, sliceW, this.height,
          currentDestX, destY, sliceW * panoramaScale, destH);
        ctx.restore();
      }
      currentDestX += sliceW * panoramaScale;
      sourceX = 0;
    }
  }
}
