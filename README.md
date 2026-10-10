# Bathurst Arcade — Mount Panorama

A retro pseudo-3D arcade browser racing game set at the historic **Mount Panorama Circuit** in Bathurst, Australia.

Built with TypeScript, Vite, and HTML5 Canvas 2D, the game recreates the raw sensation of late-1980s / early-1990s touring-car arcade classics (such as *OutRun*, *Virtua Racing*, and Group A touring-car challenges) powered by the continuous 6,213 m digital reconstruction of the Mount Panorama circuit.

---

## Features

- **Full Mount Panorama Circuit**:
  - Exact **6,213 m** lap length (modulo 6,213 wrapping).
  - Anticlockwise racing direction across all **1,243 road segments** (1,242 × 5 m plus a final 3 m segment).
  - True continuous elevation profile preserving the **~174 m of vertical relief** from Pit Straight (706 m) up Mountain Straight, through The Cutting, past Reid and Sulman Parks to McPhillamy and Brock's Skyline (~874 m), plunging down the Esses and Dipper, and roaring along Conrod Straight into The Chase and Murray's Corner.
  - Authentic **blind crest occlusion** at Brock's Skyline where the descent disappears over the mountain horizon before revealing the Esses.
- **Classic Touring Car Presentation**:
  - Detailed rear-view touring-car sprite with multi-angle steering views (straight, slight left/right, hard left/right).
  - Glowing red brake lamps with bloom, tyre smoke particles on hard braking/sliding, and sparks on barrier contact.
  - 8 distinct racing liveries (Player #17 touring car + 7 AI competitors including classic Australian liveries).
- **Game Modes**:
  - **Arcade Race**: 3 laps against 7 AI opponents on a staggered grid. Real-time race position tracking (1st to 8th), final-lap warning, and post-race standings table.
  - **Time Trial**: Open lap session with live lap timer, last lap, personal best, and persistent local storage saving.
  - **Practice (Free Run)**: Open track exploration without timer pressure, allowing free reset and corner learning.
- **Physics & Touring Car Dynamics**:
  - Speeds up to **295–300 km/h** on Conrod Straight.
  - 6-speed transmission with realistic gear ratios and RPM redline (Automatic by default, Manual optional).
  - Curvature-based lateral cornering acceleration ($a_{lat} = v^2 \cdot |\kappa|$) with controllable tyre scrub when entering tight bends too fast.
  - Off-road grass and gravel drag penalties.
  - Instant reset-to-track action (`R` key) with 2.5-second ghost recovery.
  - Selectable difficulty modes: **Arcade** (generous grip) vs **Pro** (authentic touring-car grip limits).
- **Custom Web Audio Synthesizer**:
  - Procedural multi-oscillator engine roar tied to RPM, throttle load, and gearing.
  - Turbo blow-off valve / transmission shift thud.
  - Tyre screech filtered noise modulated by slide intensity.
  - Low-frequency rumble on kerbs and off-road surfaces.
  - Barrier impact crunches, retro countdown tones, victory fanfare, and Pit Straight grandstand crowd atmosphere.
- **Controls & Cross-Platform Support**:
  - **Keyboard**: Arrow keys or `WASD` to steer/accelerate/brake, `Space` for handbrake, `R` to reset, `P` or `Esc` to pause, `~` for debug panel.
  - **Gamepad**: Full HTML5 Gamepad API support (left stick steer, RT/A gas, LT/X brake, Y/Back reset).
  - **Touchscreen**: Large on-screen steering buttons and separate gas/brake pedals with multi-touch support.
  - **Desktop / Mobile**: Responsive landscape presentation with mobile orientation prompt and focus-loss safety (releasing stuck inputs on blur).
- **HUD & Developer Tools**:
  - Live circuit minimap generated from true centreline coordinates with real-time car markers.
  - Digital speedometer (km/h) and tachometer bar graph with redline indicator.
  - Named sector toast notifications (Pit Straight, Hell Corner, Mountain Straight, Griffin's Bend, The Cutting, Reid Park, Sulman Park, McPhillamy Park, Brock's Skyline, The Esses, The Dipper, Forrest's Elbow, Conrod Straight, The Chase, Murray's Corner).
  - In-game developer debug panel (`~` key) with live chainage ($s$), speed, lateral offset, curvature, gradient, elevation, FPS counter, and instant teleport to any circuit sector.

---

## Circuit Data & Provenance Notice

This circuit model is built directly upon the digital reconstruction package:
- **Geometry & Centreline**: NSW Spatial Services Transport RoadSegment mapping, 12 m horizontal Gaussian smoothing, and local tangent plane coordinates length-calibrated to exactly 6,213 m.
- **Elevation**: NSW 5 m Stereo Elevation DEM sampling, with ~174 m of relief (minimum ~700 m, maximum ~874 m).
- **Accuracy Class**: This is a GIS-based digital approximation for an arcade racing game, **not** a laser scan, survey-grade mesh, or commercial engineering CAD model. Road widths, barriers, and scenery placement are labelled estimates based on NSW mapping and organiser schematics.

Full technical documentation and geometry calculations are preserved in:
- `ACCURACY_REPORT.md`
- `ACCURACY_REPORT.html`
- `data/metadata.json`
- `data/validation.json`

---

## Local Run & Build Instructions

### Prerequisites
- Node.js (v18+ recommended)
- npm

### 1. Install Dependencies
```bash
npm install
```

### 2. Development Server
```bash
npm run dev
```
Open `http://localhost:3000` (or the terminal port) in any modern browser.

### 3. Production Build
```bash
npm run build
```
Generates optimized, bundled assets in the `dist/` directory.

### 4. Preview / Serve Production Build
```bash
node serve.cjs
```
Runs the included zero-dependency static server on `http://localhost:8090`.

---

## Hosting on Vercel

The project is fully pre-configured for **Vercel** with [`vercel.json`](file:///c:/Users/travi/OneDrive/Desktop/Ryan's%20Bathurst%20Challenge/vercel.json), `.gitignore`, and optimized asset caching headers.

### Option A: Deploy via GitHub (Recommended)
1. Push this project to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Bathurst Arcade"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```
2. Go to [vercel.com/new](https://vercel.com/new) and log in.
3. Import your GitHub repository.
4. Vercel automatically detects the **Vite** preset, build command (`npm run build`), and output directory (`dist`).
5. Click **Deploy**. Your game will be live globally on a `*.vercel.app` domain with HTTPS and CDN caching.

### Option B: Deploy Directly via Vercel CLI
You can also deploy directly from your local machine using the terminal:
```bash
# 1. Run Vercel CLI (login and preview deployment)
npx vercel

# 2. Deploy to Production
npx vercel --prod
```
The CLI will link the project, build the assets, and provide your live production URL instantly.

## Verification & Automated Testing

Run the included verification suite:
```bash
node test_suite.cjs
```

Verified checks:
- Lap length is exactly 6,213 m.
- Segment count is exactly 1,243 (1,242 × 5 m + 1 × 3 m).
- Track polyline coordinates close at $(0, 0)$ with zero closure gap.
- Elevation relief matches DEM data (~174 m).
- Curvature signs produce correct anticlockwise turn directions (Hell Corner Left, Griffin's Bend Right, The Cutting Left, Murray's Corner Left).
- Unwrapped race distance calculation correctly resolves positions across the timing line.
- Zero NaN or non-finite values in road geometry.
- Full visual validation via headless Chrome screenshots across all key sectors: Pit Straight, The Cutting, Brock's Skyline crest, The Esses / Dipper, Conrod Straight, and The Chase.
