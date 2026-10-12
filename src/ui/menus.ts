import { GameMode, GameSettings } from '../types/track';
import { RaceManager } from '../state/raceManager';
import { VehiclePhysics } from '../physics/vehiclePhysics';
import { saveStoredSettings } from '../config/gameConfig';
import { formatLapTime } from '../utils/math';

export const BATHURST_SECTORS = [
  { name: 'Pit Straight (Start/Finish)', s: 0 },
  { name: 'Hell Corner (Turn 1)', s: 240 },
  { name: 'Mountain Straight', s: 650 },
  { name: "Griffin's Bend (Turn 2)", s: 1450 },
  { name: 'The Cutting (Turn 3/4)', s: 1750 },
  { name: 'Reid Park & Sulman (Turn 5/6)', s: 2100 },
  { name: 'McPhillamy Park (Turn 10)', s: 2900 },
  { name: "Brock's Skyline (Turn 11)", s: 3150 },
  { name: 'The Esses & Dipper (Turns 12-17)', s: 3300 },
  { name: "Forrest's Elbow (Turn 18)", s: 3700 },
  { name: 'Conrod Straight', s: 4250 },
  { name: 'The Chase (Turns 20-22)', s: 5250 },
  { name: "Murray's Corner (Turn 23)", s: 5920 },
];

export class MenuManager {
  private overlay: HTMLElement;

  constructor(
    private onStartRace: (mode: GameMode) => void,
    private onResume: () => void,
    private onRestart: () => void,
    private onExitToTitle: () => void,
    private onSettingsChanged: (newSettings: GameSettings) => void,
    private onSectorSelect?: (s_m: number) => void
  ) {
    this.overlay = document.getElementById('ui-overlay')!;
  }

  public showTitleScreen(settings: GameSettings): void {
    const isRedBull = settings.carChoice === 'redbull';
    const isShell = settings.carChoice === 'shell';

    this.overlay.innerHTML = `
      <div class="menu-screen">
        <h1 class="menu-title">BATHURST ARCADE</h1>
        <p class="menu-subtitle">MOUNT PANORAMA • 6,213M HISTORIC RECONSTRUCTION</p>

        <!-- V8 Supercars Team Selection -->
        <div class="team-picker-section">
          <div class="team-picker-title">CHOOSE YOUR V8 SUPERCAR:</div>
          <div class="team-cards-row">
            <button id="pick-redbull" class="team-card ${isRedBull ? 'active-redbull' : ''}">
              <div class="team-card-badge redbull-bg">888</div>
              <div class="team-card-text">
                <div class="team-card-name">RED BULL AMPOL RACING</div>
                <div class="team-card-car">CHEVROLET CAMARO ZL1 • #888 WILL BROWN</div>
              </div>
              ${isRedBull ? '<span class="team-check">✓ SELECTED</span>' : ''}
            </button>

            <button id="pick-shell" class="team-card ${isShell ? 'active-shell' : ''}">
              <div class="team-card-badge shell-bg">17</div>
              <div class="team-card-text">
                <div class="team-card-name">SHELL V-POWER RACING</div>
                <div class="team-card-car">FORD MUSTANG GT • #17 BRODIE KOSTECKI</div>
              </div>
              ${isShell ? '<span class="team-check">✓ SELECTED</span>' : ''}
            </button>
          </div>
        </div>

        <div class="menu-btn-group">
          <button id="btn-arcade" class="menu-btn primary">ARCADE RACE (3 LAPS)</button>
          <button id="btn-timetrial" class="menu-btn">TIME TRIAL</button>
          <button id="btn-practice" class="menu-btn">PRACTICE (FREE RUN)</button>
          <button id="btn-settings" class="menu-btn">SETTINGS</button>
          <button id="btn-controls" class="menu-btn">CONTROLS</button>
        </div>
      </div>
    `;

    document.getElementById('pick-redbull')?.addEventListener('click', () => {
      settings.carChoice = 'redbull';
      saveStoredSettings(settings);
      this.onSettingsChanged(settings);
      this.showTitleScreen(settings);
    });

    document.getElementById('pick-shell')?.addEventListener('click', () => {
      settings.carChoice = 'shell';
      saveStoredSettings(settings);
      this.onSettingsChanged(settings);
      this.showTitleScreen(settings);
    });

    document.getElementById('btn-arcade')?.addEventListener('click', () => this.onStartRace('arcade'));
    document.getElementById('btn-timetrial')?.addEventListener('click', () => this.onStartRace('timetrial'));
    document.getElementById('btn-practice')?.addEventListener('click', () => this.onStartRace('practice'));
    document.getElementById('btn-settings')?.addEventListener('click', () => this.showSettingsScreen(settings, () => this.showTitleScreen(settings)));
    document.getElementById('btn-controls')?.addEventListener('click', () => this.showControlsScreen(() => this.showTitleScreen(settings)));
  }

  public showControlsScreen(onBack: () => void): void {
    this.overlay.innerHTML = `
      <div class="menu-screen">
        <h1 class="menu-title">CONTROLS</h1>
        <div style="text-align: left; margin: 18px 0; font-size: 11px; line-height: 1.8; color: #cbd5e1;">
          <p><strong>ACCELERATE:</strong> Up Arrow / W / Touch Gas / Gamepad RT or A</p>
          <p><strong>BRAKE:</strong> Down Arrow / S / Touch Brake / Gamepad LT or X</p>
          <p><strong>STEER:</strong> Left & Right Arrows / A & D / Touch Buttons / Gamepad Stick</p>
          <p><strong>MANUAL SHIFT:</strong> E / Right Shift (Up), Q / Right Ctrl (Down), Gamepad RB/LB, or Touch Shift</p>
          <p><strong>HANDBRAKE:</strong> Spacebar / Gamepad B</p>
          <p><strong>RESET CAR:</strong> R key / Touch Reset / Gamepad Y</p>
          <p><strong>PAUSE / RESUME:</strong> P or Escape / Touch Pause / Gamepad Start</p>
          <p><strong>FULLSCREEN:</strong> Touch ⛶ FULL</p>
        </div>
        <div class="menu-btn-group">
          <button id="btn-back" class="menu-btn primary">BACK</button>
        </div>
      </div>
    `;
    document.getElementById('btn-back')?.addEventListener('click', onBack);
  }

  public showSettingsScreen(settings: GameSettings, onBack: () => void): void {
    this.overlay.innerHTML = `
      <div class="menu-screen">
        <h1 class="menu-title">SETTINGS</h1>

        <div class="menu-settings-row">
          <label for="set-car">SUPERCAR TEAM</label>
          <select id="set-car" class="menu-select">
            <option value="redbull" ${settings.carChoice === 'redbull' ? 'selected' : ''}>RED BULL AMPOL #888 - WILL BROWN (CAMARO ZL1)</option>
            <option value="shell" ${settings.carChoice === 'shell' ? 'selected' : ''}>SHELL V-POWER #17 - BRODIE KOSTECKI (MUSTANG GT)</option>
          </select>
        </div>

        <div class="menu-settings-row">
          <label for="set-difficulty">DIFFICULTY</label>
          <select id="set-difficulty" class="menu-select">
            <option value="arcade" ${settings.difficulty === 'arcade' ? 'selected' : ''}>ARCADE (GENEROUS GRIP)</option>
            <option value="pro" ${settings.difficulty === 'pro' ? 'selected' : ''}>PRO (AUTHENTIC LIMITS)</option>
          </select>
        </div>

        <div class="menu-settings-row">
          <label for="set-transmission">GEARBOX</label>
          <select id="set-transmission" class="menu-select">
            <option value="auto" ${settings.transmission === 'auto' ? 'selected' : ''}>AUTOMATIC</option>
            <option value="manual" ${settings.transmission === 'manual' ? 'selected' : ''}>MANUAL (Q/E TO SHIFT)</option>
          </select>
        </div>

        <div class="menu-settings-row">
          <label for="set-auto-accel">AUTO-ACCELERATE</label>
          <input type="checkbox" id="set-auto-accel" class="menu-checkbox" ${settings.autoAccelerate ? 'checked' : ''} />
        </div>

        <div class="menu-settings-row">
          <label for="set-crt">CRT SCANLINES</label>
          <input type="checkbox" id="set-crt" class="menu-checkbox" ${settings.crtFilter ? 'checked' : ''} />
        </div>

        <div class="menu-settings-row">
          <label for="set-sound">AUDIO / SFX</label>
          <input type="checkbox" id="set-sound" class="menu-checkbox" ${settings.soundEnabled ? 'checked' : ''} />
        </div>

        <div class="menu-btn-group">
          <button id="btn-save" class="menu-btn primary">SAVE & BACK</button>
        </div>
      </div>
    `;

    document.getElementById('btn-save')?.addEventListener('click', () => {
      const carEl = document.getElementById('set-car') as HTMLSelectElement;
      const diffEl = document.getElementById('set-difficulty') as HTMLSelectElement;
      const transEl = document.getElementById('set-transmission') as HTMLSelectElement;
      const autoEl = document.getElementById('set-auto-accel') as HTMLInputElement;
      const crtEl = document.getElementById('set-crt') as HTMLInputElement;
      const soundEl = document.getElementById('set-sound') as HTMLInputElement;

      if (carEl) settings.carChoice = carEl.value as 'redbull' | 'shell';
      settings.difficulty = diffEl.value as 'arcade' | 'pro';
      settings.transmission = transEl.value as 'auto' | 'manual';
      settings.autoAccelerate = autoEl.checked;
      settings.crtFilter = crtEl.checked;
      settings.soundEnabled = soundEl.checked;

      saveStoredSettings(settings);
      this.onSettingsChanged(settings);
      onBack();
    });
  }

  public showPauseMenu(settings: GameSettings, mode: GameMode = 'arcade'): void {
    const isPractice = mode === 'practice';
    this.overlay.innerHTML = `
      <div class="menu-screen">
        <h1 class="menu-title">PAUSED</h1>
        <div class="menu-btn-group">
          <button id="btn-resume" class="menu-btn primary">RESUME</button>
          <button id="btn-restart" class="menu-btn">RESTART RACE</button>
          ${isPractice ? '<button id="btn-sector-select" class="menu-btn">SELECT SECTOR / CORNER</button>' : ''}
          <button id="btn-pause-settings" class="menu-btn">SETTINGS</button>
          <button id="btn-title" class="menu-btn">EXIT TO TITLE</button>
        </div>
      </div>
    `;

    document.getElementById('btn-resume')?.addEventListener('click', () => {
      this.hide();
      this.onResume();
    });
    document.getElementById('btn-restart')?.addEventListener('click', () => {
      this.hide();
      this.onRestart();
    });
    if (isPractice) {
      document.getElementById('btn-sector-select')?.addEventListener('click', () => {
        this.showSectorSelectScreen(settings, mode);
      });
    }
    document.getElementById('btn-pause-settings')?.addEventListener('click', () => {
      this.showSettingsScreen(settings, () => this.showPauseMenu(settings, mode));
    });
    document.getElementById('btn-title')?.addEventListener('click', () => {
      this.hide();
      this.onExitToTitle();
    });
  }

  public showSectorSelectScreen(settings: GameSettings, mode: GameMode): void {
    let buttonsHtml = '';
    BATHURST_SECTORS.forEach((sec) => {
      buttonsHtml += `<button class="menu-btn sector-jump-btn" data-s="${sec.s}">${sec.name}</button>`;
    });

    this.overlay.innerHTML = `
      <div class="menu-screen">
        <h1 class="menu-title">SELECT SECTOR</h1>
        <p class="menu-subtitle">TELEPORT DIRECTLY TO ANY CORNER OR STRAIGHT</p>
        <div class="menu-btn-group" style="max-height: 280px; overflow-y: auto;">
          ${buttonsHtml}
        </div>
        <div class="menu-btn-group" style="margin-top: 14px;">
          <button id="btn-sector-back" class="menu-btn primary">BACK</button>
        </div>
      </div>
    `;

    this.overlay.querySelectorAll('.sector-jump-btn').forEach((el) => {
      el.addEventListener('click', () => {
        const sVal = parseFloat(el.getAttribute('data-s') || '0');
        this.hide();
        if (this.onSectorSelect) {
          this.onSectorSelect(sVal);
        }
        this.onResume();
      });
    });

    document.getElementById('btn-sector-back')?.addEventListener('click', () => {
      this.showPauseMenu(settings, mode);
    });
  }

  public showFinishScreen(race: RaceManager, player: VehiclePhysics, settings: GameSettings): void {
    const isArcade = race.mode === 'arcade';
    const pos = race.playerFinalPosition;
    const posSuffix = ['ST', 'ND', 'RD', 'TH'][Math.min(pos - 1, 3)];

    let rowsHtml = '';
    race.standings.forEach((st) => {
      const rowClass = st.isPlayer ? 'player-row' : '';
      rowsHtml += `
        <tr class="${rowClass}">
          <td>${st.position}</td>
          <td>${st.name}</td>
          <td>${st.gapText || (st.finished ? formatLapTime(st.totalTime) : `${st.speedKmh} KM/H`)}</td>
          <td>${st.speedKmh} KM/H</td>
        </tr>
      `;
    });

    this.overlay.innerHTML = `
      <div class="menu-screen">
        <h1 class="menu-title">CHECKERED FLAG!</h1>
        <p class="menu-subtitle">
          ${isArcade ? `YOU FINISHED <strong>${pos}${posSuffix}</strong> OF 8!` : 'TIME TRIAL SESSION COMPLETE'}
        </p>

        <p style="font-size: 12px; margin-bottom: 12px; color: #8ecae6;">
          BEST LAP: <strong style="color: #ffb703;">${player.bestLapTime ? formatLapTime(player.bestLapTime) : '--:--.---'}</strong>
          • TOTAL: <strong>${formatLapTime(race.playerFinalTime)}</strong>
        </p>

        ${isArcade ? `
          <table class="results-table">
            <thead>
              <tr>
                <th>POS</th>
                <th>DRIVER</th>
                <th>GAP / TIME</th>
                <th>SPEED</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        ` : ''}

        <div class="menu-btn-group">
          <button id="btn-retry" class="menu-btn primary">RACE AGAIN</button>
          <button id="btn-menu" class="menu-btn">RETURN TO TITLE</button>
        </div>
      </div>
    `;

    document.getElementById('btn-retry')?.addEventListener('click', () => {
      this.hide();
      this.onRestart();
    });
    document.getElementById('btn-menu')?.addEventListener('click', () => {
      this.hide();
      this.onExitToTitle();
    });
  }

  public hide(): void {
    this.overlay.innerHTML = '';
  }
}
