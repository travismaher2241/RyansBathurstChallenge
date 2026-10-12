import { GameSettings } from '../types/track';
export type { GameSettings };

export const TRACK_LAP_LENGTH_M = 6213;

export const DEFAULT_SETTINGS: GameSettings = {
  difficulty: 'arcade',
  transmission: 'auto',
  autoAccelerate: false,
  crtFilter: false,
  soundEnabled: true,
  musicVolume: 0.7,
  sfxVolume: 0.85,
  elevationExaggeration: 1.0, // Default 1.0 preserves true DEM profile
  drawDistanceM: 550,
};

const STORAGE_KEY_SETTINGS = 'bathurst_arcade_settings_v1';
const STORAGE_KEY_BEST_TIME_ARCADE = 'bathurst_arcade_best_time_arcade_v2';
const STORAGE_KEY_BEST_TIME_PRO = 'bathurst_arcade_best_time_pro_v2';

export function loadStoredSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Could not read stored settings', e);
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveStoredSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.warn('Could not save settings', e);
  }
}

export const MIN_VALID_LAP_TIME_SEC = 95.0; // Sub-1:35 is physically impossible on a 6,213m lap

export function loadBestLapTime(difficulty: 'arcade' | 'pro' = 'arcade'): number | null {
  try {
    const key = difficulty === 'pro' ? STORAGE_KEY_BEST_TIME_PRO : STORAGE_KEY_BEST_TIME_ARCADE;
    const raw = localStorage.getItem(key);
    if (raw) {
      const val = parseFloat(raw);
      if (Number.isFinite(val) && val >= MIN_VALID_LAP_TIME_SEC) {
        return val;
      } else {
        // Purge legacy corrupted impossible times (< 95s)
        localStorage.removeItem(key);
      }
    }
    // Also check and clean legacy key
    const legacyKey = 'bathurst_arcade_best_time_v1';
    const legacy = localStorage.getItem(legacyKey);
    if (legacy) {
      const val = parseFloat(legacy);
      if (Number.isFinite(val) && val >= MIN_VALID_LAP_TIME_SEC && difficulty === 'arcade') {
        return val;
      } else {
        localStorage.removeItem(legacyKey);
      }
    }
  } catch (e) {
    console.warn('Could not read best lap time', e);
  }
  return null;
}

export function saveBestLapTime(timeSec: number, difficulty: 'arcade' | 'pro' = 'arcade'): void {
  // Reject impossible lap times and invalid numbers
  if (!Number.isFinite(timeSec) || timeSec < MIN_VALID_LAP_TIME_SEC) {
    return;
  }
  try {
    const current = loadBestLapTime(difficulty);
    if (current === null || timeSec < current) {
      const key = difficulty === 'pro' ? STORAGE_KEY_BEST_TIME_PRO : STORAGE_KEY_BEST_TIME_ARCADE;
      localStorage.setItem(key, timeSec.toString());
    }
  } catch (e) {
    console.warn('Could not save best lap time', e);
  }
}

export const PHYSICS_CONFIG = {
  // Powertrain & Speed
  topSpeedMs: 82.5, // ~297 km/h on Conrod Straight
  reverseTopSpeedMs: 12.0,
  idleRpm: 1000,
  maxRpm: 8200,
  redlineRpm: 7500,
  gearRatios: [3.4, 2.2, 1.6, 1.25, 1.0, 0.82], // 6 speeds
  finalDrive: 3.45,
  gearTopSpeedsKmh: [75, 125, 175, 225, 268, 302],

  // Acceleration & Drag
  enginePowerHp: 580, // Classic Group A Sierra RS500 / V8 Supercar power
  massKg: 1320,
  dragCoefficient: 0.38,
  frontalAreaM2: 2.1,
  rollingResistance: 0.015,
  brakeDecelerationMs2: 13.5, // Strong, communicative braking
  handbrakeDecelMs2: 8.0,

  // Steering & Handling
  steerRate: 2.8, // Rad/s response
  steerReturnRate: 4.2, // Self-centering rate
  steerSensitivityLowSpeed: 1.0,
  steerSensitivityHighSpeed: 0.38, // Stabilize at 290 km/h

  // Grip Limits & Curvature Response
  // Lat accel = v^2 * abs(curvature). Normal touring car limits around 1.3 - 1.5 Gs (13 - 15 m/s2)
  maxGripLatAccelMs2Arcade: 16.5,
  maxGripLatAccelMs2Pro: 13.2,
  tyreScrubDragFactor: 0.6,
  slideRecoveryRate: 3.5,

  // Off-track grass/dirt penalty
  offRoadDragFactor: 1.85,
  offRoadMaxSpeedKmh: 120,

  // Collisions
  wallBounceRestitution: 0.3,
  carBounceRestitution: 0.45,
  wallScrapeDecel: 8.0,
};

export const CAMERA_CONFIG = {
  heightM: 1.55,
  distBehindM: 4.8,
  focalLength: 0.88,
  nearPlaneM: 1.0,
  lookaheadLeadM: 18.0, // Camera heading looks slightly ahead
  smoothingAlpha: 0.18, // Yaw/pitch follow smoothing
};

export const AI_CONFIG = {
  carCount: 7,
  lookaheadM: 140, // Distance to scan curvature ahead for corner braking
  cornerSpeedSafetyArcade: 1.15,
  cornerSpeedSafetyPro: 1.02,
  overtakeThresholdM: 22,
  lateralWiggleRate: 0.08,
};
