import { PHYSICS_CONFIG, TRACK_LAP_LENGTH_M } from '../config/gameConfig';
import { TrackManager, SampledPoint } from '../track/trackManager';
import { wrap, clamp, lerp } from '../utils/math';
import { GameSettings } from '../types/track';

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
  public isOffRoad: boolean = false;
  public isWallHit: boolean = false;
  public isGhost: boolean = false;
  public ghostTimer: number = 0;

  // Curvature smoothing buffer (filters local noise from DEM reconstruction)
  private smoothedCurvature: number = 0;

  // Lap Tracking
  public currentLap: number = 1;
  public currentLapTime: number = 0;
  public lastLapTime: number | null = null;
  public bestLapTime: number | null = null;
  public hasCompletedFirstLap: boolean = false;

  constructor(initialS: number = 0, initialLateralM: number = 0) {
    this.s_m = initialS;
    this.totalDistance_m = initialS;
    this.lateralM = initialLateralM;
  }

  public resetToTrack(): void {
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
    if (settings.autoAccelerate && throttle < 0.2 && inputs.brake < 0.1) {
      throttle = 1.0;
    }

    const isBraking = inputs.brake > 0.1;
    this.isBraking = isBraking;

    let accelForce = 0;
    if (throttle > 0 && !isBraking) {
      const topSpeedForGear = PHYSICS_CONFIG.gearTopSpeedsKmh[this.gear - 1] / 3.6;
      const powerFactor = clamp(1.0 - (this.speedMs / topSpeedForGear), 0, 1);
      // Progressive acceleration
      const gearFactor = (7 - this.gear) / 6.0;
      accelForce = throttle * (5.5 * gearFactor + 1.2) * (0.3 + 0.7 * powerFactor);
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

    // Gradient effect: climbing takes effort, downhill accelerates!
    const gravityForce = -(sample.gradientPercent / 100) * 9.81 * 0.45;

    // Off-road grass/dirt resistance
    this.isOffRoad = Math.abs(this.lateralM) > halfRoadW;
    let surfaceDrag = 0;
    if (this.isOffRoad) {
      surfaceDrag = PHYSICS_CONFIG.offRoadDragFactor * 6.0;
      if (this.speedMs > PHYSICS_CONFIG.offRoadMaxSpeedKmh / 3.6) {
        surfaceDrag += 8.0;
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

    // Steering lateral movement
    const lateralSpeed = this.steerAngle * (this.speedMs * 0.32 + 3.0);
    this.lateralM += lateralSpeed * dt;

    // Track curvature naturally pulls the car outwards if not steering enough or going too fast!
    // Positive curvature is right turn -> pushes car left (negative lateral)
    // Negative curvature is left turn -> pushes car right (positive lateral)
    const curveCentrifugalForce = (this.speedMs * this.speedMs) * (-this.smoothedCurvature) * 0.04;
    this.lateralM += curveCentrifugalForce * dt;

    // Grip breakaway & skid detection
    if (latDemand > maxGrip && this.speedMs > 18.0) {
      this.isSkidding = true;
      const excessGrip = latDemand - maxGrip;
      // Tyre scrub scrub-off drag
      this.speedMs = Math.max(0, this.speedMs - excessGrip * PHYSICS_CONFIG.tyreScrubDragFactor * dt);
      // Lateral slide
      this.lateralM += (-Math.sign(this.smoothedCurvature)) * (excessGrip * 0.08) * dt;
    } else {
      this.isSkidding = (inputs.handbrake && this.speedMs > 10.0);
    }

    // 5. Barrier & Wall Collisions
    const barrierLimit = halfRoadW + 1.8;
    this.isWallHit = false;
    if (!this.isGhost) {
      if (this.lateralM > barrierLimit) {
        this.lateralM = barrierLimit;
        this.lateralM -= 0.3; // Rebound
        this.speedMs = Math.max(0, this.speedMs - PHYSICS_CONFIG.wallScrapeDecel * dt);
        this.isWallHit = true;
      } else if (this.lateralM < -barrierLimit) {
        this.lateralM = -barrierLimit;
        this.lateralM += 0.3; // Rebound
        this.speedMs = Math.max(0, this.speedMs - PHYSICS_CONFIG.wallScrapeDecel * dt);
        this.isWallHit = true;
      }
    }

    // 6. Track Advance & Seamless Lap Seam modulo 6213
    const deltaS = this.speedMs * dt;
    const prevS = this.s_m;
    this.s_m = wrap(this.s_m + deltaS, TRACK_LAP_LENGTH_M);
    this.totalDistance_m += deltaS;

    // Lap counting & timing across the timing line (s = 0)
    if (prevS > 6000 && this.s_m < 200) {
      // Completed a lap!
      this.handleLapCompleted();
    }

    this.currentLapTime += dt;
  }

  private handleLapCompleted(): void {
    if (this.hasCompletedFirstLap) {
      this.lastLapTime = this.currentLapTime;
      if (this.bestLapTime === null || this.currentLapTime < this.bestLapTime) {
        this.bestLapTime = this.currentLapTime;
      }
      this.currentLap++;
    } else {
      // Finished lap 1
      this.hasCompletedFirstLap = true;
      this.lastLapTime = this.currentLapTime;
      this.bestLapTime = this.currentLapTime;
      this.currentLap = 2;
    }
    this.currentLapTime = 0;
  }

  private updateTransmission(dt: number, inputs: CarInputs, settings: GameSettings): void {
    const speedKmh = this.speedMs * 3.6;

    if (settings.transmission === 'auto') {
      // Automatic Gearbox
      if (this.gear < 6 && speedKmh > PHYSICS_CONFIG.gearTopSpeedsKmh[this.gear - 1] * 0.88) {
        this.gear++;
      } else if (this.gear > 1 && speedKmh < PHYSICS_CONFIG.gearTopSpeedsKmh[this.gear - 2] * 0.72) {
        this.gear--;
      }
    } else {
      // Manual Gearbox
      if (inputs.shiftUp && this.gear < 6) {
        this.gear++;
      }
      if (inputs.shiftDown && this.gear > 1) {
        this.gear--;
      }
    }

    // Compute Engine RPM based on current gear ratio and wheel speed
    const currentGearTop = PHYSICS_CONFIG.gearTopSpeedsKmh[this.gear - 1];
    const gearSpeedRatio = clamp(speedKmh / currentGearTop, 0, 1.15);
    const targetRpm = lerp(PHYSICS_CONFIG.idleRpm, PHYSICS_CONFIG.redlineRpm, gearSpeedRatio);

    this.rpm = lerp(this.rpm, targetRpm, dt * 12);
  }
}
