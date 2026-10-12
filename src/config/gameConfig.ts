import { GameSettings } from '../types/track';
import { ROAD_KERB_WIDTH_M } from '../track/trackBoundaries';
export type { GameSettings };

export const TRACK_LAP_LENGTH_M = 6213;

export const DEFAULT_SETTINGS: GameSettings = {
  difficulty: 'arcade',
  transmission: 'auto',
  carChoice: 'redbull',
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

export const MIN_VALID_LAP_TIME_SEC = 120.0; // Sub-2:00 is physically impossible on a 6,213m lap (Gen3 record: 2:04.27)

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
  // Powertrain & Speed (Official Gen3 V8 Supercars parity specifications)
  topSpeedMs: 84.0, // ~302.4 km/h on Conrod Straight
  reverseTopSpeedMs: 14.0,
  idleRpm: 1000,
  maxRpm: 8000,
  redlineRpm: 7500,
  gearRatios: [3.20, 2.15, 1.58, 1.24, 1.02, 0.86], // 6-speed Xtrac sequential transaxle
  finalDrive: 3.45,
  gearTopSpeedsKmh: [82, 128, 174, 222, 268, 305], // Mount Panorama drop gear ratios

  // Acceleration & Aerodynamics
  enginePowerHp: 615, // Gen3 V8 engine (5.4L DOHC Mustang GT / 5.7L LTR Camaro ZL1)
  massKg: 1335, // Supercars regulations minimum race weight (including driver)
  dragCoefficient: 0.39, // Gen3 high-downforce touring car aero profile
  frontalAreaM2: 2.10,
  rollingResistance: 0.013,
  brakeDecelerationMs2: 14.5, // AP Racing 6-piston 395mm ventilated discs (~1.5G)
  handbrakeDecelMs2: 9.0,

  // Steering & Handling
  steerRate: 2.8, // Rad/s response
  steerReturnRate: 4.2, // Self-centering rate
  steerSensitivityLowSpeed: 1.0,
  steerSensitivityHighSpeed: 0.38, // Stabilize at 300 km/h

  // Grip Limits & Curvature Response
  // Lat accel = v^2 * abs(curvature). Real Gen3 cornering limits: ~1.4 - 1.7G on Dunlop slicks
  maxGripLatAccelMs2Arcade: 16.5,
  maxGripLatAccelMs2Pro: 13.5,
  tyreScrubDragFactor: 0.55,
  slideRecoveryRate: 3.5,

  // Rumble Kerb (stripes) & Off-track grass/dirt dynamics
  kerbWidthM: ROAD_KERB_WIDTH_M,
  kerbDragFactor: 0.25, // Slight texture drag, allows attacking & riding kerbs cleanly
  offRoadDragFactor: 1.2,
  offRoadMaxSpeedKmh: 120,

  // Collisions
  wallBounceRestitution: 0.3,
  carBounceRestitution: 0.45,
  wallScrapeDecel: 3.5, // Glancing contact decel that doesn't freeze the car
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
