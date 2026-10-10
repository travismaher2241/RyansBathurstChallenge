export interface CarSpriteSet {
  straight: HTMLCanvasElement;
  slightLeft: HTMLCanvasElement;
  hardLeft: HTMLCanvasElement;
  slightRight: HTMLCanvasElement;
  hardRight: HTMLCanvasElement;
  straightBrake: HTMLCanvasElement;
  slightLeftBrake: HTMLCanvasElement;
  hardLeftBrake: HTMLCanvasElement;
  slightRightBrake: HTMLCanvasElement;
  hardRightBrake: HTMLCanvasElement;
}

export interface ScenerySprites {
  [key: string]: HTMLCanvasElement;
}

export interface LiveryTheme {
  primary: string;
  secondary: string;
  accent: string;
  number: string;
  numberBg: string;
  spoilerColor: string;
}

export const LIVERY_THEMES: LiveryTheme[] = [
  // 0: Player - Classic Commodore / Sierra Blue & Yellow
  { primary: '#0a3882', secondary: '#ffcc00', accent: '#ffffff', number: '17', numberBg: '#ffffff', spoilerColor: '#0a3882' },
  // 1: AI 1 - The King: Classic Red & White #05
  { primary: '#d90429', secondary: '#ffffff', accent: '#111111', number: '05', numberBg: '#ffffff', spoilerColor: '#d90429' },
  // 2: AI 2 - Yellow & Black Turbo Beast
  { primary: '#ffb703', secondary: '#111111', accent: '#fb8500', number: '30', numberBg: '#111111', spoilerColor: '#111111' },
  // 3: AI 3 - Green & Gold Aussie Muscle
  { primary: '#1b4332', secondary: '#d4af37', accent: '#40916c', number: '11', numberBg: '#ffffff', spoilerColor: '#1b4332' },
  // 4: AI 4 - Silver & Red Turbo
  { primary: '#adb5bd', secondary: '#c1121f', accent: '#003049', number: '1', numberBg: '#c1121f', spoilerColor: '#2b2d42' },
  // 5: AI 5 - Orange & Charcoal Privateer
  { primary: '#f77f00', secondary: '#212529', accent: '#eae2b7', number: '44', numberBg: '#ffffff', spoilerColor: '#212529' },
  // 6: AI 6 - Deep Purple & Cyan Racer
  { primary: '#3a0ca3', secondary: '#4cc9f0', accent: '#f72585', number: '9', numberBg: '#ffffff', spoilerColor: '#3a0ca3' },
  // 7: AI 7 - Classic Pure White & Red Stripe
  { primary: '#f8f9fa', secondary: '#e63946', accent: '#1d3557', number: '77', numberBg: '#1d3557', spoilerColor: '#e63946' },
];

export class SpriteGenerator {
  public carSprites: CarSpriteSet[] = [];
  public scenerySprites: ScenerySprites = {};

  constructor() {
    this.generateAllSprites();
  }

  private generateAllSprites(): void {
    // 1. Generate Car Sprites for each livery
    for (let i = 0; i < LIVERY_THEMES.length; i++) {
      this.carSprites.push(this.generateCarSpriteSet(LIVERY_THEMES[i]));
    }

    // 2. Generate Scenery Sprites
    this.scenerySprites['eucalyptus'] = this.drawEucalyptus(64, 110, false);
    this.scenerySprites['eucalyptus_tall'] = this.drawEucalyptus(80, 150, true);
    this.scenerySprites['bush'] = this.drawBush(48, 36);
    this.scenerySprites['pit_building'] = this.drawPitBuilding(280, 70);
    this.scenerySprites['grandstand'] = this.drawGrandstand(190, 85);
    this.scenerySprites['paddock'] = this.drawPaddock(140, 60);
    this.scenerySprites['hillside_sign'] = this.drawHillsideSign(240, 48);
    this.scenerySprites['rock_face'] = this.drawRockFace(120, 80);
    this.scenerySprites['campground'] = this.drawCampground(130, 60);
    this.scenerySprites['camp_tent'] = this.drawCampTent(45, 32);
    this.scenerySprites['bridge'] = this.drawBridge(260, 85);
    this.scenerySprites['hotel'] = this.drawHotel(160, 75);
    this.scenerySprites['farm'] = this.drawFarm(120, 55);
    this.scenerySprites['museum'] = this.drawMuseum(160, 65);
    this.scenerySprites['barrier'] = this.drawArmcoBarrier(60, 24);
    this.scenerySprites['concrete_barrier'] = this.drawConcreteBarrier(60, 26);
    this.scenerySprites['fence_post'] = this.drawFencePost(18, 36);
    this.scenerySprites['brake_board_300'] = this.drawBrakeBoard('300');
    this.scenerySprites['brake_board_200'] = this.drawBrakeBoard('200');
    this.scenerySprites['brake_board_100'] = this.drawBrakeBoard('100');
    this.scenerySprites['tower'] = this.drawSkylineTower(40, 160);
    this.scenerySprites['tree_mountain'] = this.drawMountainTree(54, 95);
  }

  // --- CAR SPRITE GENERATION ---
  private generateCarSpriteSet(livery: LiveryTheme): CarSpriteSet {
    return {
      straight: this.drawCar(livery, 0, false),
      slightLeft: this.drawCar(livery, -1, false),
      hardLeft: this.drawCar(livery, -2, false),
      slightRight: this.drawCar(livery, 1, false),
      hardRight: this.drawCar(livery, 2, false),
      straightBrake: this.drawCar(livery, 0, true),
      slightLeftBrake: this.drawCar(livery, -1, true),
      hardLeftBrake: this.drawCar(livery, -2, true),
      slightRightBrake: this.drawCar(livery, 1, true),
      hardRightBrake: this.drawCar(livery, 2, true),
    };
  }

  private drawCar(livery: LiveryTheme, steerLevel: number, braking: boolean): HTMLCanvasElement {
    const W = 160;
    const H = 96;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    // Car dimensions
    const cx = W / 2;
    const baseY = 84;
    const bodyW = 112;
    const bodyH = 46;
    const lean = steerLevel * 4; // visual chassis roll

    // 1. Shadow underneath
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.ellipse(cx + lean * 0.5, baseY + 6, bodyW * 0.54, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Wide Racing Tyres (Left and Right)
    const tyreW = 22;
    const tyreH = 34;
    ctx.fillStyle = '#111417';
    // Left tyre
    ctx.fillRect(cx - bodyW / 2 + 2, baseY - tyreH + 10, tyreW, tyreH);
    // Right tyre
    ctx.fillRect(cx + bodyW / 2 - tyreW - 2, baseY - tyreH + 10, tyreW, tyreH);
    // Tyre tread highlights
    ctx.fillStyle = '#22272e';
    ctx.fillRect(cx - bodyW / 2 + 4, baseY - tyreH + 12, tyreW - 4, tyreH - 4);
    ctx.fillRect(cx + bodyW / 2 - tyreW, baseY - tyreH + 12, tyreW - 4, tyreH - 4);

    // 3. Lower Chassis & Diffuser
    ctx.fillStyle = '#1c1f24';
    ctx.fillRect(cx - bodyW / 2 + 10 + lean * 0.5, baseY - 12, bodyW - 20, 16);

    // Twin Exhausts (Left side)
    ctx.fillStyle = '#4a5568';
    ctx.fillRect(cx - 38 + lean * 0.5, baseY - 6, 8, 8);
    ctx.fillRect(cx - 28 + lean * 0.5, baseY - 6, 8, 8);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx - 36 + lean * 0.5, baseY - 4, 4, 4);
    ctx.fillRect(cx - 26 + lean * 0.5, baseY - 4, 4, 4);

    // 4. Main Rear Body Shell
    ctx.fillStyle = livery.primary;
    ctx.beginPath();
    // Bumper bottom corners
    const blx = cx - bodyW / 2 + 6 + lean;
    const brx = cx + bodyW / 2 - 6 + lean;
    const bty = baseY - 26;
    const bby = baseY - 2;

    ctx.moveTo(blx, bby);
    ctx.lineTo(brx, bby);
    ctx.lineTo(brx + 4, bty);
    // Arch to waistline
    ctx.lineTo(cx + bodyW * 0.44 + lean, baseY - bodyH);
    ctx.lineTo(cx - bodyW * 0.44 + lean, baseY - bodyH);
    ctx.lineTo(blx - 4, bty);
    ctx.closePath();
    ctx.fill();

    // Secondary livery stripe / accent
    ctx.fillStyle = livery.secondary;
    ctx.fillRect(cx - bodyW * 0.42 + lean, baseY - 32, bodyW * 0.84, 8);

    // Bumper moulding dark strip
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(blx - 2, baseY - 16, (brx - blx) + 4, 5);

    // 5. Cabin & Rear Window
    const roofW = 76;
    const roofY = baseY - bodyH - 24;
    ctx.fillStyle = livery.primary;
    // Roof pillars
    ctx.beginPath();
    ctx.moveTo(cx - bodyW * 0.42 + lean, baseY - bodyH);
    ctx.lineTo(cx - roofW * 0.5 + lean * 1.5, roofY);
    ctx.lineTo(cx + roofW * 0.5 + lean * 1.5, roofY);
    ctx.lineTo(cx + bodyW * 0.42 + lean, baseY - bodyH);
    ctx.closePath();
    ctx.fill();

    // Dark tinted rear glass
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(cx - bodyW * 0.38 + lean, baseY - bodyH + 1);
    ctx.lineTo(cx - roofW * 0.44 + lean * 1.4, roofY + 4);
    ctx.lineTo(cx + roofW * 0.44 + lean * 1.4, roofY + 4);
    ctx.lineTo(cx + bodyW * 0.38 + lean, baseY - bodyH + 1);
    ctx.closePath();
    ctx.fill();

    // Roll cage bars visible through glass (white/accent)
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx - roofW * 0.38 + lean * 1.4, roofY + 6);
    ctx.lineTo(cx + 8 + lean, baseY - bodyH);
    ctx.moveTo(cx + roofW * 0.38 + lean * 1.4, roofY + 6);
    ctx.lineTo(cx - 8 + lean, baseY - bodyH);
    ctx.stroke();

    // Glass reflection glare
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 18 + lean, roofY + 6);
    ctx.lineTo(cx - 36 + lean, baseY - bodyH - 2);
    ctx.stroke();

    // 6. Huge Touring Car Rear Wing / Spoiler
    const wingY = baseY - bodyH - 12;
    const wingW = 106;
    // Spoiler struts
    ctx.fillStyle = '#111827';
    ctx.fillRect(cx - 32 + lean * 0.8, wingY, 6, 16);
    ctx.fillRect(cx + 26 + lean * 0.8, wingY, 6, 16);
    // Spoiler blade
    ctx.fillStyle = livery.spoilerColor;
    ctx.fillRect(cx - wingW / 2 + lean, wingY - 6, wingW, 8);
    // Endplates
    ctx.fillStyle = livery.accent;
    ctx.fillRect(cx - wingW / 2 + lean - 3, wingY - 10, 4, 15);
    ctx.fillRect(cx + wingW / 2 + lean - 1, wingY - 10, 4, 15);

    // 7. Race Number Badge
    ctx.fillStyle = livery.numberBg;
    ctx.fillRect(cx - 14 + lean, baseY - 26, 28, 16);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(livery.number, cx + lean, baseY - 18);

    // 8. Rear Tail Lights
    const lightW = 20;
    const lightH = 9;
    const lightY = baseY - 27;

    if (braking) {
      // INTENSE BRAKE LIGHTS (BLOOM + BRIGHT RED/ORANGE)
      ctx.fillStyle = 'rgba(255, 30, 30, 0.45)';
      ctx.beginPath();
      ctx.arc(cx - bodyW * 0.42 + lean + lightW / 2, lightY + lightH / 2, 22, 0, Math.PI * 2);
      ctx.arc(cx + bodyW * 0.42 + lean - lightW / 2, lightY + lightH / 2, 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ff1122';
      ctx.fillRect(cx - bodyW * 0.44 + lean, lightY - 1, lightW, lightH + 2);
      ctx.fillRect(cx + bodyW * 0.44 + lean - lightW, lightY - 1, lightW, lightH + 2);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - bodyW * 0.42 + lean, lightY + 2, lightW - 4, lightH - 4);
      ctx.fillRect(cx + bodyW * 0.42 + lean - lightW + 2, lightY + 2, lightW - 4, lightH - 4);
    } else {
      // Normal running lights
      ctx.fillStyle = '#850000';
      ctx.fillRect(cx - bodyW * 0.44 + lean, lightY, lightW, lightH);
      ctx.fillRect(cx + bodyW * 0.44 + lean - lightW, lightY, lightW, lightH);
      ctx.fillStyle = '#cc1111';
      ctx.fillRect(cx - bodyW * 0.43 + lean, lightY + 2, lightW - 2, 3);
      ctx.fillRect(cx + bodyW * 0.43 + lean - lightW + 1, lightY + 2, lightW - 2, 3);
    }

    return canvas;
  }

  // --- SCENERY GENERATION ---
  private drawEucalyptus(w: number, h: number, tall: boolean): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const trunkW = tall ? 8 : 6;
    const cx = w / 2;

    // Trunk with eucalyptus pale bark and rough texture
    ctx.fillStyle = '#dcd5c4';
    ctx.fillRect(cx - trunkW / 2, h * 0.35, trunkW, h * 0.65);
    ctx.fillStyle = '#8f8373';
    ctx.fillRect(cx - trunkW / 2 + 1, h * 0.4, 2, h * 0.58);
    // Tree shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(cx, h - 3, w * 0.35, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Canopy clumps (Olive Australian Gum green shades)
    const shades = ['#384c35', '#4d6849', '#627f5c', '#7d9d76'];
    const clumps = tall
      ? [
          { x: cx, y: h * 0.2, r: w * 0.38, c: shades[0] },
          { x: cx - w * 0.18, y: h * 0.28, r: w * 0.28, c: shades[1] },
          { x: cx + w * 0.16, y: h * 0.26, r: w * 0.3, c: shades[2] },
          { x: cx - w * 0.05, y: h * 0.14, r: w * 0.26, c: shades[3] },
          { x: cx + w * 0.1, y: h * 0.4, r: w * 0.22, c: shades[1] },
        ]
      : [
          { x: cx, y: h * 0.32, r: w * 0.42, c: shades[0] },
          { x: cx - w * 0.22, y: h * 0.38, r: w * 0.32, c: shades[1] },
          { x: cx + w * 0.22, y: h * 0.36, r: w * 0.34, c: shades[2] },
          { x: cx, y: h * 0.2, r: w * 0.34, c: shades[3] },
        ];

    for (const cl of clumps) {
      ctx.fillStyle = cl.c;
      ctx.beginPath();
      ctx.arc(cl.x, cl.y, cl.r, 0, Math.PI * 2);
      ctx.fill();
    }

    return canvas;
  }

  private drawBush(w: number, h: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#4a5d3f';
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.6, w * 0.36, 0, Math.PI * 2);
    ctx.arc(w * 0.3, h * 0.65, w * 0.26, 0, Math.PI * 2);
    ctx.arc(w * 0.7, h * 0.65, w * 0.26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#677d59';
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.5, w * 0.24, 0, Math.PI * 2);
    ctx.fill();
    return canvas;
  }

  private drawMountainTree(w: number, h: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#5c5346';
    ctx.fillRect(w / 2 - 2, h * 0.5, 4, h * 0.5);
    ctx.fillStyle = '#2d4739';
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.35, w * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3f634f';
    ctx.beginPath();
    ctx.arc(w / 2 - 4, h * 0.3, w * 0.28, 0, Math.PI * 2);
    ctx.fill();
    return canvas;
  }

  private drawPitBuilding(w: number, h: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    // Main building structure
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 10, w, h - 10);
    // Roof fascia
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, 6, w, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 14, w, 3);
    // Garages
    const garageW = 28;
    const garageCount = Math.floor(w / (garageW + 6));
    for (let i = 0; i < garageCount; i++) {
      const gx = 10 + i * (garageW + 6);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(gx, 28, garageW, h - 28);
      // Roller door horizontal lines
      ctx.fillStyle = '#64748b';
      for (let y = 32; y < h - 2; y += 4) {
        ctx.fillRect(gx + 2, y, garageW - 4, 1.5);
      }
      // Garage number sign
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(gx + 4, 20, 14, 6);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 5px sans-serif';
      ctx.fillText((i + 1).toString(), gx + 6, 25);
    }
    // Pit wall railings / sponsor banner
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(0, 0, w, 6);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 5px monospace';
    ctx.fillText('BATHURST PIT LANE • TIMING & CONTROL', 10, 5);
    return canvas;
  }

  private drawGrandstand(w: number, h: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    // Roof
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.moveTo(0, 15);
    ctx.lineTo(w, 5);
    ctx.lineTo(w, 14);
    ctx.lineTo(0, 22);
    ctx.closePath();
    ctx.fill();
    // Supporting steel frame
    ctx.fillStyle = '#64748b';
    ctx.fillRect(10, 18, 4, h - 18);
    ctx.fillRect(w - 14, 10, 4, h - 10);
    ctx.fillRect(w / 2 - 2, 14, 4, h - 14);
    // Stepped seating bank
    for (let i = 0; i < 7; i++) {
      const sy = 25 + i * 8;
      ctx.fillStyle = i % 2 === 0 ? '#475569' : '#334155';
      ctx.fillRect(4, sy, w - 8, 8);
      // Pixel crowd cheering
      for (let c = 8; c < w - 12; c += 5) {
        const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#f8fafc'];
        ctx.fillStyle = colors[(c * 7 + i) % colors.length];
        ctx.fillRect(c, sy + 1, 3, 4);
        // Face dot
        ctx.fillStyle = '#fed7aa';
        ctx.fillRect(c + 1, sy, 2, 2);
      }
    }
    return canvas;
  }

  private drawHillsideSign(w: number, h: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    // Mount Panorama large stone/concrete letters embedded in the grassy hillside
    ctx.fillStyle = '#556b2f';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '900 24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
    ctx.fillText('MOUNT PANORAMA', w / 2, h / 2);
    return canvas;
  }

  private drawRockFace(w: number, h: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    // The Cutting red/ochre sandstone rock face
    ctx.fillStyle = '#8c4b2d';
    ctx.fillRect(0, 0, w, h);
    // Stratified rock cracks and shale layers
    ctx.fillStyle = '#5e2f18';
    for (let y = 8; y < h; y += 12) {
      ctx.fillRect(0, y, w, 3);
      for (let x = 6; x < w; x += 18) {
        ctx.fillRect(x + ((y * 3) % 10), y - 6, 2, 10);
      }
    }
    ctx.fillStyle = '#b86b43';
    for (let y = 4; y < h; y += 12) {
      ctx.fillRect(2, y, w - 4, 2);
    }
    return canvas;
  }

  private drawCampground(w: number, h: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    // Caravan
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(10, h - 36, 48, 28);
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(10, h - 22, 48, 4);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(18, h - 32, 14, 8);
    // Tent
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.moveTo(68, h - 4);
    ctx.lineTo(88, h - 32);
    ctx.lineTo(108, h - 4);
    ctx.closePath();
    ctx.fill();
    // Aussie Flag on pole
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(116, h - 45, 2, 42);
    ctx.fillStyle = '#00247d';
    ctx.fillRect(118, h - 45, 14, 9);
    return canvas;
  }

  private drawCampTent(w: number, h: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#e11d48';
    ctx.beginPath();
    ctx.moveTo(4, h - 2);
    ctx.lineTo(w / 2, 6);
    ctx.lineTo(w - 4, h - 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#9f1239';
    ctx.beginPath();
    ctx.moveTo(w / 2, 6);
    ctx.lineTo(w / 2, h - 2);
    ctx.lineTo(w - 4, h - 2);
    ctx.closePath();
    ctx.fill();
    return canvas;
  }

  private drawBridge(w: number, h: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    // Gantry bridge over track
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, w, 18);
    // Left & Right pillars
    ctx.fillRect(0, 18, 16, h - 18);
    ctx.fillRect(w - 16, 18, 16, h - 18);
    // Banner
    ctx.fillStyle = '#e11d48';
    ctx.fillRect(16, 2, w - 32, 14);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MOUNT PANORAMA • BATHURST 1000', w / 2, 12);
    return canvas;
  }

  private drawPaddock(w: number, h: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, 10, w, h - 10);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(0, 0, w, 10);
    return canvas;
  }

  private drawHotel(w: number, h: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 12, w, h - 12);
    ctx.fillStyle = '#7c2d12';
    ctx.fillRect(0, 4, w, 10);
    // Windows
    ctx.fillStyle = '#0284c7';
    for (let r = 20; r < h - 10; r += 14) {
      for (let c = 12; c < w - 12; c += 16) {
        ctx.fillRect(c, r, 9, 8);
      }
    }
    return canvas;
  }

  private drawFarm(w: number, h: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(10, 14, w - 20, h - 14);
    // Barn roof
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(4, 14);
    ctx.lineTo(w / 2, 2);
    ctx.lineTo(w - 4, 14);
    ctx.closePath();
    ctx.fill();
    return canvas;
  }

  private drawMuseum(w: number, h: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 10, w, h - 10);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, 12);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MOTOR RACING MUSEUM', w / 2, 8);
    return canvas;
  }

  private drawArmcoBarrier(w: number, h: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(0, 4, w, h - 8);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, 6, w, 3);
    ctx.fillRect(0, 14, w, 3);
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, 10, w, 2);
    return canvas;
  }

  private drawConcreteBarrier(w: number, h: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 2, w, h - 4);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(0, h - 5, w, 4);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(0, 0, w, 2);
    return canvas;
  }

  private drawFencePost(w: number, h: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#78350f';
    ctx.fillRect(w / 2 - 2, 2, 4, h - 2);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(0, 10, w, 1);
    ctx.fillRect(0, 20, w, 1);
    return canvas;
  }

  private drawBrakeBoard(text: string): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 40;
    canvas.height = 36;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(18, 16, 4, 20);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(4, 2, 32, 18);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(4, 2, 32, 18);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 20, 11);
    return canvas;
  }

  private drawSkylineTower(w: number, h: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    // Mount Panorama transmission tower at the peak
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    const cx = w / 2;
    ctx.beginPath();
    ctx.moveTo(cx - 12, h);
    ctx.lineTo(cx, 10);
    ctx.lineTo(cx + 12, h);
    for (let y = 20; y < h; y += 16) {
      ctx.moveTo(cx - 10, y);
      ctx.lineTo(cx + 10, y);
      ctx.moveTo(cx - 10, y);
      ctx.lineTo(cx + 10, y + 16);
    }
    ctx.stroke();
    // Blinking red beacon top
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(cx, 8, 3, 0, Math.PI * 2);
    ctx.fill();
    return canvas;
  }
}
