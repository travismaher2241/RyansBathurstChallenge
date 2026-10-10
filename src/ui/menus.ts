import { GameMode, GameSettings } from '../types/track';
import { RaceManager } from '../state/raceManager';
import { VehiclePhysics } from '../physics/vehiclePhysics';
import { saveStoredSettings } from '../config/gameConfig';
import { formatLapTime } from '../utils/math';

export class MenuManager {
  private overlay: HTMLElement;

  constructor(
    private onStartRace: (mode: GameMode) => void,
    private onResume: () => void,
    private onRestart: () => void,
    private onSettingsChanged: (newSettings: GameSettings) => void
  ) {
    this.overlay = document.getElementById('ui-overlay')!;
  }

  public showTitleScreen(settings: GameSettings): void {
    this.overlay.innerHTML = `
      <div class="menu-screen">
        <h1 class="menu-title">BATHURST ARCADE</h1>
        <p class="menu-subtitle">MOUNT PANORAMA • 6,213M HISTORIC RECONSTRUCTION</p>

        <div class="menu-btn-group">
          <button id="btn-arcade" class="menu-btn primary">ARCADE RACE (3 LAPS)</button>
          <button id="btn-timetrial" class="menu-btn">TIME TRIAL</button>
          <button id="btn-practice" class="menu-btn">PRACTICE (FREE RUN)</button>
          <button id="btn-settings" class="menu-btn">SETTINGS</button>
          <button id="btn-controls" class="menu-btn">CONTROLS</button>
        </div>
      </div>
    `;

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
        <div style="text-align: left; margin: 20px 0; font-size: 11px; line-height: 1.8; color: #cbd5e1;">
          <p><strong>ACCELERATE:</strong> Up Arrow / W / Touch Gas / Gamepad RT or A</p>
          <p><strong>BRAKE:</strong> Down Arrow / S / Touch Brake / Gamepad LT or X</p>
          <p><strong>STEER:</strong> Left & Right Arrows / A & D / Touch Buttons / Gamepad Stick</p>
          <p><strong>HANDBRAKE:</strong> Spacebar / Gamepad B</p>
          <p><strong>RESET CAR:</strong> R key / Touch Reset / Gamepad Y</p>
          <p><strong>PAUSE:</strong> P or Escape / Touch Pause / Gamepad Start</p>
          <p><strong>DEBUG PANEL:</strong> ~ or \` key</p>
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
          <span>DIFFICULTY</span>
          <select id="set-difficulty" class="menu-select">
            <option value="arcade" ${settings.difficulty === 'arcade' ? 'selected' : ''}>ARCADE (GENEROUS GRIP)</option>
            <option value="pro" ${settings.difficulty === 'pro' ? 'selected' : ''}>PRO (AUTHENTIC LIMITS)</option>
          </select>
        </div>

        <div class="menu-settings-row">
          <span>GEARBOX</span>
          <select id="set-transmission" class="menu-select">
            <option value="auto" ${settings.transmission === 'auto' ? 'selected' : ''}>AUTOMATIC</option>
            <option value="manual" ${settings.transmission === 'manual' ? 'selected' : ''}>MANUAL (Q/E TO SHIFT)</option>
          </select>
        </div>

        <div class="menu-settings-row">
          <span>AUTO-ACCELERATE</span>
          <input type="checkbox" id="set-auto-accel" class="menu-checkbox" ${settings.autoAccelerate ? 'checked' : ''} />
        </div>

        <div class="menu-settings-row">
          <span>CRT SCANLINES</span>
          <input type="checkbox" id="set-crt" class="menu-checkbox" ${settings.crtFilter ? 'checked' : ''} />
        </div>

        <div class="menu-settings-row">
          <span>AUDIO / SFX</span>
          <input type="checkbox" id="set-sound" class="menu-checkbox" ${settings.soundEnabled ? 'checked' : ''} />
        </div>

        <div class="menu-btn-group">
          <button id="btn-save" class="menu-btn primary">SAVE & BACK</button>
        </div>
      </div>
    `;

    document.getElementById('btn-save')?.addEventListener('click', () => {
      const diffEl = document.getElementById('set-difficulty') as HTMLSelectElement;
      const transEl = document.getElementById('set-transmission') as HTMLSelectElement;
      const autoEl = document.getElementById('set-auto-accel') as HTMLInputElement;
      const crtEl = document.getElementById('set-crt') as HTMLInputElement;
      const soundEl = document.getElementById('set-sound') as HTMLInputElement;

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

  public showPauseMenu(settings: GameSettings): void {
    this.overlay.innerHTML = `
      <div class="menu-screen">
        <h1 class="menu-title">PAUSED</h1>
        <div class="menu-btn-group">
          <button id="btn-resume" class="menu-btn primary">RESUME</button>
          <button id="btn-restart" class="menu-btn">RESTART RACE</button>
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
    document.getElementById('btn-pause-settings')?.addEventListener('click', () => {
      this.showSettingsScreen(settings, () => this.showPauseMenu(settings));
    });
    document.getElementById('btn-title')?.addEventListener('click', () => {
      this.showTitleScreen(settings);
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
          <td>${formatLapTime(st.totalTime)}</td>
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
                <th>TIME</th>
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
      this.showTitleScreen(settings);
    });
  }

  public hide(): void {
    this.overlay.innerHTML = '';
  }
}
