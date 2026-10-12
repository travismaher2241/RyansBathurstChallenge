import { Camera, ProjectedPoint } from './camera';
import { SpriteGenerator } from './spriteGenerator';
import { SceneryItem } from '../types/track';
import { TrackManager } from '../track/trackManager';
import { RenderedSegment } from './roadRenderer';
import { createRenderScenery, SceneryIndex } from './sceneryDetail';

export interface DrawableObject {
  type: 'scenery' | 'car';
  depthZ: number;
  screenX: number;
  screenY: number; // Base position (bottom center)
  width: number;
  height: number;
  canvas: HTMLCanvasElement;
  clipY: number;
  collidable?: boolean;
}

export class SceneryRenderer {
  public drawables: DrawableObject[] = [];
  public showRaceWeekend: boolean = true;
  private indexes = new WeakMap<TrackManager, SceneryIndex>();
  private wallOccluders: { points: ProjectedPoint[]; depth: number; left: number; right: number; top: number; bottom: number }[] = [];

  public prepareScenery(
    track: TrackManager,
    camera: Camera,
    spriteGen: SpriteGenerator,
    screenW: number,
    screenH: number,
    horizonY: number,
    renderedSegments: RenderedSegment[],
    elevationExaggeration: number = 1.0
  ): void {
    this.drawables.length = 0;
    this.wallOccluders.length = 0;

    // Build quick lookup for segment occlusion and clip horizons
    const occludedBySegId = new Map<number, boolean>();
    const clipYBySegId = new Map<number, number>();
    for (const rs of renderedSegments) {
      occludedBySegId.set(rs.segment.id, rs.occluded);
      clipYBySegId.set(rs.segment.id, rs.clipY);
      if (!rs.occluded && rs.hasLeftWall && rs.p0WallBase && rs.p1WallBase && rs.p0WallTop && rs.p1WallTop) {
        const points = [rs.p0WallBase, rs.p1WallBase, rs.p1WallTop, rs.p0WallTop];
        this.wallOccluders.push({ points, depth: Math.max(rs.p0WallBase.depthZ, rs.p1WallBase.depthZ),
          left: Math.min(...points.map(p => p.x)), right: Math.max(...points.map(p => p.x)),
          top: Math.min(...points.map(p => p.y)), bottom: Math.max(...points.map(p => p.y)) });
      }
    }

    let index = this.indexes.get(track);
    if (!index) {
      index = new SceneryIndex(createRenderScenery(track), track.lapLength);
      this.indexes.set(track, index);
    }
    const visibleScenery = index.ahead(camera.s_m, 500);

    for (const item of visibleScenery) {
      if (item.eventOnly && !this.showRaceWeekend) continue;
      // Ignore road markings (already drawn on road surface) and placement cue markers
      if (item.sprite_key === 'road_line' || item.sprite_key === 'crest_marker' || item.sprite_key === 'vista') {
        continue;
      }

      // Determine height
      const sample = track.sample(item.s_m, elevationExaggeration);
      const segId = sample.segmentId;

      // If the road segment is occluded by a hill in front of it, skip
      if (occludedBySegId.get(segId) === true || !clipYBySegId.has(segId)) {
        continue;
      }

      const worldH = sample.height_m;
      const worldE = item.game_east_m;
      const worldN = item.game_north_m;

      const proj = camera.project(worldE, worldN, worldH, screenW, screenH, horizonY);
      if (!proj.visible || proj.depthZ <= camera.nearPlane) continue;

      // Pick corresponding sprite
      let spriteKey = item.sprite_key;
      let sprite = spriteGen.scenerySprites[spriteKey];

      if (!sprite) {
        if (spriteKey.includes('barrier')) {
          sprite = spriteGen.scenerySprites['barrier'];
        } else if (spriteKey.includes('tent') || spriteKey.includes('camp')) {
          sprite = spriteGen.scenerySprites['camp_tent'];
        } else if (spriteKey.includes('tree') || spriteKey.includes('eucalyptus')) {
          sprite = spriteGen.scenerySprites['eucalyptus'];
        } else {
          sprite = spriteGen.scenerySprites['bush'];
        }
      }
      if (!sprite) continue;

      // Scale sprite based on realistic Bathurst circuit dimensions (in metres)
      let worldW = item.width_m_estimate || 4.0;
      let worldH_est = item.height_m_estimate || 4.0;

      if (item.detail) {
        // Detail artwork has explicit world dimensions, including low orchard trees.
      } else if (spriteKey === 'pit_building') {
        worldW = 28.0;
        worldH_est = 7.0;
      } else if (spriteKey === 'grandstand') {
        worldW = 22.0;
        worldH_est = 10.0;
      } else if (spriteKey === 'paddock') {
        worldW = 20.0;
        worldH_est = 6.5;
      } else if (spriteKey === 'bridge') {
        worldW = 24.0;
        worldH_est = 7.5;
      } else if (spriteKey === 'hillside_sign') {
        worldW = 85.0;
        worldH_est = 18.0;
      } else if (spriteKey === 'hotel') {
        worldW = 18.0;
        worldH_est = 12.0;
      } else if (spriteKey === 'rock_face') {
        worldW = Math.min(32, Math.max(14, worldW));
        worldH_est = Math.min(18, Math.max(8, worldH_est));
      } else if (spriteKey.includes('barrier')) {
        worldW = 8.0;
        worldH_est = 1.3;
      } else if (spriteKey.includes('brake_board')) {
        worldW = 2.2;
        worldH_est = 2.2;
      } else if (spriteKey.includes('tree') || spriteKey.includes('eucalyptus')) {
        worldW = Math.min(10, Math.max(5, worldW));
        worldH_est = Math.min(18, Math.max(8, worldH_est));
      } else if (spriteKey.includes('tent')) {
        worldW = 4.2;
        worldH_est = 2.8;
      }

      // True 3D perspective scale: 1 metre = proj.scale pixels on screen
      const destW = Math.max(2, worldW * proj.scale);
      const destH = Math.max(2, worldH_est * proj.scale);
      if (proj.x + destW / 2 < 0 || proj.x - destW / 2 > screenW) continue;
      const clipY = clipYBySegId.get(segId) ?? screenH;

      this.drawables.push({
        type: 'scenery',
        depthZ: proj.depthZ,
        screenX: proj.x,
        screenY: proj.y,
        width: destW,
        height: destH,
        canvas: sprite,
        clipY: clipY,
        collidable: item.collidable,
      });
    }
  }

  public addCarDrawable(
    depthZ: number,
    screenX: number,
    screenY: number,
    width: number,
    height: number,
    canvas: HTMLCanvasElement,
    clipY: number
  ): void {
    this.drawables.push({
      type: 'car',
      depthZ,
      screenX,
      screenY,
      width,
      height,
      canvas,
      clipY,
    });
  }

  public render(ctx: CanvasRenderingContext2D): void {
    // Sort all drawables back to front (largest depthZ first)
    this.drawables.sort((a, b) => b.depthZ - a.depthZ);

    for (const obj of this.drawables) {
      const x = Math.round(obj.screenX - obj.width * 0.5);
      const y = Math.round(obj.screenY - obj.height);
      const w = Math.round(obj.width);
      let h = Math.round(obj.height);

      if (w <= 0 || h <= 0) continue;

      // Clip bottom if below clipY (occluded by hill)
      const bottom = y + h;
      if (bottom > obj.clipY + 8) {
        h = Math.max(0, Math.round(obj.clipY + 8 - y));
        if (h <= 0) continue;
      }

      const sw = obj.canvas.width;
      const sh = Math.max(1, Math.min(obj.canvas.height, Math.round((h / obj.height) * obj.canvas.height)));
      if (sw <= 0 || sh <= 0 || w <= 0 || h <= 0) continue;

      // Subtract nearer wall faces from the sprite's clip region. This preserves
      // branches above the cliff and objects in front of it, while hiding those
      // behind. Apply each face separately so overlapping faces cannot cancel.
      const walls = this.wallOccluders.filter(wall => wall.depth < obj.depthZ &&
        wall.right > x && wall.left < x + w && wall.bottom > y && wall.top < y + h);
      if (walls.length) {
        ctx.save();
        for (const wall of walls) {
          ctx.beginPath(); ctx.rect(x, y, w, h);
          wall.points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
          ctx.closePath(); ctx.clip('evenodd');
        }
      }
      try {
        ctx.drawImage(
          obj.canvas,
          0, 0, sw, sh,
          x, y, w, h
        );
      } catch (e) {
        // Ignore any edge clipping anomalies
      } finally {
        if (walls.length) ctx.restore();
      }
    }
  }
}
