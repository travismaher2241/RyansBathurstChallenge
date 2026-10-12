import { Camera, ProjectedPoint } from './camera';
import { TrackManager } from '../track/trackManager';
import { Segment } from '../types/track';

export interface RenderedSegment {
  segment: Segment;
  p0Left: ProjectedPoint;
  p0Right: ProjectedPoint;
  p1Left: ProjectedPoint;
  p1Right: ProjectedPoint;
  p0KerbL: ProjectedPoint;
  p0KerbR: ProjectedPoint;
  p1KerbL: ProjectedPoint;
  p1KerbR: ProjectedPoint;
  hasLeftWall: boolean;
  p0WallBase?: ProjectedPoint;
  p1WallBase?: ProjectedPoint;
  p0WallBarrier?: ProjectedPoint;
  p1WallBarrier?: ProjectedPoint;
  p0WallTop?: ProjectedPoint;
  p1WallTop?: ProjectedPoint;
  wallH0?: number;
  wallH1?: number;
  depthZ: number;
  clipY: number;
  occluded: boolean;
}

interface CameraPoint3D {
  camX: number;
  camY: number;
  camZ: number;
}

export class RoadRenderer {
  public drawDistanceM: number = 550;
  public renderedSegments: RenderedSegment[] = [];

  public renderRoad(
    ctx: CanvasRenderingContext2D,
    track: TrackManager,
    camera: Camera,
    screenW: number,
    screenH: number,
    horizonY: number,
    elevationExaggeration: number = 1.0,
    wireframe: boolean = false
  ): void {
    this.renderedSegments.length = 0;

    const segments = track.segments;
    const startS = camera.s_m;
    const startSegIdx = track.getSegmentIndex(startS);
    const visibleCount = Math.min(120, Math.ceil(this.drawDistanceM / 5));

    const kerbWidth = 1.35;
    const nearPlane = camera.nearPlane;

    // Helper: world to camera coordinates
    const toCamera = (worldE: number, worldN: number, worldH: number): CameraPoint3D => {
      const dE = worldE - camera.worldEast_m;
      const dN = worldN - camera.worldNorth_m;
      const dH = worldH - camera.worldHeight_m;

      const sinH = Math.sin(camera.headingRad);
      const cosH = Math.cos(camera.headingRad);

      const camZ = dE * sinH + dN * cosH;
      const camX = dE * cosH - dN * sinH;
      const camY = dH - camZ * Math.tan(camera.pitchRad);

      return { camX, camY, camZ };
    };

    // Helper: camera to screen projection
    const toScreen = (pt: CameraPoint3D): ProjectedPoint => {
      if (pt.camZ <= 0.1) {
        return { x: screenW * 0.5, y: screenH, scale: 0, depthZ: pt.camZ, visible: false };
      }
      const scale = camera.focalLength / pt.camZ;
      const halfW = screenW * 0.5;
      const x = halfW + pt.camX * scale * halfW;
      const y = horizonY - pt.camY * scale * halfW;
      return { x, y, scale: scale * halfW, depthZ: pt.camZ, visible: true };
    };

    // Helper: lerp 3D point
    const lerpPt = (a: CameraPoint3D, b: CameraPoint3D, t: number): CameraPoint3D => ({
      camX: a.camX + t * (b.camX - a.camX),
      camY: a.camY + t * (b.camY - a.camY),
      camZ: a.camZ + t * (b.camZ - a.camZ),
    });

    // 1. Project segments ahead
    let previousZ = 0;
    for (let i = 0; i < visibleCount; i++) {
      const segIdx = (startSegIdx + i) % segments.length;
      const seg = segments[segIdx];

      const halfW = seg.road_width_m * 0.5;

      // Tangent & Normal at start
      const dE = seg.east_end_m - seg.east_start_m;
      const dN = seg.north_end_m - seg.north_start_m;
      const len = Math.hypot(dE, dN) || 1;
      const normE = dN / len;
      const normN = -dE / len;

      const e0 = seg.east_start_m;
      const n0 = seg.north_start_m;
      const h0 = seg.height_start_m * elevationExaggeration;

      const e1 = seg.east_end_m;
      const n1 = seg.north_end_m;
      const h1 = seg.height_end_m * elevationExaggeration;

      // Camera coordinates for start
      let c0L = toCamera(e0 - normE * halfW, n0 - normN * halfW, h0);
      let c0R = toCamera(e0 + normE * halfW, n0 + normN * halfW, h0);
      let c0KL = toCamera(e0 - normE * (halfW + kerbWidth), n0 - normN * (halfW + kerbWidth), h0);
      let c0KR = toCamera(e0 + normE * (halfW + kerbWidth), n0 + normN * (halfW + kerbWidth), h0);

      // Camera coordinates for end
      let c1L = toCamera(e1 - normE * halfW, n1 - normN * halfW, h1);
      let c1R = toCamera(e1 + normE * halfW, n1 + normN * halfW, h1);
      let c1KL = toCamera(e1 - normE * (halfW + kerbWidth), n1 - normN * (halfW + kerbWidth), h1);
      let c1KR = toCamera(e1 + normE * (halfW + kerbWidth), n1 + normN * (halfW + kerbWidth), h1);

      // Flanking wall calculations (The Cutting sheer rock cliff & safety barrier)
      const wallH0 = this.getCuttingWallHeight(seg.s_start_m);
      const wallH1 = this.getCuttingWallHeight(seg.s_end_m);
      const hasLeftWall = wallH0 > 0 || wallH1 > 0;
      const barH0 = Math.min(1.2, wallH0);
      const barH1 = Math.min(1.2, wallH1);

      const wallOffset = halfW + kerbWidth + 0.35;
      let c0WB = toCamera(e0 - normE * wallOffset, n0 - normN * wallOffset, h0);
      let c1WB = toCamera(e1 - normE * wallOffset, n1 - normN * wallOffset, h1);
      let c0WBar = toCamera(e0 - normE * wallOffset, n0 - normN * wallOffset, h0 + barH0);
      let c1WBar = toCamera(e1 - normE * wallOffset, n1 - normN * wallOffset, h1 + barH1);
      let c0WT = toCamera(e0 - normE * wallOffset, n0 - normN * wallOffset, h0 + wallH0);
      let c1WT = toCamera(e1 - normE * wallOffset, n1 - normN * wallOffset, h1 + wallH1);

      const z0 = (c0L.camZ + c0R.camZ) * 0.5;
      const z1 = (c1L.camZ + c1R.camZ) * 0.5;

      // If segment is completely behind camera, skip it
      if (c0L.camZ < nearPlane && c0R.camZ < nearPlane && c1L.camZ < nearPlane && c1R.camZ < nearPlane) {
        continue;
      }

      // Check if road is turning backwards around a hairpin
      if (i > 8 && z1 < z0 && z1 < previousZ - 2.0) {
        // Road has turned back around the mountain! Stop lookahead.
        break;
      }
      previousZ = Math.max(previousZ, z1);

      // Independent near-plane clipping for left and right edges (prevents vertex collapse glitches)
      if (c0L.camZ < nearPlane && c1L.camZ > nearPlane) {
        const tL = (nearPlane - c0L.camZ) / (c1L.camZ - c0L.camZ);
        c0L = lerpPt(c0L, c1L, tL);
        c0KL = lerpPt(c0KL, c1KL, tL);
        if (hasLeftWall) {
          c0WB = lerpPt(c0WB, c1WB, tL);
          c0WBar = lerpPt(c0WBar, c1WBar, tL);
          c0WT = lerpPt(c0WT, c1WT, tL);
        }
      }
      if (c0R.camZ < nearPlane && c1R.camZ > nearPlane) {
        const tR = (nearPlane - c0R.camZ) / (c1R.camZ - c0R.camZ);
        c0R = lerpPt(c0R, c1R, tR);
        c0KR = lerpPt(c0KR, c1KR, tR);
      }

      let terminateAfter = false;
      if (c1L.camZ < nearPlane && c0L.camZ > nearPlane) {
        const tL = (nearPlane - c0L.camZ) / (c1L.camZ - c0L.camZ);
        c1L = lerpPt(c0L, c1L, tL);
        c1KL = lerpPt(c0KL, c1KL, tL);
        if (hasLeftWall) {
          c1WB = lerpPt(c0WB, c1WB, tL);
          c1WBar = lerpPt(c0WBar, c1WBar, tL);
          c1WT = lerpPt(c0WT, c1WT, tL);
        }
        terminateAfter = true;
      }
      if (c1R.camZ < nearPlane && c0R.camZ > nearPlane) {
        const tR = (nearPlane - c0R.camZ) / (c1R.camZ - c0R.camZ);
        c1R = lerpPt(c0R, c1R, tR);
        c1KR = lerpPt(c0KR, c1KR, tR);
        terminateAfter = true;
      }

      // Clamp any micro-discrepancies to nearPlane
      c0L.camZ = Math.max(nearPlane, c0L.camZ);
      c0R.camZ = Math.max(nearPlane, c0R.camZ);
      c0KL.camZ = Math.max(nearPlane, c0KL.camZ);
      c0KR.camZ = Math.max(nearPlane, c0KR.camZ);
      c1L.camZ = Math.max(nearPlane, c1L.camZ);
      c1R.camZ = Math.max(nearPlane, c1R.camZ);
      c1KL.camZ = Math.max(nearPlane, c1KL.camZ);
      c1KR.camZ = Math.max(nearPlane, c1KR.camZ);
      if (hasLeftWall) {
        c0WB.camZ = Math.max(nearPlane, c0WB.camZ);
        c0WBar.camZ = Math.max(nearPlane, c0WBar.camZ);
        c0WT.camZ = Math.max(nearPlane, c0WT.camZ);
        c1WB.camZ = Math.max(nearPlane, c1WB.camZ);
        c1WBar.camZ = Math.max(nearPlane, c1WBar.camZ);
        c1WT.camZ = Math.max(nearPlane, c1WT.camZ);
      }

      // Project clipped points
      const p0Left = toScreen(c0L);
      const p0Right = toScreen(c0R);
      const p0KerbL = toScreen(c0KL);
      const p0KerbR = toScreen(c0KR);

      const p1Left = toScreen(c1L);
      const p1Right = toScreen(c1R);
      const p1KerbL = toScreen(c1KL);
      const p1KerbR = toScreen(c1KR);

      const p0WallBase = hasLeftWall ? toScreen(c0WB) : undefined;
      const p1WallBase = hasLeftWall ? toScreen(c1WB) : undefined;
      const p0WallBarrier = hasLeftWall ? toScreen(c0WBar) : undefined;
      const p1WallBarrier = hasLeftWall ? toScreen(c1WBar) : undefined;
      const p0WallTop = hasLeftWall ? toScreen(c0WT) : undefined;
      const p1WallTop = hasLeftWall ? toScreen(c1WT) : undefined;

      const depthZ = (c0L.camZ + c1L.camZ) * 0.5;

      this.renderedSegments.push({
        segment: seg,
        p0Left,
        p0Right,
        p1Left,
        p1Right,
        p0KerbL,
        p0KerbR,
        p1KerbL,
        p1KerbR,
        hasLeftWall,
        p0WallBase,
        p1WallBase,
        p0WallBarrier,
        p1WallBarrier,
        p0WallTop,
        p1WallTop,
        wallH0,
        wallH1,
        depthZ,
        clipY: screenH,
        occluded: false,
      });

      if (terminateAfter) break;
    }

    if (this.renderedSegments.length === 0) return;

    // 2. Perform Crest Occlusion Analysis (Front to Back)
    let minHorizonY = screenH;
    for (let i = 0; i < this.renderedSegments.length; i++) {
      const rs = this.renderedSegments[i];
      const topY = (rs.p1Left.y + rs.p1Right.y) * 0.5;

      if (topY >= minHorizonY) {
        // Drops below foreground crest: occluded!
        rs.occluded = true;
        rs.clipY = minHorizonY;
      } else {
        rs.occluded = false;
        rs.clipY = topY;
        minHorizonY = topY;
      }
    }

    // 3. Environment Ground Fill (Lower half of screen)
    const currentEnv = this.renderedSegments[0]?.segment.environment || 'lower';
    let baseGrass = '#b89047';
    if (currentEnv === 'mountain_camp' || currentEnv === 'skyline') baseGrass = '#3d5c28';
    else if (currentEnv === 'rock_cutting') baseGrass = '#70381e';
    else if (currentEnv === 'pit') baseGrass = '#334155';

    ctx.fillStyle = baseGrass;
    ctx.fillRect(0, horizonY, screenW, screenH - horizonY);

    // 4. Render Segments (Back to Front)
    for (let i = this.renderedSegments.length - 1; i >= 0; i--) {
      const rs = this.renderedSegments[i];
      if (rs.occluded) continue;

      const seg = rs.segment;
      const isAlt = (seg.id % 2) === 0;

      // Palette
      let grassColor = isAlt ? '#b89047' : '#ab843e';
      let roadColor = isAlt ? '#2e323b' : '#262930';

      if (seg.environment === 'mountain_camp' || seg.environment === 'skyline') {
        grassColor = isAlt ? '#476930' : '#3d5c28';
      } else if (seg.environment === 'rock_cutting') {
        grassColor = isAlt ? '#8c4b2d' : '#70381e';
      } else if (seg.environment === 'pit') {
        grassColor = isAlt ? '#475569' : '#334155';
      }

      // Draw local grass verges on left and right seamlessly out to screen bounds
      ctx.fillStyle = grassColor;
      ctx.beginPath();
      ctx.moveTo(0, rs.p0KerbL.y);
      ctx.lineTo(rs.p0KerbL.x, rs.p0KerbL.y);
      ctx.lineTo(rs.p1KerbL.x, rs.p1KerbL.y);
      ctx.lineTo(0, rs.p1KerbL.y);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(rs.p0KerbR.x, rs.p0KerbR.y);
      ctx.lineTo(screenW, rs.p0KerbR.y);
      ctx.lineTo(screenW, rs.p1KerbR.y);
      ctx.lineTo(rs.p1KerbR.x, rs.p1KerbR.y);
      ctx.closePath();
      ctx.fill();

      // Draw Left Flanking Wall (The Cutting sheer rock face and safety barrier)
      if (
        rs.hasLeftWall &&
        rs.p0WallBase &&
        rs.p1WallBase &&
        rs.p0WallTop &&
        rs.p1WallTop &&
        rs.p0WallBarrier &&
        rs.p1WallBarrier &&
        rs.p0WallBase.visible &&
        rs.p1WallBase.visible
      ) {
        this.drawLeftCuttingWall(ctx, rs, screenW, isAlt);
      }

      // Draw Rumble Kerbs (red and white)
      const kerbAlt = (seg.id % 4) < 2;
      const kerbColor = kerbAlt ? '#d90429' : '#ffffff';
      ctx.fillStyle = kerbColor;

      // Left kerb
      ctx.beginPath();
      ctx.moveTo(rs.p0KerbL.x, rs.p0KerbL.y);
      ctx.lineTo(rs.p0Left.x, rs.p0Left.y);
      ctx.lineTo(rs.p1Left.x, rs.p1Left.y);
      ctx.lineTo(rs.p1KerbL.x, rs.p1KerbL.y);
      ctx.closePath();
      ctx.fill();

      // Right kerb
      ctx.beginPath();
      ctx.moveTo(rs.p0Right.x, rs.p0Right.y);
      ctx.lineTo(rs.p0KerbR.x, rs.p0KerbR.y);
      ctx.lineTo(rs.p1KerbR.x, rs.p1KerbR.y);
      ctx.lineTo(rs.p1Right.x, rs.p1Right.y);
      ctx.closePath();
      ctx.fill();

      // Draw Main Road Surface Quad
      ctx.fillStyle = roadColor;
      ctx.beginPath();
      ctx.moveTo(rs.p0Left.x, rs.p0Left.y);
      ctx.lineTo(rs.p0Right.x, rs.p0Right.y);
      ctx.lineTo(rs.p1Right.x, rs.p1Right.y);
      ctx.lineTo(rs.p1Left.x, rs.p1Left.y);
      ctx.closePath();
      ctx.fill();

      // White edge lines
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1, 2.5 * (rs.p0Left.scale / (screenW * 0.5)));
      ctx.beginPath();
      ctx.moveTo(rs.p0Left.x, rs.p0Left.y);
      ctx.lineTo(rs.p1Left.x, rs.p1Left.y);
      ctx.moveTo(rs.p0Right.x, rs.p0Right.y);
      ctx.lineTo(rs.p1Right.x, rs.p1Right.y);
      ctx.stroke();


      // Finish line
      if (seg.id === 0) {
        this.drawFinishLine(ctx, rs);
      }

      // Wireframe overlay
      if (wireframe) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        ctx.strokeRect(rs.p0Left.x, rs.p0Left.y, rs.p0Right.x - rs.p0Left.x, 2);
      }
    }
  }

  private getCuttingWallHeight(s_m: number): number {
    if (s_m < 1440 || s_m > 1960) return 0;
    if (s_m < 1510) {
      // Approach to The Cutting: wall rises from barrier height (1.2m) to full cliff (7.8m)
      const t = (s_m - 1440) / 70;
      return 1.2 + 6.6 * t;
    }
    if (s_m <= 1920) {
      // Full sheer cutting cliff with natural rocky crest profile
      return 7.8 + Math.sin(s_m * 0.11) * 0.45;
    }
    // Exit into Reid Park: cliff steps down back to barrier height
    const t = (s_m - 1920) / 40;
    return 7.8 - 6.6 * t;
  }

  private drawLeftCuttingWall(
    ctx: CanvasRenderingContext2D,
    rs: RenderedSegment,
    screenW: number,
    isAlt: boolean
  ): void {
    const wb0 = rs.p0WallBase!;
    const wb1 = rs.p1WallBase!;
    const wbar0 = rs.p0WallBarrier!;
    const wbar1 = rs.p1WallBarrier!;
    const wt0 = rs.p0WallTop!;
    const wt1 = rs.p1WallTop!;

    // 1. Sheer Sandstone Rock Cutting (Upper section)
    const hasRock = (rs.wallH0 ?? 0) > 1.25 || (rs.wallH1 ?? 0) > 1.25;
    if (hasRock) {
      // Base sedimentary rock quad
      ctx.fillStyle = isAlt ? '#8f381c' : '#7b2e15';
      ctx.beginPath();
      ctx.moveTo(wbar0.x, wbar0.y);
      ctx.lineTo(wbar1.x, wbar1.y);
      ctx.lineTo(wt1.x, wt1.y);
      ctx.lineTo(wt0.x, wt0.y);
      ctx.closePath();
      ctx.fill();

      // Stratified horizontal rock layers
      const scaleRef = rs.p0Left.scale / (screenW * 0.5);
      const lineW = Math.max(1, 1.6 * scaleRef);

      // Layer 1: Warm ironstone band & fracture
      const f1 = 0.38;
      const x0_1 = wbar0.x + f1 * (wt0.x - wbar0.x);
      const y0_1 = wbar0.y + f1 * (wt0.y - wbar0.y);
      const x1_1 = wbar1.x + f1 * (wt1.x - wbar1.x);
      const y1_1 = wbar1.y + f1 * (wt1.y - wbar1.y);

      ctx.strokeStyle = '#431407';
      ctx.lineWidth = lineW;
      ctx.beginPath();
      ctx.moveTo(x0_1, y0_1);
      ctx.lineTo(x1_1, y1_1);
      ctx.stroke();

      // Layer 2: Sunlit terracotta shelf highlight
      const f2 = 0.68;
      const x0_2 = wbar0.x + f2 * (wt0.x - wbar0.x);
      const y0_2 = wbar0.y + f2 * (wt0.y - wbar0.y);
      const x1_2 = wbar1.x + f2 * (wt1.x - wbar1.x);
      const y1_2 = wbar1.y + f2 * (wt1.y - wbar1.y);

      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = lineW;
      ctx.beginPath();
      ctx.moveTo(x0_2, y0_2);
      ctx.lineTo(x1_2, y1_2);
      ctx.stroke();

      // Sunlit cliff crest highlight
      ctx.strokeStyle = '#fdba74';
      ctx.lineWidth = Math.max(1, 2.0 * scaleRef);
      ctx.beginPath();
      ctx.moveTo(wt0.x, wt0.y);
      ctx.lineTo(wt1.x, wt1.y);
      ctx.stroke();

      // Australian native bush tufts along cliff top
      const bushR = 4.2 * scaleRef;
      if (bushR >= 1.5) {
        ctx.fillStyle = isAlt ? '#4d6b2c' : '#3f5622';
        ctx.beginPath();
        const midTopX = (wt0.x + wt1.x) * 0.5;
        const midTopY = (wt0.y + wt1.y) * 0.5;
        ctx.arc(midTopX, midTopY - bushR * 0.4, bushR, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 2. Concrete Safety Barrier (Lower section)
    ctx.fillStyle = isAlt ? '#cbd5e1' : '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(wb0.x, wb0.y);
    ctx.lineTo(wb1.x, wb1.y);
    ctx.lineTo(wbar1.x, wbar1.y);
    ctx.lineTo(wbar0.x, wbar0.y);
    ctx.closePath();
    ctx.fill();

    // Dark base ground shadow strip
    const fBase = 0.22;
    const bBaseX0 = wb0.x + fBase * (wbar0.x - wb0.x);
    const bBaseY0 = wb0.y + fBase * (wbar0.y - wb0.y);
    const bBaseX1 = wb1.x + fBase * (wbar1.x - wb1.x);
    const bBaseY1 = wb1.y + fBase * (wbar1.y - wb1.y);
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(wb0.x, wb0.y);
    ctx.lineTo(wb1.x, wb1.y);
    ctx.lineTo(bBaseX1, bBaseY1);
    ctx.lineTo(bBaseX0, bBaseY0);
    ctx.closePath();
    ctx.fill();

    // Red safety barrier top cap
    const barScale = rs.p0Left.scale / (screenW * 0.5);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = Math.max(1, 2.0 * barScale);
    ctx.beginPath();
    ctx.moveTo(wbar0.x, wbar0.y);
    ctx.lineTo(wbar1.x, wbar1.y);
    ctx.stroke();

    // Vertical barrier expansion joint
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(wb0.x, wb0.y);
    ctx.lineTo(wbar0.x, wbar0.y);
    ctx.stroke();
  }

  private drawFinishLine(ctx: CanvasRenderingContext2D, rs: RenderedSegment): void {
    const checks = 12;
    for (let c = 0; c < checks; c++) {
      const t0 = c / checks;
      const t1 = (c + 1) / checks;
      const x00 = rs.p0Left.x + t0 * (rs.p0Right.x - rs.p0Left.x);
      const y00 = rs.p0Left.y + t0 * (rs.p0Right.y - rs.p0Left.y);
      const x01 = rs.p0Left.x + t1 * (rs.p0Right.x - rs.p0Left.x);
      const y01 = rs.p0Left.y + t1 * (rs.p0Right.y - rs.p0Left.y);

      const x10 = rs.p1Left.x + t0 * (rs.p1Right.x - rs.p1Left.x);
      const y10 = rs.p1Left.y + t0 * (rs.p1Right.y - rs.p1Left.y);
      const x11 = rs.p1Left.x + t1 * (rs.p1Right.x - rs.p1Left.x);
      const y11 = rs.p1Left.y + t1 * (rs.p1Right.y - rs.p1Left.y);

      ctx.fillStyle = c % 2 === 0 ? '#ffffff' : '#111111';
      ctx.beginPath();
      ctx.moveTo(x00, y00);
      ctx.lineTo(x01, y01);
      ctx.lineTo(x11, y11);
      ctx.lineTo(x10, y10);
      ctx.closePath();
      ctx.fill();
    }
  }
}
