import { TrackData, Segment, SceneryItem } from '../types/track';
import { TRACK_LAP_LENGTH_M } from '../config/gameConfig';
import { wrap, lerp } from '../utils/math';

export interface SampledPoint {
  s_m: number;
  segmentId: number;
  fraction: number;
  east_m: number;
  north_m: number;
  height_m: number;
  elevation_m: number;
  headingRad: number; // Clockwise from North in world coords
  tangentE: number;
  tangentN: number;
  normalE: number;    // Pointing right of race direction
  normalN: number;
  roadWidth_m: number;
  curvature: number;  // + right, - left
  gradientPercent: number;
  area: string;
  environment: string;
  rumbleColour: string;
}

export class TrackManager {
  public readonly trackData: TrackData;
  public readonly lapLength: number;
  public readonly segments: Segment[];
  public readonly scenery: SceneryItem[];

  constructor(trackData: TrackData) {
    this.trackData = trackData;
    this.lapLength = trackData.metadata.lap_length_m;
    if (this.lapLength !== TRACK_LAP_LENGTH_M) {
      console.warn(`Lap length mismatch: expected ${TRACK_LAP_LENGTH_M}, got ${this.lapLength}`);
    }
    this.segments = trackData.segments;
    this.scenery = [...(trackData.scenery || [])];
    this.injectBrakingMarkers();
  }

  private injectBrakingMarkers(): void {
    const brakeBoards: { s_m: number; distLabel: '300' | '200' | '100'; side: 'left' | 'right' }[] = [
      // Hell Corner (end of Pit Straight)
      { s_m: 103, distLabel: '100', side: 'right' },

      // Griffin's Bend (end of Mountain Straight)
      { s_m: 1004, distLabel: '300', side: 'left' },
      { s_m: 1104, distLabel: '200', side: 'left' },
      { s_m: 1204, distLabel: '100', side: 'left' },

      // The Cutting
      { s_m: 1613, distLabel: '100', side: 'right' },

      // Forrest's Elbow
      { s_m: 3601, distLabel: '100', side: 'right' },

      // The Chase (end of Conrod Straight - ~295 km/h)
      { s_m: 4779, distLabel: '300', side: 'right' },
      { s_m: 4879, distLabel: '200', side: 'right' },
      { s_m: 4979, distLabel: '100', side: 'right' },

      // Murray's Corner
      { s_m: 5708, distLabel: '200', side: 'right' },
      { s_m: 5808, distLabel: '100', side: 'right' },
    ];

    for (const b of brakeBoards) {
      const sample = this.sample(b.s_m);
      const roadW = sample.roadWidth_m;
      const offset = (b.side === 'right') ? (roadW * 0.5 + 2.4) : -(roadW * 0.5 + 2.4);
      const east = sample.east_m + sample.normalE * offset;
      const north = sample.north_m + sample.normalN * offset;

      this.scenery.push({
        id: `brake_board_${b.s_m}_${b.distLabel}`,
        name: `${b.distLabel}m Braking Marker`,
        sprite_key: `brake_board_${b.distLabel}`,
        s_m: b.s_m,
        offset_right_m: offset,
        game_east_m: east,
        game_north_m: north,
        width_m_estimate: 2.2,
        height_m_estimate: 2.2,
        collidable: false,
      });
    }
  }

  public getSegmentIndex(s_m: number): number {
    const s = wrap(s_m, this.lapLength);
    const idx = Math.floor(s / 5);
    return Math.min(idx, this.segments.length - 1);
  }

  public getSegment(s_m: number): Segment {
    return this.segments[this.getSegmentIndex(s_m)];
  }

  public sample(s_m: number, heightExaggeration: number = 1.0): SampledPoint {
    const s = wrap(s_m, this.lapLength);
    const segIdx = this.getSegmentIndex(s);
    const seg = this.segments[segIdx];
    const t = (s - seg.s_start_m) / seg.length_m;

    const east = lerp(seg.east_start_m, seg.east_end_m, t);
    const north = lerp(seg.north_start_m, seg.north_end_m, t);
    const rawHeight = lerp(seg.height_start_m, seg.height_end_m, t);
    const height = rawHeight * heightExaggeration;
    const elevation = lerp(seg.elevation_start_m, seg.elevation_end_m, t);

    // Tangent from start to end of segment
    const dE = seg.east_end_m - seg.east_start_m;
    const dN = seg.north_end_m - seg.north_start_m;
    const len = Math.hypot(dE, dN) || 1;
    const tangentE = dE / len;
    const tangentN = dN / len;

    const headingRad = Math.atan2(tangentE, tangentN);
    // Normal to the right of race direction
    const normalE = Math.cos(headingRad);
    const normalN = -Math.sin(headingRad);

    return {
      s_m: s,
      segmentId: seg.id,
      fraction: t,
      east_m: east,
      north_m: north,
      height_m: height,
      elevation_m: elevation,
      headingRad: headingRad,
      tangentE: tangentE,
      tangentN: tangentN,
      normalE: normalE,
      normalN: normalN,
      roadWidth_m: seg.road_width_m,
      curvature: seg.curvature_right_per_m,
      gradientPercent: seg.gradient_percent,
      area: seg.area,
      environment: seg.environment,
      rumbleColour: seg.rumble_colour,
    };
  }

  public getSceneryAhead(s_m: number, lookaheadM: number = 600): (SceneryItem & { ahead_m: number })[] {
    const start = wrap(s_m, this.lapLength);
    const results: (SceneryItem & { ahead_m: number })[] = [];
    for (let i = 0; i < this.scenery.length; i++) {
      const item = this.scenery[i];
      const ahead = wrap(item.s_m - start, this.lapLength);
      if (ahead < lookaheadM) {
        results.push({ ...item, ahead_m: ahead });
      }
    }
    results.sort((a, b) => a.ahead_m - b.ahead_m);
    return results;
  }
}

export async function loadTrackData(url: string = './data/track.json'): Promise<TrackManager> {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Failed to load track data from ${url}: HTTP ${resp.status}`);
  }
  const data: TrackData = await resp.json();
  if (data.segments.length !== 1243) {
    console.warn(`Expected 1243 segments, loaded ${data.segments.length}`);
  }
  return new TrackManager(data);
}
