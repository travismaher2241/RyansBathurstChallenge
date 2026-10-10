export const wrap = (s, length) => ((s % length) + length) % length;
export async function loadTrack(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Track load failed: ${response.status}`);
  const track = await response.json();
  if (track.metadata.lap_length_m !== 6213) throw new Error('Unexpected lap length');
  return track;
}
export function sampleRoad(track, distanceMetres) {
  const s = wrap(distanceMetres, track.metadata.lap_length_m);
  const segment = track.segments[Math.min(Math.floor(s / 5), track.segments.length - 1)];
  const t = (s - segment.s_start_m) / segment.length_m;
  const lerp = (a, b) => a + t * (b - a);
  return {
    s_m: s, segment_id: segment.id, fraction: t,
    height_m: lerp(segment.height_start_m, segment.height_end_m),
    elevation_m: lerp(segment.elevation_start_m, segment.elevation_end_m),
    east_m: lerp(segment.east_start_m, segment.east_end_m),
    north_m: lerp(segment.north_start_m, segment.north_end_m),
    curvature_right_per_m: segment.curvature_right_per_m,
    gradient_percent: segment.gradient_percent,
    width_m: segment.road_width_m, area: segment.area,
    environment: segment.environment,
  };
}
export function objectsAhead(track, distanceMetres, lookaheadMetres = 800) {
  const length = track.metadata.lap_length_m;
  const start = wrap(distanceMetres, length);
  return track.scenery.map(object => ({ ...object, ahead_m: wrap(object.s_m - start, length) }))
    .filter(object => object.ahead_m < lookaheadMetres)
    .sort((a, b) => a.ahead_m - b.ahead_m);
}
