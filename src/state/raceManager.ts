import { GameMode } from '../types/track';
import { VehiclePhysics } from '../physics/vehiclePhysics';
import { AIManager, OpponentCar } from '../ai/aiManager';
import { SoundEngine } from '../audio/soundEngine';
import { saveBestLapTime, loadBestLapTime } from '../config/gameConfig';

export interface DriverStanding {
  id: number;
  name: string;
  isPlayer: boolean;
  totalDistance: number;
  currentLap: number;
  position: number;
  speedKmh: number;
  lapTime: number;
  totalTime: number;
}

export class RaceManager {
  public mode: GameMode = 'arcade';
  public state: 'menu' | 'countdown' | 'racing' | 'finished' | 'paused' = 'menu';

  public totalLaps: number = 3;
  public countdownTimer: number = 3.9;
  public countdownPhase: number = 3; // 3, 2, 1, 0 (GO)

  public raceElapsedTime: number = 0;
  public playerFinalPosition: number = 1;
  public playerFinalTime: number = 0;

  public showFinalLapNotice: boolean = false;
  private finalLapNoticeTimer: number = 0;

  public standings: DriverStanding[] = [];

  constructor() {
    this.standings = [];
  }

  public startRace(mode: GameMode, player: VehiclePhysics, ai: AIManager, sound: SoundEngine): void {
    this.mode = mode;
    this.state = 'countdown';
    this.countdownTimer = 3.9;
    this.countdownPhase = 3;
    this.raceElapsedTime = 0;
    this.showFinalLapNotice = false;
    this.finalLapNoticeTimer = 0;

    if (mode === 'arcade') {
      this.totalLaps = 3;
      // Player starts at slot 8 (s = 6080m) behind the AI
      player.s_m = 6080;
      player.totalDistance_m = 6080;
      player.speedMs = 0;
      player.gear = 1;
      player.currentLap = 1;
      player.currentLapTime = 0;
      player.hasCompletedFirstLap = false;
      ai.resetGrid();
    } else if (mode === 'timetrial') {
      this.totalLaps = 99;
      // Start rolling or standing at start line
      player.s_m = 6180;
      player.totalDistance_m = 6180;
      player.speedMs = 0;
      player.gear = 1;
      player.currentLap = 1;
      player.currentLapTime = 0;
      player.hasCompletedFirstLap = false;
    } else {
      // Practice
      this.totalLaps = 99;
      player.s_m = 0;
      player.totalDistance_m = 0;
      player.speedMs = 0;
      player.gear = 1;
      player.currentLap = 1;
      player.currentLapTime = 0;
    }

    sound.playCountdown(false);
  }

  public update(
    dt: number,
    player: VehiclePhysics,
    ai: AIManager,
    sound: SoundEngine
  ): void {
    if (this.state === 'countdown') {
      this.updateCountdown(dt, sound);
      return;
    }

    if (this.state !== 'racing') return;

    this.raceElapsedTime += dt;

    // Update standings
    this.updateStandings(player, ai);

    // Final lap notice in Arcade race
    if (this.mode === 'arcade' && player.currentLap === this.totalLaps && !this.showFinalLapNotice) {
      this.showFinalLapNotice = true;
      this.finalLapNoticeTimer = 4.0;
    }

    if (this.finalLapNoticeTimer > 0) {
      this.finalLapNoticeTimer -= dt;
      if (this.finalLapNoticeTimer <= 0) {
        this.showFinalLapNotice = false;
      }
    }

    // Check race finish for Arcade mode
    if (this.mode === 'arcade' && player.currentLap > this.totalLaps) {
      this.finishRace(player, sound);
    }

    // In Time Trial mode, if player completed a lap, save best time
    if (this.mode === 'timetrial' && player.lastLapTime) {
      saveBestLapTime(player.lastLapTime);
    }
  }

  private updateCountdown(dt: number, sound: SoundEngine): void {
    const prevSec = Math.ceil(this.countdownTimer);
    this.countdownTimer -= dt;
    const curSec = Math.ceil(this.countdownTimer);

    if (curSec !== prevSec && curSec > 0 && curSec <= 3) {
      sound.playCountdown(false);
      this.countdownPhase = curSec;
    }

    if (this.countdownTimer <= 0) {
      this.state = 'racing';
      this.countdownPhase = 0; // GO!
      sound.playCountdown(true);
    }
  }

  private updateStandings(player: VehiclePhysics, ai: AIManager): void {
    const list: DriverStanding[] = [];

    // Add Player
    list.push({
      id: 0,
      name: 'Player',
      isPlayer: true,
      totalDistance: player.totalDistance_m,
      currentLap: player.currentLap,
      position: 1,
      speedKmh: Math.round(player.speedMs * 3.6),
      lapTime: player.currentLapTime,
      totalTime: this.raceElapsedTime,
    });

    // Add AI opponents if in Arcade mode
    if (this.mode === 'arcade') {
      for (const opp of ai.opponents) {
        list.push({
          id: opp.id,
          name: opp.name,
          isPlayer: false,
          totalDistance: opp.totalDistance_m,
          currentLap: Math.floor(opp.totalDistance_m / 6213) + 1,
          position: 1,
          speedKmh: Math.round(opp.speedMs * 3.6),
          lapTime: 0,
          totalTime: this.raceElapsedTime,
        });
      }
    }

    // Sort by unwrapped total distance (descending)
    list.sort((a, b) => b.totalDistance - a.totalDistance);

    // Assign rank positions 1st to 8th
    list.forEach((item, index) => {
      item.position = index + 1;
    });

    this.standings = list;
  }

  public getPlayerPosition(): number {
    const p = this.standings.find((s) => s.isPlayer);
    return p ? p.position : 1;
  }

  private finishRace(player: VehiclePhysics, sound: SoundEngine): void {
    this.state = 'finished';
    this.playerFinalPosition = this.getPlayerPosition();
    this.playerFinalTime = this.raceElapsedTime;
    sound.playFinish();

    if (player.bestLapTime) {
      saveBestLapTime(player.bestLapTime);
    }
  }
}
