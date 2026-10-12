import { TrackManager, loadTrackData } from './track/trackManager';
import { Camera } from './render/camera';
import { RoadRenderer } from './render/roadRenderer';
import { SceneryRenderer } from './render/sceneryRenderer';
import { SpriteGenerator } from './render/spriteGenerator';
import { SkyRenderer } from './render/skyRenderer';
import { renderPeripheralTerrain } from './render/peripheralTerrain';
import { CrtEffect } from './render/crtEffect';
import { VehiclePhysics } from './physics/vehiclePhysics';
import { AIManager } from './ai/aiManager';
import { InputManager } from './input/inputManager';
import { SoundEngine } from './audio/soundEngine';
import { RaceManager } from './state/raceManager';
import { HUD } from './ui/hud';
import { MenuManager } from './ui/menus';
import { DebugPanel } from './ui/debugPanel';
import { loadStoredSettings, CAMERA_CONFIG } from './config/gameConfig';
import { GameMode, GameSettings } from './types/track';
import { wrap } from './utils/math';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  color: string;
}

export class BathurstArcadeGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private settings: GameSettings;
  private track!: TrackManager;
  private camera!: Camera;
  private roadRenderer!: RoadRenderer;
  private sceneryRenderer!: SceneryRenderer;
  private spriteGen!: SpriteGenerator;
  private skyRenderer!: SkyRenderer;
  private crtEffect!: CrtEffect;

  private player!: VehiclePhysics;
  private ai!: AIManager;
  private inputs!: InputManager;
  private sound!: SoundEngine;
  private race!: RaceManager;
  private hud!: HUD;
  private menus!: MenuManager;
  private debug!: DebugPanel;

  private isPaused: boolean = false;
  private particles: Particle[] = [];

  // Fixed simulation timestep
  private readonly fixedDt = 1 / 60; // 60 Hz physics
  private accumulator = 0;
  private lastTime = 0;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d', { alpha: false })!;
    this.settings = loadStoredSettings();

    this.setupResizeHandler();
    this.init();
  }

  private setupResizeHandler(): void {
    const updateViewport = () => {
      // 1. Maintain sharp retro 960x540 internal rendering buffer
      this.canvas.width = 960;
      this.canvas.height = 540;

      // 2. Measure actual visible mobile viewport (accounting for Chrome URL bars, notch safe-areas)
      const visibleW = window.visualViewport ? window.visualViewport.width : window.innerWidth;
      const visibleH = window.visualViewport ? window.visualViewport.height : window.innerHeight;

      const wPx = Math.round(visibleW);
      const hPx = Math.round(visibleH);

      document.documentElement.style.setProperty('--app-width', `${wPx}px`);
      document.documentElement.style.setProperty('--app-height', `${hPx}px`);

      const container = document.getElementById('game-container');
      if (container) {
        container.style.width = `${wPx}px`;
        container.style.height = `${hPx}px`;
      }
    };

    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', () => {
      updateViewport();
      setTimeout(updateViewport, 150);
      setTimeout(updateViewport, 400);
    });

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewport);
      window.visualViewport.addEventListener('scroll', updateViewport);
    }

    updateViewport();
  }

  private async init(): Promise<void> {
    // Show quick loading screen
    this.ctx.fillStyle = '#0a0e17';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = '#ffb703';
    this.ctx.font = 'bold 20px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('LOADING MOUNT PANORAMA...', this.canvas.width * 0.5, this.canvas.height * 0.5);

    const possiblePaths = ['./data/track.json', '/data/track.json', 'data/track.json'];
    let loaded = false;
    for (const p of possiblePaths) {
      try {
        this.track = await loadTrackData(p);
        loaded = true;
        break;
      } catch {
        // try next path
      }
    }
    if (!loaded) {
      this.track = await loadTrackData('./data/track.json');
    }

    this.camera = new Camera();
    this.roadRenderer = new RoadRenderer();
    this.sceneryRenderer = new SceneryRenderer();
    this.spriteGen = new SpriteGenerator();
    this.skyRenderer = new SkyRenderer();
    this.crtEffect = new CrtEffect();

    this.player = new VehiclePhysics(0, 0);
    this.ai = new AIManager();
    this.inputs = new InputManager();
    this.sound = new SoundEngine();
    this.sound.init(this.settings.soundEnabled);
    this.race = new RaceManager();
    this.hud = new HUD(this.track);

    this.debug = new DebugPanel((teleportS) => {
      this.player.resetAll(teleportS, 0, false);
      this.player.lapValid = false; // Teleport invalidates lap records
    });

    this.menus = new MenuManager(
      (mode) => this.startRaceMode(mode),
      () => { this.isPaused = false; this.sound.resume(); },
      () => this.restartCurrentRace(),
      () => this.exitToTitle(),
      (newSettings) => {
        const oldDiff = this.settings.difficulty;
        this.settings = newSettings;
        if (newSettings.difficulty !== oldDiff) {
          this.player.invalidateCurrentLap();
        }
        this.sound.setMute(!newSettings.soundEnabled);
        this.updateTouchShiftButtons();
      },
      (teleportS) => {
        this.player.resetAll(teleportS, 0, false);
        this.player.lapValid = false;
      }
    );
    this.updateTouchShiftButtons();

    // Check for direct launch via URL query parameter (e.g. ?mode=arcade, ?mode=practice&s=3150)
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get('mode') as GameMode | null;
    const sParam = params.get('s');

    if (modeParam && ['arcade', 'timetrial', 'practice'].includes(modeParam)) {
      this.startRaceMode(modeParam);
      if (sParam) {
        const sVal = parseFloat(sParam);
        if (!isNaN(sVal)) {
          this.player.s_m = wrap(sVal, this.track.lapLength);
          this.player.totalDistance_m = this.player.s_m;
          this.player.lapValid = false;
        }
      }
    } else {
      // Initial title screen
      this.menus.showTitleScreen(this.settings);
    }

    // Start requestAnimationFrame game loop
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  private startRaceMode(mode: GameMode): void {
    this.sound.init(this.settings.soundEnabled);
    this.sound.resume();
    this.menus.hide();
    this.isPaused = false;
    this.race.startRace(mode, this.player, this.ai, this.sound, this.settings);
    this.updateTouchShiftButtons();
  }

  private restartCurrentRace(): void {
    this.startRaceMode(this.race.mode);
  }

  private exitToTitle(): void {
    this.isPaused = false;
    this.race.exitToTitle(this.sound);
    this.menus.showTitleScreen(this.settings);
  }

  private pauseGame(): void {
    if (this.isPaused) return;
    this.isPaused = true;
    this.menus.showPauseMenu(this.settings, this.race.mode);
  }

  private resumeGame(): void {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.menus.hide();
    this.sound.resume();
  }

  private updateTouchShiftButtons(): void {
    const shiftZone = document.getElementById('touch-shift-zone');
    if (shiftZone) {
      if (this.settings.transmission === 'manual') {
        shiftZone.classList.remove('hidden');
      } else {
        shiftZone.classList.add('hidden');
      }
    }
  }

  private gameLoop(time: number): void {
    requestAnimationFrame((t) => this.gameLoop(t));

    // Poll global inputs (e.g. gamepad pause) on every frame whether paused or playing
    this.inputs.pollGlobalFrame();

    let frameTime = (time - this.lastTime) / 1000;
    this.lastTime = time;

    // Cap accumulated simulation time after suspended browser tab to prevent spiral of death
    if (frameTime > 0.25) {
      frameTime = 0.25;
    }

    // Handle Auto-Pause (blur, portrait rotation) -> explicitly pause, NEVER toggle/resume
    if (this.inputs.autoPauseRequested) {
      this.inputs.autoPauseRequested = false;
      if (!this.isPaused && (this.race.state === 'racing' || this.race.state === 'countdown')) {
        this.pauseGame();
      }
    }

    // Handle User-Requested Pause Toggle (ESC, P key, Gamepad Start, touch pause button)
    if (this.inputs.userPauseToggleRequested || this.inputs.pauseRequested) {
      this.inputs.userPauseToggleRequested = false;
      this.inputs.pauseRequested = false;
      if (this.isPaused) {
        this.resumeGame();
      } else if (this.race.state === 'racing' || this.race.state === 'countdown') {
        this.pauseGame();
      }
    }

    if (this.inputs.debugToggleRequested) {
      this.inputs.debugToggleRequested = false;
      this.debug.toggle();
    }

    // 1. Fixed Timestep Physics Simulation
    if (!this.isPaused && this.race.state !== 'menu') {
      this.accumulator += frameTime;
      while (this.accumulator >= this.fixedDt) {
        this.fixedUpdate(this.fixedDt);
        this.accumulator -= this.fixedDt;
      }
    }

    // 2. Render Frame
    this.render();
  }

  private fixedUpdate(dt: number): void {
    // If the race is finished, freeze vehicle position and ensure finish overlay is visible
    if (this.race.state === 'finished') {
      this.player.freeze();
      if (document.getElementById('ui-overlay')!.innerHTML === '') {
        this.menus.showFinishScreen(this.race, this.player, this.settings);
      }
      return;
    }

    const rawInputs = this.inputs.getInputs();

    // Prevent acceleration and freeze movement during countdown
    const drivingInputs = (this.race.state === 'countdown')
      ? { ...rawInputs, throttle: -1 }
      : rawInputs;

    // Update Player Vehicle Dynamics
    this.player.update(dt, drivingInputs, this.track, this.settings);

    // Update AI Opponents ONLY in Arcade Mode!
    // In Time Trial and Practice, AI simulation and collisions MUST NOT run.
    if (this.race.mode === 'arcade') {
      this.ai.update(
        dt,
        this.track,
        this.player,
        this.settings,
        this.race.state === 'racing',
        this.race.raceElapsedTime,
        this.race.totalLaps
      );
    }

    // Update Race Flow (Laps, Standings, Countdown, Checkered flag)
    this.race.update(dt, this.player, this.ai, this.sound, this.settings);

    if ((this.race.state as string) === 'finished') {
      this.player.freeze();
      if (document.getElementById('ui-overlay')!.innerHTML === '') {
        this.menus.showFinishScreen(this.race, this.player, this.settings);
      }
    }

    // Update Telemetry & Sound Engine
    const currentSample = this.track.sample(this.player.s_m);
    this.sound.update(
      this.player.rpm,
      this.race.state === 'racing' ? drivingInputs.throttle : 0,
      this.player.gear,
      this.player.isSkidding,
      this.player.isOffRoad,
      this.player.isWallHit,
      currentSample.area
    );

    this.debug.update(this.player, this.track);

    // Update Particles
    this.updateParticles(dt);
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.size += dt * 14;
      p.alpha -= dt * (1.0 / p.life);
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Spawn tyre smoke if skidding or hard braking
    if (this.player.isSkidding || (this.player.isBraking && this.player.speedMs > 25)) {
      if (Math.random() < 0.6) {
        const screenW = this.canvas.width;
        const screenH = this.canvas.height;
        const baseY = screenH - 24;
        const carCX = screenW * 0.5;

        // Left tyre smoke
        this.particles.push({
          x: carCX - 42 + (Math.random() * 8 - 4),
          y: baseY,
          vx: (Math.random() - 0.5) * 40,
          vy: -20 - Math.random() * 30,
          size: 6 + Math.random() * 6,
          alpha: 0.6,
          life: 0.45,
          color: '#e2e8f0',
        });

        // Right tyre smoke
        this.particles.push({
          x: carCX + 42 + (Math.random() * 8 - 4),
          y: baseY,
          vx: (Math.random() - 0.5) * 40,
          vy: -20 - Math.random() * 30,
          size: 6 + Math.random() * 6,
          alpha: 0.6,
          life: 0.45,
          color: '#e2e8f0',
        });
      }
    }

    // Spawn sparks on wall collision
    if (this.player.isWallHit) {
      const screenW = this.canvas.width;
      const screenH = this.canvas.height;
      const carCX = screenW * 0.5;
      const sideX = this.player.lateralM > 0 ? carCX + 55 : carCX - 55;
      for (let s = 0; s < 3; s++) {
        this.particles.push({
          x: sideX,
          y: screenH - 36 + Math.random() * 10,
          vx: (Math.random() - 0.5) * 120,
          vy: -50 - Math.random() * 70,
          size: 2 + Math.random() * 2,
          alpha: 0.9,
          life: 0.25,
          color: '#fbbf24',
        });
      }
    }
  }

  private render(): void {
    const ctx = this.ctx;
    const screenW = this.canvas.width;
    const screenH = this.canvas.height;
    const horizonY = Math.round(screenH * 0.52);

    // 1. Camera Placement (Positioned behind player along the track)
    const camS = wrap(this.player.s_m - CAMERA_CONFIG.distBehindM, this.track.lapLength);
    const camSample = this.track.sample(camS, this.settings.elevationExaggeration);

    // Camera world position: track centre + player lateral offset along track normal
    const camE = camSample.east_m + camSample.normalE * (this.player.lateralM * 0.75);
    const camN = camSample.north_m + camSample.normalN * (this.player.lateralM * 0.75);
    const camH = camSample.height_m;

    // Pitch follows road gradient
    const pitchRad = Math.atan(camSample.gradientPercent / 100);

    // Look slightly ahead on track for smooth camera heading
    const lookaheadS = wrap(camS + CAMERA_CONFIG.lookaheadLeadM, this.track.lapLength);
    const lookSample = this.track.sample(lookaheadS, this.settings.elevationExaggeration);
    const dLookE = lookSample.east_m - camE;
    const dLookN = lookSample.north_m - camN;
    const targetHeading = Math.atan2(dLookE, dLookN);

    this.camera.updatePosition(
      camS,
      this.player.lateralM,
      camE,
      camN,
      camH,
      targetHeading,
      pitchRad,
      this.fixedDt
    );

    // 2. Render Sky & Mountain Panorama Parallax Background
    this.skyRenderer.render(ctx, screenW, horizonY, this.camera.headingRad, camSample.height_m / this.settings.elevationExaggeration);
    renderPeripheralTerrain(ctx, this.track, this.camera, screenW, screenH, horizonY, this.settings.elevationExaggeration);

    // 3. Render Projected Road Ribbon with Crest Occlusion
    this.roadRenderer.renderRoad(
      ctx,
      this.track,
      this.camera,
      screenW,
      screenH,
      horizonY,
      this.settings.elevationExaggeration,
      this.debug.wireframeEnabled
    );

    // 4. Prepare Scenery Objects Ahead
    this.sceneryRenderer.prepareScenery(
      this.track,
      this.camera,
      this.spriteGen,
      screenW,
      screenH,
      horizonY,
      this.roadRenderer.renderedSegments,
      this.settings.elevationExaggeration
    );

    // 5. Project AI Opponents into 3D Space and Add to Scenery Drawables
    if (this.race.mode === 'arcade') {
      for (const opp of this.ai.opponents) {
        const oppSample = this.track.sample(opp.s_m, this.settings.elevationExaggeration);
        const oppE = oppSample.east_m + oppSample.normalE * opp.lateralM;
        const oppN = oppSample.north_m + oppSample.normalN * opp.lateralM;
        const oppH = oppSample.height_m;

        const proj = this.camera.project(oppE, oppN, oppH, screenW, screenH, horizonY);
        if (proj.visible && proj.depthZ > this.camera.nearPlane) {
          // Check hill crest occlusion
          const oppSegId = oppSample.segmentId;
          const renderedSeg = this.roadRenderer.renderedSegments.find(
            (rs) => rs.segment.id === oppSegId
          );
          if (renderedSeg && renderedSeg.occluded) {
            continue; // Hidden behind hill crest
          }

          // Select AI car sprite angle
          const sprites = this.spriteGen.carSprites[opp.liveryIndex];
          let carCanvas = sprites.straight;
          if (opp.isBraking) {
            carCanvas = opp.steerAngle < -0.3 ? sprites.slightLeftBrake : opp.steerAngle > 0.3 ? sprites.slightRightBrake : sprites.straightBrake;
          } else {
            carCanvas = opp.steerAngle < -0.3 ? sprites.slightLeft : opp.steerAngle > 0.3 ? sprites.slightRight : sprites.straight;
          }

          // True 3D perspective scale: 2.1m wide, 1.3m high touring car
          const carScaleW = Math.max(3, 2.1 * proj.scale);
          const carScaleH = Math.max(2, 1.3 * proj.scale);
          const clipY = renderedSeg ? renderedSeg.clipY : screenH;

          this.sceneryRenderer.addCarDrawable(
            proj.depthZ,
            proj.x,
            proj.y,
            carScaleW,
            carScaleH,
            carCanvas,
            clipY
          );
        }
      }
    }

    // 6. Draw Depth-Sorted Scenery & Opponent Cars
    this.sceneryRenderer.render(ctx);

    // 7. Render Particles (Smoke & Sparks)
    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // 8. Render Player Car (Bottom Center, scaled rear view)
    this.renderPlayerCar(screenW, screenH);

    // 9. Optional CRT Scanline Effect
    if (this.settings.crtFilter) {
      this.crtEffect.render(ctx, screenW, screenH);
    }

    // 10. Render Heads-Up Display (Minimap, Speedo, Lap Times, Position)
    if (this.race.state !== 'menu') {
      this.hud.render(
        ctx,
        screenW,
        screenH,
        this.player,
        this.race,
        this.ai,
        this.track,
        this.settings,
        this.inputs.isTouchDeviceActive
      );
    }
  }

  private renderPlayerCar(screenW: number, screenH: number): void {
    const ctx = this.ctx;
    const playerLiveryIndex = this.settings.carChoice === 'shell' ? 1 : 0;
    const sprites = this.spriteGen.carSprites[playerLiveryIndex] || this.spriteGen.carSprites[0];

    // Select sprite angle based on steerAngle
    const steer = this.player.steerAngle;
    const isBraking = this.player.isBraking;

    let carCanvas: HTMLCanvasElement;
    if (isBraking) {
      if (steer < -0.45) carCanvas = sprites.hardLeftBrake;
      else if (steer < -0.15) carCanvas = sprites.slightLeftBrake;
      else if (steer > 0.45) carCanvas = sprites.hardRightBrake;
      else if (steer > 0.15) carCanvas = sprites.slightRightBrake;
      else carCanvas = sprites.straightBrake;
    } else {
      if (steer < -0.45) carCanvas = sprites.hardLeft;
      else if (steer < -0.15) carCanvas = sprites.slightLeft;
      else if (steer > 0.45) carCanvas = sprites.hardRight;
      else if (steer > 0.15) carCanvas = sprites.slightRight;
      else carCanvas = sprites.straight;
    }

    // Ghost effect blinking during recovery
    if (this.player.isGhost && Math.floor(performance.now() / 100) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    // Render large aggressive Gen3 V8 Supercar near bottom center with responsive lateral lean
    const carW = 210;
    const carH = 126;
    const carX = (screenW - carW) * 0.5 + this.player.lateralM * 14;
    const carY = screenH - carH - 10;

    ctx.drawImage(carCanvas, carX, carY, carW, carH);
    ctx.globalAlpha = 1.0;
  }
}

// Bootstrap Game on Window Load
window.addEventListener('DOMContentLoaded', () => {
  new BathurstArcadeGame();
});
