import { GameMode, GameSettings } from '../types/track';
import { VehiclePhysics } from '../physics/vehiclePhysics';
import { AIManager, OpponentCar } from '../ai/aiManager';
import { SoundEngine } from '../audio/soundEngine';
import { formatLapTime } from '../utils/math';

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
  finished: boolean;
  finishTime: number | null;
  gapText: string;
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
  public hasAnnouncedFinalLap: boolean = false;

  public winnerTime: number | null = null;
  public standings: DriverStanding[] = [];

  constructor() {
    this.standings = [];
  }

  public startRace(mode: GameMode, player: VehiclePhysics, ai: AIManager, sound: SoundEngine, settings?: GameSettings): void {
    this.mode = mode;
    this.state = 'countdown';
    this.countdownTimer = 3.9;
    this.countdownPhase = 3;
    this.raceElapsedTime = 0;
    this.playerFinalTime = 0;
    this.playerFinalPosition = 1;
    this.showFinalLapNotice = false;
    this.finalLapNoticeTimer = 0;
    this.hasAnnouncedFinalLap = false;
    this.winnerTime = null;
    this.standings = [];

    if (mode === 'arcade') {
      this.totalLaps = 3;
      // Slot 8 on starting grid on Pit Straight (s = 6080m)
      player.resetAll(6080, 2.2, false, settings?.difficulty);
      ai.resetGrid(settings?.carChoice || 'redbull');
    } else if (mode === 'timetrial') {
      this.totalLaps = 99;
      // Standing start on Pit Straight run-up (s = 6180m)
      player.resetAll(6180, 0, false, settings?.difficulty);
    } else {
      // Practice: start directly at start line with lap 1 active
      this.totalLaps = 99;
      player.resetAll(0, 0, true, settings?.difficulty);
    }

    this.updateStandings(player, ai, settings);
    sound.playCountdown(false);
  }

  public exitToTitle(sound: SoundEngine): void {
    this.state = 'menu';
    this.raceElapsedTime = 0;
    this.playerFinalTime = 0;
    this.playerFinalPosition = 1;
    this.countdownTimer = 0;
    this.showFinalLapNotice = false;
    this.hasAnnouncedFinalLap = false;
    this.winnerTime = null;
    this.standings = [];
    sound.stopAll();
  }

  public update(
    dt: number,
    player: VehiclePhysics,
    ai: AIManager,
    sound: SoundEngine,
    settings: GameSettings
  ): void {
    if (this.state === 'countdown') {
      this.updateCountdown(dt, sound, player);
      player.freeze();
      player.currentLapTime = 0;
      return;
    }

    if (this.state !== 'racing') return;

    this.raceElapsedTime += dt;

    // Update standings and finish tracking
    this.updateStandings(player, ai, settings);

    // Final lap notice in Arcade race: announce ONCE
    if (this.mode === 'arcade' && player.currentLap === this.totalLaps && !this.hasAnnouncedFinalLap) {
      this.hasAnnouncedFinalLap = true;
      this.showFinalLapNotice = true;
      this.finalLapNoticeTimer = 4.0;
    }

    if (this.finalLapNoticeTimer > 0) {
      this.finalLapNoticeTimer -= dt;
      if (this.finalLapNoticeTimer <= 0) {
        this.showFinalLapNotice = false;
      }
    }

    // Check race finish for Arcade mode (player finishes after 3 full laps)
    if (this.mode === 'arcade' && player.currentLap > this.totalLaps && this.state === 'racing') {
      this.finishRace(player, ai, sound, settings);
    }
  }

  private updateCountdown(dt: number, sound: SoundEngine, player?: VehiclePhysics): void {
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
      if (player) {
        player.currentLapTime = 0;
        player.lapDistanceM = 0;
      }
    }
  }

  public updateStandings(player: VehiclePhysics, ai: AIManager, settings?: GameSettings): void {
    const list: DriverStanding[] = [];

    const playerFinished = this.mode === 'arcade' && player.currentLap > this.totalLaps;
    const playerFinishTime = playerFinished ? this.playerFinalTime || this.raceElapsedTime : null;

    const teamLabel = settings ? (settings.carChoice === 'shell' ? ' (Shell #17 - Kostecki)' : ' (Red Bull #888 - Brown)') : '';

    // Add Player
    list.push({
      id: 0,
      name: `Player${teamLabel}`,
      isPlayer: true,
      totalDistance: player.totalDistance_m,
      currentLap: Math.min(player.currentLap, this.totalLaps),
      position: 1,
      speedKmh: Math.round(player.speedMs * 3.6),
      lapTime: player.currentLapTime,
      totalTime: playerFinishTime || this.raceElapsedTime,
      finished: playerFinished,
      finishTime: playerFinishTime,
      gapText: '',
    });

    // Add AI opponents if in Arcade mode
    if (this.mode === 'arcade') {
      for (const opp of ai.opponents) {
        list.push({
          id: opp.id,
          name: opp.name,
          isPlayer: false,
          totalDistance: opp.totalDistance_m,
          currentLap: Math.min(opp.currentLap, this.totalLaps),
          position: 1,
          speedKmh: Math.round(opp.speedMs * 3.6),
          lapTime: 0,
          totalTime: opp.finishTime || this.raceElapsedTime,
          finished: opp.finished,
          finishTime: opp.finishTime,
          gapText: '',
        });
      }
    }

    // Sort order:
    // 1. Finished drivers by finishTime (ascending)
    // 2. Active drivers by totalDistance (descending)
    list.sort((a, b) => {
      if (a.finished && b.finished) {
        return (a.finishTime ?? 9999) - (b.finishTime ?? 9999);
      }
      if (a.finished && !b.finished) return -1;
      if (!a.finished && b.finished) return 1;
      return b.totalDistance - a.totalDistance;
    });

    // Assign rank positions and calculate gaps
    const leader = list[0];
    if (leader && leader.finished && this.winnerTime === null) {
      this.winnerTime = leader.finishTime;
    }

    list.forEach((item, index) => {
      item.position = index + 1;
      if (index === 0) {
        item.gapText = item.finished ? formatLapTime(item.totalTime) : 'LEADER';
      } else {
        if (item.finished && leader.finished && leader.finishTime !== null && item.finishTime !== null) {
          const gap = item.finishTime - leader.finishTime;
          item.gapText = `+${gap.toFixed(3)}s`;
        } else if (item.currentLap < leader.currentLap) {
          const lapsBehind = leader.currentLap - item.currentLap;
          item.gapText = `+${lapsBehind} LAP${lapsBehind > 1 ? 'S' : ''}`;
        } else {
          const distBehind = Math.max(0, leader.totalDistance - item.totalDistance);
          item.gapText = `+${Math.round(distBehind)}m`;
        }
      }
    });

    this.standings = list;
  }

  public getPlayerPosition(): number {
    const p = this.standings.find((s) => s.isPlayer);
    return p ? p.position : 1;
  }

  private finishRace(player: VehiclePhysics, ai: AIManager, sound: SoundEngine, settings: GameSettings): void {
    this.state = 'finished';
    this.playerFinalTime = this.raceElapsedTime;
    player.freeze();
    this.updateStandings(player, ai, settings);
    this.playerFinalPosition = this.getPlayerPosition();
    sound.playFinish();
  }
}
