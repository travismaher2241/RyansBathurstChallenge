import { TrackManager } from '../track/trackManager';
import { SceneryItem } from '../types/track';

/** Render-only, estimated scenery. Never inserted into the track/physics data. */
export interface SceneryDetail extends SceneryItem {
  detail?: boolean;
  eventOnly?: boolean;
}

export function createSceneryDetail(track: TrackManager): SceneryDetail[] {
  const result: SceneryDetail[] = [];
  let seed = 1938;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const add = (key: string, s: number, offset: number, width: number, height: number, eventOnly = false) => {
    const p = track.sample(s);
    const east = p.east_m + p.normalE * offset;
    const north = p.north_m + p.normalN * offset;
    // Keep the entire billboard footprint clear of EVERY road segment, not just
    // its anchor. Important on the tightly folded mountain and near pit entry.
    for (const segment of track.segments) {
      const dx = segment.east_end_m - segment.east_start_m;
      const dy = segment.north_end_m - segment.north_start_m;
      const t = Math.max(0, Math.min(1, ((east - segment.east_start_m) * dx +
        (north - segment.north_start_m) * dy) / (dx * dx + dy * dy || 1)));
      const distance = Math.hypot(east - segment.east_start_m - t * dx, north - segment.north_start_m - t * dy);
      if (distance < segment.road_width_m / 2 + width / 2 + 5) return;
    }
    result.push({
      id: `detail_${result.length}`, name: key, sprite_key: key,
      s_m: p.s_m, offset_right_m: offset, game_east_m: east, game_north_m: north,
      width_m_estimate: width, height_m_estimate: height,
      collidable: false, detail: true, eventOnly,
    });
  };

  // Deliberate clearings break up the tree line. The open rural straights and
  // Skyline must not turn into forest tunnels. Coordinates are artistic estimates.
  const zones = [
    { start: 330, end: 1490, step: 34, density: 0.40, near: 30, spread: 70 },
    { start: 1530, end: 1950, step: 22, density: 0.78, near: 23, spread: 38 },
    { start: 1960, end: 3100, step: 21, density: 0.82, near: 24, spread: 65 },
    { start: 3120, end: 3500, step: 36, density: 0.35, near: 35, spread: 40 },
    { start: 3520, end: 3840, step: 25, density: 0.70, near: 25, spread: 50 },
    { start: 3860, end: 5010, step: 42, density: 0.32, near: 35, spread: 90 },
    { start: 5070, end: 5860, step: 55, density: 0.25, near: 50, spread: 80 },
  ];
  for (const zone of zones) {
    for (let s = zone.start; s < zone.end; s += zone.step) {
      for (const side of [-1, 1]) {
        if (random() > zone.density) continue;
        const anchor = s + random() * 14;
        const offset = side * (zone.near + random() * zone.spread);
        const count = 2 + Math.floor(random() * 3);
        for (let i = 0; i < count; i++) {
          const variant = Math.floor(random() * 8);
          add(`gum_${variant}`, anchor + i * 8, offset + side * random() * 14,
            7 + random() * 6, 11 + random() * 10);
        }
        add('dry_scrub', anchor + 4, offset * 0.8, 5, 2.1);
      }
    }
  }

  // Vineyard on the inside of Griffin's; orchard alongside rural Conrod.
  for (let s = 1120; s < 1460; s += 22) {
    for (const offset of [-42, -57, -72]) add('vine_row', s, offset, 13, 2.2);
  }
  for (let s = 4180; s < 4590; s += 26) {
    for (const offset of [-55, -75]) add('orchard_tree', s, offset, 6, 5);
  }
  for (const s of [540, 830, 1030, 4060, 4730]) {
    add('country_house', s, s < 1500 ? 78 : -95, 16, 6);
  }
  // Rock banks stand behind the existing barriers. Their uneven silhouettes
  // provide slope without modifying the road mesh or its elevation.
  for (let s = 1550; s < 1940; s += 24) {
    add('cutting_bank', s, 27, 20, 8 + random() * 5);
    if (s % 48 < 24) add('dry_scrub', s + 3, 32, 6, 3);
  }
  // Permanent clearings, with a separate race-weekend dressing layer.
  for (let s = 2020; s < 3100; s += 39) {
    const side = s < 2700 ? 1 : -1;
    add('caravan', s, side * (43 + random() * 28), 6.2, 3.1, true);
    add(`dome_${Math.floor(random() * 3)}`, s + 11, side * (30 + random() * 20), 4.3, 2.3, true);
    add('camp_ute', s + 19, side * 62, 5, 2, true);
    add('spectators', s + 8, side * 21, 5, 1.9, true);
  }
  // Small repeated modules give the venues length along the road, rather than
  // stretching a single camera-facing billboard across the racing surface.
  for (let s = 6020; s < 6290; s += 23) {
    add('detail_pit', s, -33, 24, 7);
    add('detail_stand', s, 42, 23, 10, true);
    add('detail_paddock', s, -85, 25, 6);
  }
  for (let s = 5450; s <= 5550; s += 23) add('detail_hotel', s, 85, 25, 12);
  return result;
}

/** Sorted once, queried with binary search. Supports start-line wrapping. */
export class SceneryIndex {
  private items: SceneryDetail[];
  constructor(items: SceneryDetail[], private lapLength: number) {
    this.items = [...items].sort((a, b) => a.s_m - b.s_m);
  }
  ahead(s: number, distance: number): SceneryDetail[] {
    const start = ((s % this.lapLength) + this.lapLength) % this.lapLength;
    let low = 0, high = this.items.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (this.items[mid].s_m < start) low = mid + 1; else high = mid;
    }
    const result: SceneryDetail[] = [];
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[(low + i) % this.items.length];
      const ahead = (item.s_m - start + this.lapLength) % this.lapLength;
      if (ahead >= distance) break;
      result.push(item);
    }
    return result;
  }
}
