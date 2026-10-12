import { Camera } from './camera';
import { TrackManager } from '../track/trackManager';

/** A backdrop beneath scenery, drawn BEFORE the unchanged road renderer. */
export function renderPeripheralTerrain(
  ctx: CanvasRenderingContext2D, track: TrackManager, camera: Camera,
  width: number, height: number, horizon: number, exaggeration: number,
): void {
  // Only the rising ground above the screen horizon needs this backdrop:
  // the existing road renderer already fills the foreground below it.
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, width, horizon); ctx.clip();
  for (let ahead = 500; ahead >= 10; ahead -= 10) {
    const near = track.sample(camera.s_m + ahead, exaggeration);
    const far = track.sample(camera.s_m + ahead + 10, exaggeration);
    const mountain = ['mountain_camp', 'skyline', 'walled_descent'].includes(near.environment);
    const rocky = near.environment === 'rock_cutting';
    for (const side of [-1, 1]) {
      const points = [
        [near, side * (near.roadWidth_m / 2 + 1.5)],
        [far, side * (far.roadWidth_m / 2 + 1.5)],
        [far, side * 180],
        [near, side * 180],
      ] as const;
      const projected = points.map(([p, offset]) => camera.project(
        p.east_m + p.normalE * offset, p.north_m + p.normalN * offset,
        p.height_m, width, height, horizon,
      ));
      // Do not create enormous inverted polygons across the near plane.
      if (projected.some(p => !p.visible)) continue;
      ctx.fillStyle = rocky ? '#8e836b' : mountain ? '#77815a' : '#aea16a';
      ctx.beginPath(); projected.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
}
