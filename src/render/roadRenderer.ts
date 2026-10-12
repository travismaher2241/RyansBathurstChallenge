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

      // Project clipped points
      const p0Left = toScreen(c0L);
      const p0Right = toScreen(c0R);
      const p0KerbL = toScreen(c0KL);
      const p0KerbR = toScreen(c0KR);

      const p1Left = toScreen(c1L);
      const p1Right = toScreen(c1R);
      const p1KerbL = toScreen(c1KL);
      const p1KerbR = toScreen(c1KR);

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
