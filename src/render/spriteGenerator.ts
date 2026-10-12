import { createDetailSprites } from './sceneryDetailSprites';

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
  id: string;
  name: string;
  model: 'camaro' | 'mustang';
  primary: string;       // Main body colour
  secondary: string;     // Livery graphic / secondary colour
  accent: string;        // Accent (Ampol red / Shell yellow)
  roofColor: string;     // Roof colour
  number: string;        // Competition race number
  numberBg: string;      // Race number plate background
  numberColor: string;   // Race number text color
  spoilerBlade: string;  // Carbon wing blade colour
  endplateColor: string; // Wing endplate colour
  endplateAccent?: string;
  tailLightStyle: 'camaro_bars' | 'mustang_tribar';
}

export const LIVERY_THEMES: LiveryTheme[] = [
  // 0: Red Bull Ampol Racing #888 (Triple Eight - Chevrolet Camaro ZL1 - Will Brown)
  {
    id: 'redbull',
    name: 'Red Bull Ampol Racing #888',
    model: 'camaro',
    primary: '#04122d',       // Deep metallic midnight navy
    secondary: '#cc0028',     // Red Bull crimson
    accent: '#fdb913',        // Red Bull sun yellow
    roofColor: '#f8fafc',     // White roof
    number: '888',
    numberBg: '#f8fafc',
    numberColor: '#04122d',
    spoilerBlade: '#04122d',
    endplateColor: '#cc0028',
    endplateAccent: '#fdb913',
    tailLightStyle: 'camaro_bars',
  },
  // 1: Shell V-Power Racing Team #17 (Dick Johnson Racing - Ford Mustang GT - Brodie Kostecki)
  {
    id: 'shell',
    name: 'Shell V-Power Racing #17',
    model: 'mustang',
    primary: '#df1821',       // Shell vibrant scarlet red
    secondary: '#fbd300',     // Shell sunburst yellow
    accent: '#ffffff',        // White racing stripe
    roofColor: '#fbd300',     // Shell yellow roof
    number: '17',
    numberBg: '#fbd300',
    numberColor: '#df1821',
    spoilerBlade: '#fbd300',
    endplateColor: '#df1821',
    endplateAccent: '#ffffff',
    tailLightStyle: 'mustang_tribar',
  },
  // 2: Monster Energy Racing #6 (Tickford - Ford Mustang GT - Cam Waters)
  {
    id: 'monster',
    name: 'Monster Energy #6',
    model: 'mustang',
    primary: '#111417',       // Matte carbon black
    secondary: '#98c807',     // Monster neon green
    accent: '#ffffff',
    roofColor: '#111417',
    number: '6',
    numberBg: '#111417',
    numberColor: '#98c807',
    spoilerBlade: '#111417',
    endplateColor: '#98c807',
    endplateAccent: '#ffffff',
    tailLightStyle: 'mustang_tribar',
  },
  // 3: Penrite Racing #19 (Grove - Ford Mustang GT - Matt Payne)
  {
    id: 'penrite',
    name: 'Penrite Racing #19',
    model: 'mustang',
    primary: '#161616',       // Black
    secondary: '#cf142b',     // Penrite red
    accent: '#d4af37',        // Penrite gold
    roofColor: '#161616',
    number: '19',
    numberBg: '#cf142b',
    numberColor: '#ffffff',
    spoilerBlade: '#161616',
    endplateColor: '#cf142b',
    endplateAccent: '#d4af37',
    tailLightStyle: 'mustang_tribar',
  },
  // 4: Mobil 1 Optus Racing #25 (WAU - Ford Mustang GT - Chaz Mostert)
  {
    id: 'mobil1',
    name: 'Mobil 1 Optus #25',
    model: 'mustang',
    primary: '#c8d1dc',       // Silver/white
    secondary: '#002f6c',     // Mobil blue
    accent: '#00a3ad',        // Optus teal
    roofColor: '#002f6c',
    number: '25',
    numberBg: '#00a3ad',
    numberColor: '#ffffff',
    spoilerBlade: '#002f6c',
    endplateColor: '#00a3ad',
    endplateAccent: '#ffffff',
    tailLightStyle: 'mustang_tribar',
  },
  // 5: Castrol Racing #55 (Tickford - Ford Mustang GT - Thomas Randle)
  {
    id: 'castrol',
    name: 'Castrol Racing #55',
    model: 'mustang',
    primary: '#f8fafc',       // Pure white
    secondary: '#007a3d',     // Castrol green
    accent: '#e31b23',        // Castrol red
    roofColor: '#007a3d',
    number: '55',
    numberBg: '#e31b23',
    numberColor: '#ffffff',
    spoilerBlade: '#007a3d',
    endplateColor: '#e31b23',
    endplateAccent: '#ffffff',
    tailLightStyle: 'mustang_tribar',
  },
  // 6: Tradie Beer Racing #34 (MSR - Chevrolet Camaro ZL1 - Jack Le Brocq)
  {
    id: 'tradie',
    name: 'Tradie Racing #34',
    model: 'camaro',
    primary: '#ffbe0b',       // Tradie gold/yellow
    secondary: '#004aad',     // Blue
    accent: '#111417',        // Black
    roofColor: '#ffbe0b',
    number: '34',
    numberBg: '#111417',
    numberColor: '#ffbe0b',
    spoilerBlade: '#111417',
    endplateColor: '#004aad',
    endplateAccent: '#ffbe0b',
    tailLightStyle: 'camaro_bars',
  },
  // 7: Bendix Racing #10 (MSR - Chevrolet Camaro ZL1 - Nick Percat)
  {
    id: 'bendix',
    name: 'Bendix Racing #10',
    model: 'camaro',
    primary: '#0d131f',       // Charcoal/navy
    secondary: '#0099ff',     // Electric blue
    accent: '#ffffff',
    roofColor: '#0d131f',
    number: '10',
    numberBg: '#0099ff',
    numberColor: '#ffffff',
    spoilerBlade: '#0d131f',
    endplateColor: '#0099ff',
    endplateAccent: '#ffffff',
    tailLightStyle: 'camaro_bars',
  },
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
    createDetailSprites(this.scenerySprites);
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

    // Gen3 Supercars Dimensions & Dynamic Roll Stance
    const cx = W / 2;
    const baseY = 86;
    const bodyW = 122; // Wide, aggressive modern Supercars stance
    const bodyH = 46;
    const lean = steerLevel * 4; // visual chassis roll over kerbs

    // 1. Soft Underbody Ground Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.ellipse(cx + lean * 0.5, baseY + 6, bodyW * 0.52, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Wide 18" Supercars Racing Slicks
    const tyreW = 24;
    const tyreH = 36;
    ctx.fillStyle = '#0f1216';
    // Left slick tyre
    ctx.fillRect(cx - bodyW / 2 + 1, baseY - tyreH + 11, tyreW, tyreH);
    // Right slick tyre
    ctx.fillRect(cx + bodyW / 2 - tyreW - 1, baseY - tyreH + 11, tyreW, tyreH);

    // Tread highlights & Dunlop/Goodyear yellow tyre marking stencil
    ctx.fillStyle = '#1e232a';
    ctx.fillRect(cx - bodyW / 2 + 3, baseY - tyreH + 13, tyreW - 4, tyreH - 4);
    ctx.fillRect(cx + bodyW / 2 - tyreW + 1, baseY - tyreH + 13, tyreW - 4, tyreH - 4);
    ctx.fillStyle = '#ffbe10'; // Yellow tyre marking accent
    ctx.fillRect(cx - bodyW / 2 + 2, baseY - 12, 4, 3);
    ctx.fillRect(cx + bodyW / 2 - tyreW, baseY - 12, 4, 3);

    // 3. Carbon Underbody Diffuser & Exhaust Outlets
    ctx.fillStyle = '#080a0e';
    ctx.fillRect(cx - 48 + lean * 0.5, baseY - 14, 96, 17);

    // 4 Vertical Diffuser Aero Fins / Strakes
    ctx.fillStyle = '#1c222b';
    const finOffsets = [-30, -10, 10, 30];
    for (const fo of finOffsets) {
      ctx.fillRect(cx + fo + lean * 0.5, baseY - 12, 2.5, 14);
    }

    // FIA Centre Safety Rain Light
    ctx.fillStyle = braking ? '#ff0033' : '#dc2626';
    ctx.fillRect(cx - 3 + lean * 0.5, baseY - 8, 6, 4);
    if (braking) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - 1 + lean * 0.5, baseY - 7, 2, 2);
    }

    // Quad Exhaust Tips (2 Left, 2 Right) with Polished Metallic Bevels
    ctx.fillStyle = '#94a3b8'; // Polished titanium / stainless
    ctx.fillRect(cx - 44 + lean * 0.5, baseY - 7, 6, 6);
    ctx.fillRect(cx - 36 + lean * 0.5, baseY - 7, 6, 6);
    ctx.fillRect(cx + 30 + lean * 0.5, baseY - 7, 6, 6);
    ctx.fillRect(cx + 38 + lean * 0.5, baseY - 7, 6, 6);
    ctx.fillStyle = '#090d16'; // Dark hollow exhaust inside
    ctx.fillRect(cx - 43 + lean * 0.5, baseY - 6, 4, 4);
    ctx.fillRect(cx - 35 + lean * 0.5, baseY - 6, 4, 4);
    ctx.fillRect(cx + 31 + lean * 0.5, baseY - 6, 4, 4);
    ctx.fillRect(cx + 39 + lean * 0.5, baseY - 6, 4, 4);

    // 4. Main Rear Body Shell & Muscular Haunches
    ctx.fillStyle = livery.primary;
    ctx.beginPath();
    const blx = cx - bodyW / 2 + 5 + lean;
    const brx = cx + bodyW / 2 - 5 + lean;
    const bty = baseY - 28;
    const bby = baseY - 1;

    ctx.moveTo(blx, bby);
    ctx.lineTo(brx, bby);
    ctx.lineTo(brx + 5, bty);
    // Arch up to waistline
    ctx.lineTo(cx + bodyW * 0.45 + lean, baseY - bodyH);
    ctx.lineTo(cx - bodyW * 0.45 + lean, baseY - bodyH);
    ctx.lineTo(blx - 5, bty);
    ctx.closePath();
    ctx.fill();

    // 5. Team Livery Graphics (Red Bull Ampol vs Shell V-Power & Grid)
    if (livery.id === 'redbull') {
      // RED BULL AMPOL RACING LIVERY:
      // Red Bull yellow sun circle arc on right/centre bootlid
      ctx.fillStyle = livery.accent; // #fdb913
      ctx.beginPath();
      ctx.arc(cx + 14 + lean, baseY - 30, 16, 0, Math.PI * 2);
      ctx.fill();

      // Red Bull crimson bull slash & speed lines
      ctx.fillStyle = livery.secondary; // #cc0028
      ctx.beginPath();
      ctx.moveTo(cx - 24 + lean, baseY - 24);
      ctx.lineTo(cx + 28 + lean, baseY - 36);
      ctx.lineTo(cx + 34 + lean, baseY - 28);
      ctx.lineTo(cx - 18 + lean, baseY - 18);
      ctx.closePath();
      ctx.fill();

      // Ampol Red & White chevron banner on bumper
      ctx.fillStyle = '#cc0028';
      ctx.fillRect(cx - 36 + lean, baseY - 18, 72, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - 12 + lean, baseY - 18, 24, 5);
      ctx.fillStyle = '#002d72'; // Ampol blue accent
      ctx.fillRect(cx - 2 + lean, baseY - 18, 4, 5);
    } else if (livery.id === 'shell') {
      // SHELL V-POWER RACING TEAM LIVERY (DJR):
      // Shell sunburst yellow wraps sides & decklid
      ctx.fillStyle = livery.secondary; // #fbd300
      ctx.fillRect(cx - bodyW * 0.44 + lean, baseY - 36, bodyW * 0.88, 10);

      // White transitional speed slash
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - bodyW * 0.44 + lean, baseY - 26, bodyW * 0.88, 3);

      // Mustang Blackout Trunk Panel between lights
      ctx.fillStyle = '#111417';
      ctx.fillRect(cx - 28 + lean, baseY - 32, 56, 15);
    } else {
      // Other Gen3 Supercars grid liveries
      ctx.fillStyle = livery.secondary;
      ctx.fillRect(cx - bodyW * 0.43 + lean, baseY - 34, bodyW * 0.86, 9);
      if (livery.accent) {
        ctx.fillStyle = livery.accent;
        ctx.fillRect(cx - bodyW * 0.43 + lean, baseY - 25, bodyW * 0.86, 3);
      }
    }

    // Lower bumper moulding dark strip & rear diffuser join
    ctx.fillStyle = '#0a0d12';
    ctx.fillRect(blx - 3, baseY - 17, (brx - blx) + 6, 4);

    // 6. Cabin, Roof & Fastback Window
    const roofW = 72;
    const roofY = baseY - bodyH - 24;

    // Team Roof Color (White for Red Bull, Yellow for Shell)
    ctx.fillStyle = livery.roofColor;
    ctx.beginPath();
    ctx.moveTo(cx - bodyW * 0.42 + lean, baseY - bodyH);
    ctx.lineTo(cx - roofW * 0.5 + lean * 1.5, roofY);
    ctx.lineTo(cx + roofW * 0.5 + lean * 1.5, roofY);
    ctx.lineTo(cx + bodyW * 0.42 + lean, baseY - bodyH);
    ctx.closePath();
    ctx.fill();

    // Dark smoke-tinted rear windshield
    ctx.fillStyle = '#070a12';
    ctx.beginPath();
    ctx.moveTo(cx - bodyW * 0.38 + lean, baseY - bodyH + 1);
    ctx.lineTo(cx - roofW * 0.44 + lean * 1.4, roofY + 3);
    ctx.lineTo(cx + roofW * 0.44 + lean * 1.4, roofY + 3);
    ctx.lineTo(cx + bodyW * 0.38 + lean, baseY - bodyH + 1);
    ctx.closePath();
    ctx.fill();

    // Supercars Steel Roll Cage visible through glass
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx - roofW * 0.36 + lean * 1.4, roofY + 5);
    ctx.lineTo(cx + 10 + lean, baseY - bodyH);
    ctx.moveTo(cx + roofW * 0.36 + lean * 1.4, roofY + 5);
    ctx.lineTo(cx - 10 + lean, baseY - bodyH);
    ctx.stroke();

    // Dual Supercars Polycarbonate Window Retention Straps
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 12 + lean, roofY + 4);
    ctx.lineTo(cx - 12 + lean, baseY - bodyH);
    ctx.moveTo(cx + 12 + lean, roofY + 4);
    ctx.lineTo(cx + 12 + lean, baseY - bodyH);
    ctx.stroke();

    // Roof-Mounted Telemetry Camera Pod / Shark Fin
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx - 2 + lean * 1.5, roofY - 7, 4, 7);
    ctx.fillStyle = livery.accent || '#ffffff';
    ctx.fillRect(cx - 1 + lean * 1.5, roofY - 7, 2, 2);

    // 7. Gen3 Swan-Neck GT Rear Wing
    const wingY = baseY - bodyH - 13;
    const wingW = 114;

    // Dual Swan-Neck Wing Mounts (curving forward over top of aerofoil)
    ctx.fillStyle = '#0a0d14';
    ctx.beginPath();
    // Left swan-neck mount
    ctx.moveTo(cx - 26 + lean * 0.8, baseY - bodyH + 2);
    ctx.lineTo(cx - 23 + lean * 0.8, wingY - 7);
    ctx.lineTo(cx - 18 + lean * 0.8, wingY - 7);
    ctx.lineTo(cx - 21 + lean * 0.8, baseY - bodyH + 2);
    // Right swan-neck mount
    ctx.moveTo(cx + 21 + lean * 0.8, baseY - bodyH + 2);
    ctx.lineTo(cx + 18 + lean * 0.8, wingY - 7);
    ctx.lineTo(cx + 23 + lean * 0.8, wingY - 7);
    ctx.lineTo(cx + 26 + lean * 0.8, baseY - bodyH + 2);
    ctx.closePath();
    ctx.fill();

    // Wing Blade Aerofoil
    ctx.fillStyle = livery.spoilerBlade;
    ctx.fillRect(cx - wingW / 2 + lean, wingY - 6, wingW, 8);
    // Carbon Gurney Flap on trailing edge
    ctx.fillStyle = '#000000';
    ctx.fillRect(cx - wingW / 2 + lean, wingY - 7, wingW, 2);

    // Massive Vertical Aerodynamic Endplates
    const epW = 4.5;
    const epH = 19;
    const epY = wingY - 12;
    // Left Endplate
    ctx.fillStyle = livery.endplateColor;
    ctx.fillRect(cx - wingW / 2 + lean - epW, epY, epW, epH);
    if (livery.endplateAccent) {
      ctx.fillStyle = livery.endplateAccent;
      ctx.fillRect(cx - wingW / 2 + lean - epW + 1, epY + 2, epW - 2, 4);
    }
    // Right Endplate
    ctx.fillStyle = livery.endplateColor;
    ctx.fillRect(cx + wingW / 2 + lean, epY, epW, epH);
    if (livery.endplateAccent) {
      ctx.fillStyle = livery.endplateAccent;
      ctx.fillRect(cx + wingW / 2 + lean + 1, epY + 2, epW - 2, 4);
    }

    // 8. Supercars Competition Race Number Badge
    const badgeW = livery.number.length >= 3 ? 34 : 28;
    ctx.fillStyle = livery.numberBg;
    ctx.fillRect(cx - badgeW / 2 + lean, baseY - 29, badgeW, 16);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - badgeW / 2 + lean, baseY - 29, badgeW, 16);
    ctx.fillStyle = livery.numberColor;
    ctx.font = livery.number.length >= 3 ? 'bold 10px "Courier New", monospace' : 'bold 12px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(livery.number, cx + lean, baseY - 21);

    // 9. Distinctive Model Rear Tail Lights (Mustang Tri-Bar vs Camaro Dual Horizontal)
    if (livery.tailLightStyle === 'mustang_tribar') {
      // FORD MUSTANG GT TRI-BAR VERTICAL LED TAIL LIGHTS
      const barW = 3.5;
      const barH = 12;
      const lightY = baseY - 29;
      const leftX = [cx - 50 + lean, cx - 44 + lean, cx - 38 + lean];
      const rightX = [cx + 35 + lean, cx + 41 + lean, cx + 47 + lean];

      if (braking) {
        // Radiant red bloom
        ctx.fillStyle = 'rgba(255, 30, 30, 0.5)';
        ctx.beginPath();
        ctx.arc(cx - 44 + lean, lightY + barH / 2, 22, 0, Math.PI * 2);
        ctx.arc(cx + 41 + lean, lightY + barH / 2, 22, 0, Math.PI * 2);
        ctx.fill();

        // 3 Glowing Red Bars on Left, 3 on Right with White LED Cores
        for (const bx of [...leftX, ...rightX]) {
          ctx.fillStyle = '#ff1122';
          ctx.fillRect(bx, lightY - 1, barW, barH + 2);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(bx + 1, lightY + 1, barW - 2, barH - 2);
        }
      } else {
        // Normal running ruby red tri-bars
        for (const bx of [...leftX, ...rightX]) {
          ctx.fillStyle = '#850005';
          ctx.fillRect(bx, lightY, barW, barH);
          ctx.fillStyle = '#dd1122';
          ctx.fillRect(bx + 1, lightY + 1, barW - 2, barH - 2);
        }
      }
    } else {
      // CHEVROLET CAMARO ZL1 DUAL HORIZONTAL LED TAIL LIGHT BARS
      const barW = 24;
      const barH = 4;
      const lightY = baseY - 28;
      const leftX = cx - 51 + lean;
      const rightX = cx + 27 + lean;

      if (braking) {
        // Radiant red bloom
        ctx.fillStyle = 'rgba(255, 30, 30, 0.5)';
        ctx.beginPath();
        ctx.arc(leftX + barW / 2, lightY + 5, 22, 0, Math.PI * 2);
        ctx.arc(rightX + barW / 2, lightY + 5, 22, 0, Math.PI * 2);
        ctx.fill();

        // Upper & Lower Horizontal LED Bars
        for (const lx of [leftX, rightX]) {
          // Upper bar
          ctx.fillStyle = '#ff1122';
          ctx.fillRect(lx, lightY - 1, barW, barH + 1);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(lx + 2, lightY, barW - 4, barH - 1);
          // Lower bar
          ctx.fillStyle = '#ff1122';
          ctx.fillRect(lx, lightY + 6, barW, barH + 1);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(lx + 2, lightY + 7, barW - 4, barH - 1);
        }
      } else {
        // Normal running horizontal dual ribbons
        for (const lx of [leftX, rightX]) {
          ctx.fillStyle = '#1a0005';
          ctx.fillRect(lx - 1, lightY - 1, barW + 2, 12);
          ctx.fillStyle = '#dd1122';
          ctx.fillRect(lx, lightY, barW, barH);
          ctx.fillRect(lx, lightY + 6, barW, barH);
        }
      }
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
