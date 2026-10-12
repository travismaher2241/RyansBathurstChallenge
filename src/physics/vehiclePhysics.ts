import { PHYSICS_CONFIG, TRACK_LAP_LENGTH_M, MIN_VALID_LAP_TIME_SEC, saveBestLapTime } from '../config/gameConfig';
import { TrackManager, SampledPoint } from '../track/trackManager';
import { wrap, clamp, lerp } from '../utils/math';
import { GameSettings } from '../types/track';
import { CAR_HALF_WIDTH_M, getCuttingWallHeight, getCuttingWallOffset } from '../track/trackBoundaries';

export interface CarInputs {
  throttle: number; // 0 to 1
  brake: number;    // 0 to 1
  steer: number;    // -1 (left) to +1 (right)
  handbrake: boolean;
  shiftUp?: boolean;
  shiftDown?: boolean;
  reset?: boolean;
}

export class VehiclePhysics {
  // Positional State
  public s_m: number = 0;
  public totalDistance_m: number = 0;
  public lateralM: number = 0;
  public speedMs: number = 0;

  // Drivetrain State
  public gear: number = 1;
  public rpm: number = PHYSICS_CONFIG.idleRpm;
  public steerAngle: number = 0;
  public slipAngle: number = 0;

  // State flags
  public isBraking: boolean = false;
  public isSkidding: boolean = false;
  public isOnKerb: boolean = false;
  public isOffRoad: boolean = false;
  public isWallHit: boolean = false;
  public isGhost: boolean = false;
  public ghostTimer: number = 0;

  // Curvature smoothing buffer (filters local noise from DEM reconstruction)
  private smoothedCurvature: number = 0;

  // Lap Tracking & Timing
  public currentLap: number = 1;
  public currentLapTime: number = 0;
  public lastLapTime: number | null = null;
  public bestLapTime: number | null = null;
  public lapStarted: boolean = false;
  public lapValid: boolean = true;
  public lapInvalidReason: string | null = null;
  public lapDifficulty: 'arcade' | 'pro' = 'arcade';
  public lapDistanceM: number = 0;

  // Sector Checkpoints around Mount Panorama (prevents short-cutting or reversing cheats)
  private cpCutting: boolean = false; // Sector 1: The Cutting (s ~ 1200-1600m)
  private cpSkyline: boolean = false; // Sector 2: Brock's Skyline (s ~ 2800-3200m)
  private cpConrod: boolean = false;  // Sector 3: Forrest's Elbow / Conrod (s ~ 4000-4600m)
  private cpChase: boolean = false;   // Sector 4: The Chase (s ~ 5100-5600m)
  private offRoadTimer: number = 0;

  // Transmission cooldown
  private shiftCooldownTimer: number = 0;

  constructor(initialS: number = 0, initialLateralM: number = 0) {
    this.resetAll(initialS, initialLateralM);
  }

  public resetAll(initialS: number, initialLateralM: number, autoStartLap: boolean = false, difficulty: GameSettings['difficulty'] = 'arcade'): void {
    this.s_m = initialS;
    this.totalDistance_m = initialS;
    this.lateralM = initialLateralM;
    this.speedMs = 0;
    this.gear = 1;
    this.rpm = PHYSICS_CONFIG.idleRpm;
    this.steerAngle = 0;
    this.slipAngle = 0;
    this.isBraking = false;
    this.isSkidding = false;
    this.isOnKerb = false;
    this.isOffRoad = false;
    this.isWallHit = false;
    this.isGhost = false;
    this.ghostTimer = 0;
    this.currentLap = 1;
    this.currentLapTime = 0;
    this.lastLapTime = null;
    this.bestLapTime = null;
    this.lapStarted = autoStartLap;
    this.lapValid = true;
    this.lapInvalidReason = null;
    this.lapDistanceM = 0;
    this.cpCutting = false;
    this.cpSkyline = false;
    this.cpConrod = false;
    this.cpChase = false;
    this.offRoadTimer = 0;
    this.lapDifficulty = difficulty;
    this.shiftCooldownTimer = 0;
    this.smoothedCurvature = 0;
  }

  public invalidateCurrentLap(reason: string = 'LAP INVALIDATED'): void {
    this.lapValid = false;
    this.lapInvalidReason = reason;
    this.lastLapTime = null;
    this.bestLapTime = null;
  }

  public freeze(): void {
    this.speedMs = 0;
    this.rpm = PHYSICS_CONFIG.idleRpm;
    this.isBraking = false;
    this.isSkidding = false;
    this.isWallHit = false;
  }

  public resetToTrack(): void {
    // Recovery assistance must never produce a competitive lap record.
    // Preserve earlier valid session bests; only this lap becomes ineligible.
    this.lapValid = false;
    this.lapInvalidReason = 'CAR RESET';
    // Place car safely ahead in track centre at moderate speed with ghost period
    this.lateralM = 0;
    this.speedMs = Math.min(this.speedMs, 14.0); // ~50 km/h
    this.gear = 2;
    this.steerAngle = 0;
    this.slipAngle = 0;
    this.isGhost = true;
    this.ghostTimer = 2.5; // 2.5 seconds ghosting
  }

  public update(
    dt: number,
    inputs: CarInputs,
    track: TrackManager,
    settings: GameSettings
  ): void {
    if (inputs.reset) {
      this.resetToTrack();
    }

    if (this.ghostTimer > 0) {
      this.ghostTimer -= dt;
      if (this.ghostTimer <= 0) {
        this.isGhost = false;
      }
    }

    const sample = track.sample(this.s_m, settings.elevationExaggeration);
    const halfRoadW = sample.roadWidth_m * 0.5;

    // Filter local curvature over time to smooth noisy reconstruction vertices
    this.smoothedCurvature = lerp(this.smoothedCurvature, sample.curvature, Math.min(1.0, dt * 10));

    // 1. Steering & Responsiveness
    const speedKmh = Math.abs(this.speedMs * 3.6);
    const speedNorm = clamp(speedKmh / 280, 0, 1);
    const sensitivity = lerp(
      PHYSICS_CONFIG.steerSensitivityLowSpeed,
      PHYSICS_CONFIG.steerSensitivityHighSpeed,
      speedNorm
    );

    if (Math.abs(inputs.steer) > 0.05) {
      this.steerAngle = lerp(this.steerAngle, inputs.steer * sensitivity, dt * PHYSICS_CONFIG.steerRate * 4);
    } else {
      // Gentle self-centering
      this.steerAngle = lerp(this.steerAngle, 0, dt * PHYSICS_CONFIG.steerReturnRate * 3);
    }

    // 2. Transmission & Drivetrain
    this.updateTransmission(dt, inputs, settings);

    // 3. Acceleration, Drag, and Braking Forces
    let throttle = inputs.throttle;
    if (throttle < 0) {
      throttle = 0; // Frozen / countdown
    } else if (settings.autoAccelerate && throttle < 0.2 && inputs.brake < 0.1) {
      throttle = 1.0;
    }

    const isBraking = inputs.brake > 0.1;
    this.isBraking = isBraking;

    let accelForce = 0;
    if (throttle > 0 && !isBraking) {
      const currentGearTop = PHYSICS_CONFIG.gearTopSpeedsKmh[this.gear - 1] / 3.6;
      const gearSpeedRatio = clamp(this.speedMs / currentGearTop, 0, 1.05);

      // Official Gen3 615 bhp (458 kW) V8 Power Curve
      // Delivers peak torque plateau through mid-range and maximum power before redline
      const powerFactor = Math.max(0.72, 0.55 + 0.50 * gearSpeedRatio);
      const wheelPowerW = 385000 * powerFactor; // Peak ~385 kW delivered to wheels
      const effSpeed = Math.max(10.2, Math.abs(this.speedMs));

      const rawAccel = (wheelPowerW / (PHYSICS_CONFIG.massKg * effSpeed)) * throttle;
      // Launch traction limit on Dunlop 18" racing slicks (~0.85G launch)
      const tractionLimit = 8.35;
      // Fuel cut approaching redline. Do not clamp road speed: a downhill car
      // may coast above the gear limit, but cannot accelerate there under power.
      const limiter = clamp((1 - gearSpeedRatio) / 0.02, 0, 1);
      accelForce = Math.min(tractionLimit, rawAccel) * limiter;
    }

    // Aerodynamic and rolling resistance
    const aeroDrag = 0.5 * 1.225 * PHYSICS_CONFIG.dragCoefficient * PHYSICS_CONFIG.frontalAreaM2 * (this.speedMs * this.speedMs) / PHYSICS_CONFIG.massKg;
    const rollingRes = PHYSICS_CONFIG.rollingResistance * 9.81;

    // Braking force
    let brakeForce = 0;
    if (isBraking) {
      brakeForce = inputs.brake * PHYSICS_CONFIG.brakeDecelerationMs2;
    }
    if (inputs.handbrake) {
      brakeForce += PHYSICS_CONFIG.handbrakeDecelMs2;
    }

    // Gradient effect: climbing Mountain Straight vs descending down Conrod
    const gravityForce = -(sample.gradientPercent / 100) * 9.81 * 0.95;

    // 3. Kerb Stripes, Off-road Grass, and Barrier Dynamics
    const kerbOuterM = halfRoadW + PHYSICS_CONFIG.kerbWidthM;
    const absLat = Math.abs(this.lateralM);

    // Differentiate riding the rumble kerbs (stripes) vs true off-road grass/dirt
    this.isOnKerb = absLat > halfRoadW && absLat <= kerbOuterM;
    this.isOffRoad = absLat > kerbOuterM;

    let surfaceDrag = 0;
    if (this.isOnKerb) {
      // Riding the rumble kerbs (stripes): minor textural drag so the car maintains speed & drives right over them
      surfaceDrag = PHYSICS_CONFIG.kerbDragFactor * 1.5;
    } else if (this.isOffRoad) {
      // Grass / dirt resistance: progressive slowing without stopping dead
      const excessOffroad = absLat - kerbOuterM;
      surfaceDrag = PHYSICS_CONFIG.offRoadDragFactor * Math.min(3.2, 1.2 + excessOffroad * 0.6);
      if (this.speedMs > PHYSICS_CONFIG.offRoadMaxSpeedKmh / 3.6) {
        surfaceDrag += 2.8;
      }
    }

    // Net longitudinal acceleration
    const netAccel = accelForce - aeroDrag - rollingRes - brakeForce + gravityForce - surfaceDrag;
    this.speedMs = Math.max(0, this.speedMs + netAccel * dt);

    // Top speed cap on Conrod
    if (this.speedMs > PHYSICS_CONFIG.topSpeedMs) {
      this.speedMs = PHYSICS_CONFIG.topSpeedMs;
    }

    // 4. Lateral Dynamics & Cornering Demand
    // Lateral acceleration demand: a_lat = v^2 * abs(curvature)
    const latDemand = (this.speedMs * this.speedMs) * Math.abs(this.smoothedCurvature);
    const maxGrip = settings.difficulty === 'arcade'
      ? PHYSICS_CONFIG.maxGripLatAccelMs2Arcade
      : PHYSICS_CONFIG.maxGripLatAccelMs2Pro;

    // Steering lateral movement (kerbs maintain high authority, grass reduces responsiveness slightly)
    const steerFactor = this.isOffRoad ? 0.80 : (this.isOnKerb ? 0.96 : 1.0);
    const lateralSpeed = this.steerAngle * (this.speedMs * 0.32 + 3.0) * steerFactor;
    this.lateralM += lateralSpeed * dt;

    // Track curvature naturally pulls the car outwards if not steering enough or going too fast!
    const curveCentrifugalForce = (this.speedMs * this.speedMs) * (-this.smoothedCurvature) * 0.04;
    this.lateralM += curveCentrifugalForce * dt;

    // Grip breakaway & realistic cornering limits
    if (latDemand > maxGrip && this.speedMs > 16.0) {
      this.isSkidding = true;
      const excessGrip = latDemand - maxGrip;
      // Realistic tyre scrub deceleration: overcooking corners scrubs speed heavily
      this.speedMs = Math.max(0, this.speedMs - excessGrip * 1.5 * dt);
      // Lateral slide towards outside of corner
      this.lateralM += (-Math.sign(this.smoothedCurvature)) * (excessGrip * 0.18) * dt;
    } else {
      this.isSkidding = (inputs.handbrake && this.speedMs > 10.0);
    }

    // Track limits monitoring: cutting across grass at speed invalidates the lap
    if (this.isOffRoad && this.speedMs > 15.0) {
      this.offRoadTimer += dt;
      if (this.offRoadTimer > 0.35) {
        this.lapValid = false;
        this.lapInvalidReason = 'TRACK LIMITS';
      }
    } else {
      this.offRoadTimer = 0;
    }

    // 5. Barrier & Wall Collisions
    // Barriers are positioned outside the kerb and verge
    const barrierLimit = kerbOuterM + 1.2;
    const leftBarrierLimit = getCuttingWallHeight(this.s_m) > 0
      ? getCuttingWallOffset(sample.roadWidth_m) - CAR_HALF_WIDTH_M
      : barrierLimit;
    this.isWallHit = false;
    if (!this.isGhost) {
      if (this.lateralM > barrierLimit) {
        this.lateralM = barrierLimit; // Smooth clamp without teleport judder
        this.steerAngle = -0.15; // Deflect steering back onto circuit
        this.speedMs = Math.max(0, this.speedMs - PHYSICS_CONFIG.wallScrapeDecel * 2.5 * dt);
        this.isWallHit = true;
        if (this.speedMs > 10.0) {
          this.lapValid = false;
          this.lapInvalidReason = 'WALL CONTACT';
        }
      } else if (this.lateralM < -leftBarrierLimit) {
        this.lateralM = -leftBarrierLimit; // Car body meets the visible wall
        this.steerAngle = 0.15; // Deflect steering back onto circuit
        this.speedMs = Math.max(0, this.speedMs - PHYSICS_CONFIG.wallScrapeDecel * 2.5 * dt);
        this.isWallHit = true;
        if (this.speedMs > 10.0) {
          this.lapValid = false;
          this.lapInvalidReason = 'WALL CONTACT';
        }
      }
    }

    // 6. Track Advance & Checkpoint Verification
    const deltaS = this.speedMs * dt;
    const prevS = this.s_m;
    this.s_m = wrap(this.s_m + deltaS, TRACK_LAP_LENGTH_M);
    this.totalDistance_m += deltaS;

    // Track sector checkpoints
    if (this.s_m >= 1200 && this.s_m <= 1600) this.cpCutting = true;
    if (this.s_m >= 2800 && this.s_m <= 3200) this.cpSkyline = true;
    if (this.s_m >= 4000 && this.s_m <= 4600) this.cpConrod = true;
    if (this.s_m >= 5100 && this.s_m <= 5600) this.cpChase = true;

    if (this.lapStarted) {
      this.lapDistanceM += deltaS;
      this.currentLapTime += dt;
    }

    // Lap counting & timing across the timing line (s = 0)
    if (prevS > 6000 && this.s_m < 200) {
      this.handleLapCompleted(settings.difficulty);
    }
  }

  private handleLapCompleted(difficulty: 'arcade' | 'pro'): void {
    if (!this.lapStarted) {
      // First crossing from the starting grid: Start Lap 1 officially!
      this.lapStarted = true;
      this.currentLap = 1;
      this.currentLapTime = 0;
      this.lapValid = true;
      this.lapInvalidReason = null;
      this.lapDistanceM = 0;
      this.cpCutting = false;
      this.cpSkyline = false;
      this.cpConrod = false;
      this.cpChase = false;
      this.lapDifficulty = difficulty;
      return;
    }

    // Checkpoint & distance integrity verification (prevents shortcut/reverse exploits)
    const fullLapCompleted = this.lapDistanceM >= 5800 && this.cpCutting && this.cpSkyline && this.cpConrod && this.cpChase;
    if (!fullLapCompleted) {
      this.lapValid = false;
      this.lapInvalidReason = 'MISSED SECTORS';
    }

    // Completed a full lap!
    this.lastLapTime = this.currentLapTime;
    if (this.lapValid && this.currentLapTime >= MIN_VALID_LAP_TIME_SEC) {
      if (this.bestLapTime === null || this.currentLapTime < this.bestLapTime) {
        this.bestLapTime = this.currentLapTime;
      }
      // Save record immediately with the difficulty under which this specific lap was driven!
      saveBestLapTime(this.currentLapTime, this.lapDifficulty);
    }
    this.currentLap++;
    this.currentLapTime = 0;
    this.lapValid = true;
    this.lapInvalidReason = null;
    this.lapDistanceM = 0;
    this.cpCutting = false;
    this.cpSkyline = false;
    this.cpConrod = false;
    this.cpChase = false;
    this.lapDifficulty = difficulty;
  }

  private updateTransmission(dt: number, inputs: CarInputs, settings: GameSettings): void {
    const speedKmh = this.speedMs * 3.6;

    if (this.shiftCooldownTimer > 0) {
      this.shiftCooldownTimer -= dt;
    }

    if (settings.transmission === 'auto') {
      // Automatic Gearbox: shift up at 90% of current gear top speed, shift down at 72%
      if (this.gear < 6 && speedKmh > PHYSICS_CONFIG.gearTopSpeedsKmh[this.gear - 1] * 0.90) {
        this.gear++;
        this.shiftCooldownTimer = 0.22;
      } else if (this.gear > 1 && speedKmh < PHYSICS_CONFIG.gearTopSpeedsKmh[this.gear - 2] * 0.72) {
        this.gear--;
        this.shiftCooldownTimer = 0.22;
      }
    } else {
      // Manual Gearbox: edge-triggered with cooldown
      if (inputs.shiftUp && this.gear < 6 && this.shiftCooldownTimer <= 0) {
        this.gear++;
        this.shiftCooldownTimer = 0.22;
      }
      if (inputs.shiftDown && this.gear > 1 && this.shiftCooldownTimer <= 0 &&
          speedKmh <= PHYSICS_CONFIG.gearTopSpeedsKmh[this.gear - 2]) {
        this.gear--;
        this.shiftCooldownTimer = 0.22;
      }
    }

    // Compute Engine RPM based on current gear ratio and wheel speed
    const currentGearTop = PHYSICS_CONFIG.gearTopSpeedsKmh[this.gear - 1];
    const gearSpeedRatio = clamp(speedKmh / currentGearTop, 0, 1);
    const targetRpm = lerp(PHYSICS_CONFIG.idleRpm, PHYSICS_CONFIG.redlineRpm, gearSpeedRatio);

    this.rpm = lerp(this.rpm, targetRpm, dt * 12);
  }
}
