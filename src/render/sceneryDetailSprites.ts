import type { ScenerySprites } from './spriteGenerator';

/** Cached canvas artwork: no network assets and no per-frame procedural work. */
export function createDetailSprites(sprites: ScenerySprites): void {
  const make = (key: string, width: number, height: number, draw: (c: CanvasRenderingContext2D) => void) => {
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    draw(canvas.getContext('2d')!);
    sprites[key] = canvas;
  };
  const ellipse = (c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color: string) => {
    c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill();
  };
  const polygon = (c: CanvasRenderingContext2D, points: number[][], color: string) => {
    c.fillStyle = color; c.beginPath();
    points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
    c.closePath(); c.fill();
  };
  for (let variant = 0; variant < 8; variant++) {
    make(`gum_${variant}`, 160, 240, c => {
      let seed = variant * 931 + 17;
      const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
      const lean = (variant - 3.5) * 3;
      ellipse(c, 80, 235, 31, 4, 'rgba(39,48,29,.16)');
      polygon(c, [[74,237],[85,237],[83 + lean,93],[72 + lean,96]], '#a99b7f');
      polygon(c, [[78,237],[83,236],[80 + lean,99],[76 + lean,98]], '#ded4b7');
      for (let b = 0; b < 7; b++) {
        const x = 26 + rand() * 108, y = 28 + rand() * 104;
        c.strokeStyle = b % 2 ? '#b5aa90' : '#d5c9aa'; c.lineWidth = 3 + rand() * 3;
        c.beginPath(); c.moveTo(79 + lean * .5, 169 - b * 8);
        c.quadraticCurveTo(80 + lean, y + 44, x, y + 12); c.stroke();
        for (let f = 0; f < 9; f++) {
          const colors = ['#435c43', '#526b4c', '#627953', '#768666', '#899273'];
          ellipse(c, Math.max(18, Math.min(142, x + (rand() - .5) * 35)),
            y + (rand() - .5) * 22, 12 + rand() * 9, 7 + rand() * 7, colors[f % colors.length]);
        }
      }
    });
  }
  make('dry_scrub', 120, 55, c => {
    for (let i = 0; i < 12; i++) {
      ellipse(c, 10 + i * 9, 35 + Math.sin(i * 3) * 8, 13, 12, ['#727853','#8c9060','#9b9968'][i % 3]);
    }
    c.strokeStyle = '#b7a77a';
    for (let i = 0; i < 15; i++) { c.beginPath(); c.moveTo(i * 8, 55); c.lineTo(i * 8 + 5, 33); c.stroke(); }
  });
  make('cutting_bank', 240, 150, c => {
    const edge = [[0,150],[0,65],[25,49],[55,55],[86,25],[111,33],[136,15],[171,34],[196,47],[220,40],[240,71],[240,150]];
    polygon(c, edge, '#8e836b');
    c.save(); c.beginPath(); edge.forEach(([x,y],i) => i ? c.lineTo(x,y) : c.moveTo(x,y)); c.closePath(); c.clip();
    for (let y = 37; y < 150; y += 18) {
      polygon(c, [[0,y+14],[240,y-12],[240,y+2],[0,y+25]], y % 3 ? '#a2967c' : '#6f6b5a');
      c.strokeStyle = '#655f50'; c.lineWidth = 2;
      for (let x = 12; x < 240; x += 41) { c.beginPath(); c.moveTo(x + y % 17, y); c.lineTo(x - 7, y + 22); c.stroke(); }
    }
    c.restore();
    for (let i = 0; i < 9; i++) ellipse(c, 15 + i * 26, 65 - Math.sin(i * .4) * 38, 16, 7, '#7c8054');
  });
  make('vine_row', 240, 48, c => {
    c.strokeStyle = '#86795b'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0,30); c.lineTo(240,30); c.stroke();
    for (let x = 8; x < 240; x += 24) {
      c.fillStyle = '#a29070'; c.fillRect(x, 16, 3, 32);
      ellipse(c, x + 8, 20, 15, 12, '#687b44');
      ellipse(c, x + 12, 16, 10, 7, '#8a9254');
    }
  });
  make('orchard_tree', 90, 90, c => {
    c.fillStyle = '#8c7958'; c.fillRect(42,37,6,53);
    ellipse(c,45,37,39,30,'#576e42'); ellipse(c,33,27,26,21,'#778b51');
    ellipse(c,61,34,24,23,'#697e48');
  });
  for (let variant = 0; variant < 3; variant++) make(`dome_${variant}`, 100, 55, c => {
    const colors = ['#b28a4b','#607e88','#7c8556'];
    c.fillStyle = colors[variant]; c.beginPath(); c.ellipse(50,53,47,47,0,Math.PI,Math.PI * 2); c.fill();
    polygon(c, [[43,9],[69,53],[40,53]], '#344347');
    c.strokeStyle = '#d4c8a5'; c.lineWidth = 2; c.beginPath(); c.moveTo(8,53); c.quadraticCurveTo(34,-29,76,53); c.stroke();
  });
  make('caravan', 150, 75, c => {
    ellipse(c,35,67,10,8,'#303637'); ellipse(c,116,67,10,8,'#303637');
    c.fillStyle = '#dddcd1'; c.fillRect(5,8,133,56);
    c.fillStyle = '#f4f0df'; c.fillRect(10,3,121,10);
    c.fillStyle = '#798d92'; c.fillRect(16,17,37,20); c.fillRect(87,17,37,20);
    c.fillStyle = '#a5ada8'; c.fillRect(62,16,18,46);
    c.fillStyle = '#607b80'; c.fillRect(5,44,133,5);
    c.fillStyle = '#8c8774'; c.fillRect(138,58,12,4);
  });
  make('camp_ute', 130, 52, c => {
    ellipse(c,26,43,12,9,'#272e30'); ellipse(c,104,43,12,9,'#272e30');
    polygon(c, [[2,22],[25,22],[36,5],[70,5],[83,23],[127,25],[128,41],[2,41]], '#bfc4b9');
    polygon(c, [[33,21],[40,10],[65,10],[73,22]], '#526c76');
    c.fillStyle = '#8d978f'; c.fillRect(83,20,42,5);
  });
  make('spectators', 140, 58, c => {
    for (let i = 0; i < 8; i++) {
      const x = 7 + i * 17, y = i % 3 * 3;
      c.fillStyle = '#434842'; c.fillRect(x,33+y,4,24-y); c.fillRect(x+6,33+y,4,24-y);
      c.fillStyle = ['#304963','#b7604b','#d4caa9','#677957'][i%4]; c.fillRect(x-2,15+y,14,23);
      ellipse(c,x+5,10+y,5,6,'#bb9374');
      c.fillStyle = '#c8b98e'; c.fillRect(x-3,5+y,17,3);
    }
  });
  make('country_house', 200, 90, c => {
    c.fillStyle = '#c0b39a'; c.fillRect(20,36,160,54);
    polygon(c, [[4,38],[49,7],[153,7],[197,38]], '#7e8985');
    c.fillStyle = '#4e666b';
    for (const x of [35,72,135]) c.fillRect(x,47,23,24);
    c.fillStyle = '#706c59'; c.fillRect(104,48,17,42);
    c.fillStyle = '#aaa68d'; c.fillRect(13,70,175,5);
    for (const x of [18,62,128,179]) c.fillRect(x,48,3,42);
  });
  // Reuse established building art in a modular layout; cars are untouched.
  sprites.detail_pit = sprites.pit_building;
  sprites.detail_stand = sprites.grandstand;
  sprites.detail_paddock = sprites.paddock;
  sprites.detail_hotel = sprites.hotel;
}
