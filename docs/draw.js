'use strict';
// 버블 드래곤 — 그리기와 메인 루프

function ell(x, y, rx, ry, c) { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); }
function box(x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); }
function text(s, x, y, size = 10, c = '#fff', align = 'center') {
  g.font = `bold ${size}px "Malgun Gothic",monospace`; g.textAlign = align; g.textBaseline = 'middle';
  g.fillStyle = '#000'; g.fillText(s, x + 1, y + 1); g.fillStyle = c; g.fillText(s, x, y);
}

function drawDragon(p, x = p.x, y = p.y, dir = p.dir, blink = p.inv > 0) {
  if (blink && frame % 6 < 3) return;
  const c = p.col;
  g.save(); g.translate(Math.round(x + 8), Math.round(y + 8)); g.scale(dir, 1);
  const step = p.ground && p.vx && frame % 12 < 6 ? 1 : 0;
  box(-6, 4 - step, 5, 4, c.foot); box(2, 3 + step, 5, 5, c.foot);
  ell(-1, 0, 8, 7, c.body);
  ell(1, 3, 5, 4, c.belly);
  for (let i = 0; i < 3; i++) { g.fillStyle = c.spike; g.beginPath(); g.moveTo(-8, -4 + i * 4); g.lineTo(-11, -2 + i * 4); g.lineTo(-7, -1 + i * 4); g.fill(); }
  ell(5, -1, 4, 3, c.snout);
  ell(1, -4, 3.2, 3.6, '#fff'); ell(2, -4, 1.6, 2, '#112');
  g.restore();
}
function drawEnemy(x, y, dir, angry, sc = 1, col = null) {
  g.save(); g.translate(Math.round(x + 8), Math.round(y + 8)); g.scale(dir * sc, sc);
  const w = frame % 16 < 8 ? 0 : 1;
  box(-6, 5 - w, 4, 3, '#222'); box(2, 4 + w, 4, 4, '#222');
  ell(0, 0, 8, 7.5, col || (angry ? '#e03a3a' : '#9a5ad8'));
  ell(-2, -2, 2.6, 3, '#fff'); ell(3, -2, 2.6, 3, '#fff');
  ell(-1.4, -2, 1.2, 1.6, '#112'); ell(3.6, -2, 1.2, 1.6, '#112');
  if (angry || col) { box(-5, -6, 5, 1.5, '#300'); box(1, -6, 5, 1.5, '#300'); }
  g.restore();
}
function drawBoss(b) {
  const rage = b.hp <= b.max / 2;
  drawEnemy(b.x + 8, b.y + 8, b.dir, true, 2, b.flash % 4 > 1 ? '#fff' : rage ? '#ff5a1a' : '#c03a6a');
  g.fillStyle = '#ffd24a';                               // 왕관
  for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(b.x + 6 + i * 8, b.y + 2); g.lineTo(b.x + 10 + i * 8, b.y - 6); g.lineTo(b.x + 14 + i * 8, b.y + 2); g.fill(); }
}
function drawBubble(b) {
  if (b.sp) {                                            // 특수 거품
    const water = b.sp === 'water';
    g.fillStyle = water ? 'rgba(50,130,255,.5)' : 'rgba(255,230,60,.5)'; g.strokeStyle = water ? '#8cf' : '#ffe860'; g.lineWidth = 1.5;
    g.beginPath(); g.arc(b.x, b.y, b.r, 0, 7); g.fill(); g.stroke();
    if (water) { g.fillStyle = '#e8f6ff'; g.beginPath(); g.moveTo(b.x, b.y - 6); g.quadraticCurveTo(b.x + 6, b.y + 1, b.x, b.y + 5); g.quadraticCurveTo(b.x - 6, b.y + 1, b.x, b.y - 6); g.fill(); }
    else { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(b.x + 2, b.y - 7); g.lineTo(b.x - 4, b.y + 1); g.lineTo(b.x, b.y + 1); g.lineTo(b.x - 2, b.y + 7); g.lineTo(b.x + 4, b.y - 1); g.lineTo(b.x, b.y - 1); g.fill(); }
    return;
  }
  if (b.enemy) {
    const warn = b.trap < 120 && frame % 10 < 5;
    drawEnemy(b.x - 8, b.y - 8, 1, warn || b.enemy.angry, 0.7);
  }
  g.fillStyle = b.enemy ? 'rgba(120,200,255,.35)' : 'rgba(150,220,255,.25)';
  g.strokeStyle = b.enemy && b.trap < 120 && frame % 10 < 5 ? '#ff8a8a' : '#bfe8ff'; g.lineWidth = 1.5;
  g.beginPath(); g.arc(b.x, b.y, b.r, 0, 7); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.arc(b.x - b.r * .35, b.y - b.r * .4, b.r * .22, 0, 7); g.fill();
}
function drawFruit(f) {
  if (f.t > 560 && frame % 8 < 4) return;
  const cx = f.x + 8, cy = f.y + 9;
  if (f.kind === 0) { ell(cx, cy, 6, 6, '#ff3a3a'); box(cx - 1, cy - 9, 2, 4, '#3a2'); }
  else if (f.kind === 1) { ell(cx, cy, 6.5, 6, '#ffa020'); box(cx - 1, cy - 8, 3, 3, '#3a2'); }
  else { ell(cx - 3, cy + 1, 4, 4.5, '#b040e0'); ell(cx + 3, cy + 1, 4, 4.5, '#b040e0'); ell(cx, cy - 3, 4, 4.5, '#c860f0'); box(cx - 1, cy - 9, 2, 3, '#3a2'); }
  ell(cx - 2, cy - 2, 1.5, 1.5, 'rgba(255,255,255,.7)');
}
const ITEM = { shoe:['#3a8aff', 'S'], rapid:['#ff5a3a', 'R'], range:['#3ac86a', 'L'], heart:['#ff4a8a', '♥'] };
function drawItem(it) {
  if (it.t > 700 && frame % 8 < 4) return;
  const [c, ch] = ITEM[it.kind], bob = Math.sin(frame / 8) * 1;
  ell(it.x + 8, it.y + 8 + bob, 7.5, 7.5, '#fff'); ell(it.x + 8, it.y + 8 + bob, 6, 6, c);
  text(ch, it.x + 8, it.y + 9 + bob, 9, '#fff');
}
function drawWave(w) {
  if (w.k === 'w') { ell(w.x + 6, w.y + 6, 7, 6, 'rgba(60,150,255,.85)'); ell(w.x + 4, w.y + 4, 2, 2, '#cfe8ff'); return; }
  const d = Math.sign(w.vx);
  g.strokeStyle = frame % 4 < 2 ? '#fff' : '#ffe040'; g.lineWidth = 2.5; g.beginPath();
  for (let i = 0; i < 5; i++) { const x = w.x + 7 - d * i * 5, y = w.y + 18 + (i % 2 ? 10 : -10); i ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.stroke();
}

function drawHUD() {
  const P1 = players[0], P2 = players[1];
  text(String(P1.score).padStart(6, '0'), 14, 15, 9, '#8f8', 'left');
  text('HI ' + String(hi).padStart(6, '0'), W / 2, 15, 9, '#ff0');
  if (P2) text(String(P2.score).padStart(6, '0'), W - 14, 15, 9, '#8cf', 'right');
  text('R' + level, W - 14, H - 12, 9, '#fff', 'right');
  players.forEach((p, i) => {
    for (let n = 0; n < p.lives; n++) ell(i ? W - 34 - n * 13 : 18 + n * 13, H - 12, 5, 4.5, p.col.body);
    const ups = (p.spd > 1.3 ? 'S' : '') + (p.cdMax < 18 ? 'R' : '') + (p.range > 22 ? 'L' : '');
    if (ups) text(ups, i ? W - 34 : 18 + 56, H - 12, 8, '#ff6', i ? 'right' : 'left');
  });
  if (boss) {                                            // 보스 체력
    box(88, 20, 80, 5, '#400'); box(88, 20, 80 * boss.hp / boss.max, 5, boss.hp <= boss.max / 2 ? '#ff5a1a' : '#e0405a');
    g.strokeStyle = '#fff'; g.lineWidth = 1; g.strokeRect(88.5, 20.5, 79, 4);
  }
}

function draw() {
  const L = lvData(level);
  g.fillStyle = mode === 'title' ? '#10103a' : L.bg; g.fillRect(0, 0, W, H);
  if (mode === 'title') return drawTitle();
  box(0, 0, W, 8, L.c); box(0, 0, 8, H, L.c); box(W - 8, 0, 8, H, L.c);
  box(0, 7, W, 1, L.hi); box(7, 0, 1, H, L.hi);
  for (const p of plats) {
    box(p.x, p.y, p.w, 8, L.c); box(p.x, p.y, p.w, 2, L.hi);
    g.fillStyle = 'rgba(0,0,0,.25)';
    for (let x = p.x + 8; x < p.x + p.w; x += 8) g.fillRect(x, p.y + 2, 1, 6);
    g.fillRect(p.x, p.y + 5, p.w, 1);
  }
  fruits.forEach(drawFruit); items.forEach(drawItem);
  enemies.forEach(e => drawEnemy(e.x, e.y, e.dir, e.angry));
  if (boss) drawBoss(boss);
  bubbles.forEach(drawBubble); waves.forEach(drawWave);
  for (const s of shots) { ell(s.x + 4, s.y + 4, 5, 5, '#ff7a1a'); ell(s.x + 4, s.y + 4, 2.5, 2.5, '#ffe080'); }
  players.forEach(p => { if (!p.out && !p.deadT) drawDragon(p); });
  parts.forEach(p => box(p.x, p.y, 2, 2, p.c));
  drawHUD();
  if (bannerT > 0) {
    text(isBoss(level) ? '⚠ BOSS ⚠' : 'ROUND ' + level, W / 2, H / 2, 16, isBoss(level) ? '#f55' : '#fff');
  }
  if (clearT > 20) text('STAGE CLEAR!', W / 2, H / 2, 16, '#ff0');
  if (mode === 'over') {
    g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 62, W, 100);
    text('GAME OVER', W / 2, 86, 22, '#f55');
    players.forEach((p, i) => text((players.length > 1 ? (i + 1) + 'P ' : 'SCORE ') + p.score, W / 2, 112 + i * 14, 10, i ? '#8cf' : '#8f8'));
    const best = Math.max(...players.map(p => p.score));
    text(best >= hi && best > 0 ? 'NEW BEST!' : 'BEST ' + hi, W / 2, 112 + players.length * 14, 9, '#ff0');
    if (overT > 60 && frame % 60 < 40) text('ENTER 또는 화면 터치', W / 2, 150, 9, '#fff');
  }
}

function drawTitle() {
  text('버블 드래곤', W / 2, 44, 28, '#6fe07a');
  drawBubble({ x:50, y:96, r:10, enemy:{}, trap:400 });
  drawDragon(players[0] || mkPlayer(0), 92, 88, 1, false);
  drawDragon(mkPlayer(1), 148, 88, -1, false);
  drawBubble({ x:206, y:96, r:9, sp:'bolt' });
  text('거품으로 적을 가둔 뒤 터뜨리세요!', W / 2, 124, 10, '#cfe');
  [['1 PLAYER', 150], ['2 PLAYERS', 182]].forEach(([s, y], i) => {
    const sel = numP === i + 1;
    g.fillStyle = sel ? 'rgba(255,230,60,.2)' : 'rgba(255,255,255,.06)'; g.fillRect(64, y - 14, 128, 28);
    g.strokeStyle = sel ? '#ff0' : '#557'; g.lineWidth = 1.5; g.strokeRect(64, y - 14, 128, 28);
    text((sel ? '▶ ' : '') + s, W / 2, y, 12, sel ? '#ff0' : '#aab');
  });
  if (frame % 60 < 40) text('ENTER 또는 버튼을 눌러 시작', W / 2, 208, 9, '#fff');
  text('BEST ' + hi, W / 2, 218, 8, '#ff0');
}

// ---------- 루프 (60fps 고정) ----------
let last = performance.now(), acc = 0;
function loop(t) {
  acc += Math.min(100, t - last); last = t;
  while (acc >= 1000 / 60) { update(); acc -= 1000 / 60; }
  draw(); requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
