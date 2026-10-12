const fs = require('fs');
require('./scripts/register-typescript.cjs');
const { wrap } = require('./src/utils/math.ts');

console.log('=== RUNNING BATHURST ARCADE VERIFICATION SUITE ===\n');

// 1. Data Verification
const track = JSON.parse(fs.readFileSync('data/track.json', 'utf8'));

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

// Check Lap length
assert(track.metadata.lap_length_m === 6213, 'Lap length is exactly 6,213 m');
assert(track.segments.length === 1243, 'Total segment count is 1,243');

// Check first 1242 are 5m, last is 3m
let segs5m = 0;
let lastSegLen = 0;
for (let i = 0; i < track.segments.length; i++) {
  const seg = track.segments[i];
  if (i < 1242) {
    if (seg.length_m === 5) segs5m++;
  } else {
    lastSegLen = seg.length_m;
  }
}
assert(segs5m === 1242, 'First 1,242 segments are 5 m long');
assert(lastSegLen === 3, 'Final segment is 3 m long');

// Check segment length sum
const totalLen = track.segments.reduce((acc, s) => acc + s.length_m, 0);
assert(totalLen === 6213, `Total segment length sum is ${totalLen} m`);

// Check track closure
const lastSeg = track.segments[1242];
const closureE = Math.abs(lastSeg.east_end_m - 0.0);
const closureN = Math.abs(lastSeg.north_end_m - 0.0);
assert(closureE < 1e-4 && closureN < 1e-4, 'Track coordinates close at (0, 0)');

// Check elevation relief
let minH = Infinity, maxH = -Infinity;
for (const s of track.segments) {
  minH = Math.min(minH, s.elevation_start_m, s.elevation_end_m);
  maxH = Math.max(maxH, s.elevation_start_m, s.elevation_end_m);
}
const relief = maxH - minH;
assert(Math.abs(relief - 174.08) < 1.0, `Elevation relief is approx 174m (actual: ${relief.toFixed(2)}m)`);

// Check key turn directions
function getSegAt(s) {
  const idx = Math.min(Math.floor(s / 5), 1242);
  return track.segments[idx];
}

const hell = getSegAt(240);
assert(hell.turn_radians < 0, `Hell Corner turns left (turn_rad: ${hell.turn_radians.toFixed(4)})`);

const griffins = getSegAt(1400);
assert(griffins.turn_radians > 0, `Griffin's Bend turns right (turn_rad: ${griffins.turn_radians.toFixed(4)})`);

const cutting = getSegAt(1800);
assert(cutting.turn_radians < 0, `The Cutting turns left (turn_rad: ${cutting.turn_radians.toFixed(4)})`);

const murrays = getSegAt(5950);
assert(murrays.turn_radians < 0, `Murray's Corner turns left (turn_rad: ${murrays.turn_radians.toFixed(4)})`);

// Check non-NaN projection values
let nanFound = false;
for (const s of track.segments) {
  if (isNaN(s.east_start_m) || isNaN(s.north_start_m) || isNaN(s.height_start_m) ||
      isNaN(s.east_end_m) || isNaN(s.north_end_m) || isNaN(s.height_end_m)) {
    nanFound = true;
    break;
  }
}
assert(!nanFound, 'No NaN or invalid values in road segments');

// Check modulo 6213 wrapping
assert(wrap(6213, 6213) === 0, '6213 wraps to 0');
assert(wrap(6214, 6213) === 1, '6214 wraps to 1');
assert(wrap(-1, 6213) === 6212, '-1 wraps to 6212');

console.log(`Geometry checks: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
require('./scripts/test-gameplay.cjs');
require('./scripts/test-scenery.cjs');
