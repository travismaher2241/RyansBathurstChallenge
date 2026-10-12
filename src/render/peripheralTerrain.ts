import { Camera } from './camera';
import { TrackManager } from '../track/trackManager';

/** A backdrop beneath scenery, drawn BEFORE the unchanged road renderer. */
export function renderPeripheralTerrain(
  _ctx: CanvasRenderingContext2D, _track: TrackManager, _camera: Camera,
  _width: number, _height: number, _horizon: number, _exaggeration: number,
): void {
  // Extruding 180m lateral polygons along a tightly winding mountain circuit causes
  // elevated uphill road segments ahead (e.g. The Cutting at +60m elevation) to project
  // inverted quads directly across the sky, appearing as a false roof over the track.
  // The sky and distant ranges are rendered cleanly by SkyRenderer, and the road and
  // verges by RoadRenderer.
}
