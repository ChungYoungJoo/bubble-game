'use strict';
// 버블 드래곤 — 게임 로직 (그리기는 draw.js)
const W = 256, H = 224;
const cv = document.getElementById('c'), g = cv.getContext('2d');

// ---------- 화면 크기 (정수 배율로 또렷하게) ----------
function fit() {
  const padH = matchMedia('(pointer:coarse)').matches ? 110 : 56;
  const raw = Math.min((innerWidth - 8) / W, (innerHeight - padH) / H);
  const s = matchMedia('(pointer:coarse)').matches ? Math.max(1, raw) : Math.max(1, Math.floor(raw));
  cv.style.width = Math.floor(W * s) + "px";
  cv.style.height = Math.floor(H * s) + "px";
}
addEventListener('resize', fit); fit();

// ---------- 입력 ----------
// A: 방향키+Space(+Z/X)   B: A D W F   T: 화면 버튼   게임패드는 번호별로 따로
const S = { A:{}, B:{}, T:{} };
const KM = { ArrowLeft:['A','left'], ArrowRight:['A','right'], ArrowUp:['A','jump'], ' ':['A','shoot'], z:['A','jump'], x:['A','shoot'],
             a:['B','left'], d:['B','right'], w:['B','jump'], f:['B','shoot'], g:['B','shoot'] };
let startEdge = false;
function setKey(m, v) { const k = S[m[0]]; if (v && m[1] === 'jump' && !k.jump) k.jl = 1; k[m[1]] = v; }
addEventListener('keydown', e => {
  if (e.key === 'Enter') startEdge = true;
  const m = KM[e.key] || KM[e.key.toLowerCase()];
  if (!m) return;
  e.preventDefault(); setKey(m, true);
});
addEventListener('keyup', e => { const m = KM[e.key] || KM[e.key.toLowerCase()]; if (m) setKey(m, false); });
addEventListener('blur', () => { for (const k in S) S[k] = {}; });
document.querySelectorAll('#pad button').forEach(b => {
  const m = ['T', b.dataset.k];
  const down = e => { e.preventDefault(); setKey(m, true); b.classList.add('on'); };
  const up = e => { e.preventDefault(); setKey(m, false); b.classList.remove('on'); };
  b.addEventListener('pointerdown', down);
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => b.addEventListener(t, up));
});
cv.addEventListener('pointerdown', () => { startEdge = true; });

const padOf = i => { const l = navigator.getGamepads ? navigator.getGamepads() : []; const p = l[i]; return p && p.connected ? p : null; };
const padBtn = (p, i) => !!(p.buttons[i] && p.buttons[i].pressed);
let startHeld = false;
function pollStart() {
  let s = false;
  for (let i = 0; i < 2; i++) { const p = padOf(i); if (p && (padBtn(p, 0) || padBtn(p, 9))) s = true; }
  if (s && !startHeld) startEdge = true;
  startHeld = s;
}
function inp(p) {
  const srcs = ['A', 'B', 'T'];
  const o = { left:0, right:0, jump:0, shoot:0, edge:0 };
  for (const s of srcs) { const k = S[s]; o.left |= k.left; o.right |= k.right; o.jump |= k.jump; o.shoot |= k.shoot; if (k.jl) { o.edge = 1; k.jl = 0; } }
  const gp = padOf(p.id);
  if (gp) {
    const ax = gp.axes[0] || 0;
    o.left |= ax < -0.4 || padBtn(gp, 14); o.right |= ax > 0.4 || padBtn(gp, 15);
    const j = padBtn(gp, 0); if (j && !p.gj) o.edge = 1; p.gj = j; o.jump |= j;
    o.shoot |= padBtn(gp, 2) || padBtn(gp, 1);
  }
  return o;
}

// ---------- 소리 (WebAudio, 파일 없음) ----------
let ac = null;
function sfx(f, d = 0.08, type = 'square', slide = 0) {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), v = ac.createGain(), t = ac.currentTime;
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.linearRampToValueAtTime(Math.max(30, f + slide), t + d);
    v.gain.setValueAtTime(0.05, t); v.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(v); v.connect(ac.destination); o.start(t); o.stop(t + d);
  } catch (e) {}
}

// ---------- 스테이지 ----------
// 발판: [x, y, 너비]  (두께 8, 아래에서 뛰어오르면 통과 / 위에서는 착지)
const LEVELS = [
  { bg:'#10103a', c:'#3a6ad8', hi:'#8ab4ff', p:[[8,208,240],[24,168,88],[144,168,88],[8,128,56],[96,128,64],[192,128,56],[40,88,72],[144,88,72],[8,48,64],[184,48,64]] },
  { bg:'#1a0f2e', c:'#c8509a', hi:'#ff9ad0', p:[[8,208,96],[152,208,96],[8,168,64],[96,168,64],[184,168,64],[40,128,72],[144,128,72],[8,88,64],[96,88,64],[184,88,64],[56,48,144]] },
  { bg:'#0c2418', c:'#3aa860', hi:'#8af0a8', p:[[8,208,240],[8,168,104],[144,168,104],[64,128,128],[8,88,80],[168,88,80],[72,48,112]] },
  { bg:'#2a1a0c', c:'#d8903a', hi:'#ffd08a', p:[[8,208,80],[168,208,80],[8,176,48],[200,176,48],[72,152,112],[8,120,64],[184,120,64],[72,88,112],[8,56,64],[184,56,64]] },
];
const BOSSL = { bg:'#2a0a0a', c:'#a03030', hi:'#ff8a7a', p:[[8,208,240],[24,152,56],[176,152,56],[96,112,64],[24,72,64],[168,72,64]] };
const isBoss = n => n % 5 === 0;
const lvData = n => isBoss(n) ? BOSSL : LEVELS[(n - 1) % LEVELS.length];

// ---------- 상태 ----------
const COLS = [
  { body:'#4cc85a', belly:'#e8f0a0', snout:'#6fe07a', foot:'#2e9a3a', spike:'#ff9a3a', pop:'#6f6' },
  { body:'#4aa0f0', belly:'#f0e8a0', snout:'#7ac0ff', foot:'#2a70c0', spike:'#ff6a9a', pop:'#6af' },
];
let mode = 'title', level = 1, hi = +localStorage.getItem('bubble-hi') || 0;
let players = [], plats = [], enemies = [], bubbles = [], fruits = [], items = [], waves = [], shots = [], parts = [];
let boss = null, frame = 0, clearT = 0, bannerT = 0, overT = 0, specT = 0;

const rnd = (a, b) => a + Math.random() * (b - a);
const hit = (a, b, m = 0) => a.x + m < b.x + b.w && a.x + a.w - m > b.x && a.y + m < b.y + b.h && a.y + a.h - m > b.y;
const living = () => players.filter(p => !p.out && !p.deadT);
function nearest(o) {
  let best = null, d = 1e9;
  for (const p of living()) { const q = Math.abs(p.x - o.x) + Math.abs(p.y - o.y); if (q < d) { d = q; best = p; } }
  return best || players[0];
}
function mkPlayer(i) {
  return { id:i, x:0, y:0, w:16, h:16, vx:0, vy:0, dir:i ? -1 : 1, ground:false, inv:0, cd:0, lives:3, score:0,
           spd:1.3, cdMax:18, range:22, deadT:0, out:false, col:COLS[i], gj:false };
}
function place(p) { p.x = p.id ? W - 36 : 20; p.y = 190; p.vx = p.vy = 0; p.inv = 120; p.deadT = 0; p.dir = p.id ? -1 : 1; }

function startLevel() {
  const L = lvData(level);
  plats = L.p.map(([x, y, w]) => ({ x, y, w }));
  enemies = []; bubbles = []; fruits = []; items = []; waves = []; shots = []; parts = []; boss = null; specT = 0;
  const mk = (x, y, dir) => ({ x, y, w:16, h:16, vx:0, vy:0, dir, ground:false, angry:false, jt:0 });
  if (isBoss(level)) {
    const hp = 12 + 4 * (level / 5 - 1);
    boss = { x:112, y:120, w:32, h:32, vx:0, vy:0, dir:-1, ground:false, hp, max:hp, flash:0, t:0, sum:0, hc:0 };
  } else {
    const n = Math.min(2 + level, 8);
    for (let i = 0; i < n; i++) enemies.push(mk(24 + (i + 0.5) * (200 / n), 16 - (i % 2) * 8, i % 2 ? 1 : -1));
  }
  for (const p of players) { if (p.lives <= 0) p.out = true; if (!p.out) place(p); }
  if (players.every(p => p.out)) endGame();
  clearT = 0; bannerT = 110;
}
function newGame() {
  level = 1; mode = 'play'; players = [mkPlayer(0)];
  for (const k in S) S[k].jl = 0;
  startLevel(); sfx(523, 0.15);
}
function endGame() {
  mode = 'over'; overT = 0;
  const best = Math.max(...players.map(p => p.score));
  if (best > hi) { hi = best; localStorage.setItem('bubble-hi', hi); }
  sfx(200, 0.8, 'triangle', -120);
}

// ---------- 물리 ----------
function moveY(e, grav = 0.25) {
  const pb = e.y + e.h;
  e.vy = Math.min(e.vy + grav, 4);
  e.y += e.vy; e.ground = false;
  if (e.vy >= 0) for (const p of plats) {
    if (e.x + e.w > p.x + 2 && e.x < p.x + p.w - 2 && pb <= p.y && e.y + e.h >= p.y) {
      e.y = p.y - e.h; e.vy = 0; e.ground = true; break;
    }
  }
  if (e.y > H) e.y = -e.h;          // 바닥 구멍으로 떨어지면 위에서 다시 등장
}
const footHas = (x, y) => plats.some(p => x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + 8);

function die(p) {
  if (p.deadT || p.inv > 0 || p.out) return;
  p.deadT = 100; p.lives--; sfx(300, 0.5, 'sawtooth', -250);
  p.spd = 1.3; p.cdMax = 18; p.range = 22;                // 아이템은 죽으면 사라진다
  for (let i = 0; i < 14; i++) parts.push({ x:p.x + 8, y:p.y + 8, vx:rnd(-2, 2), vy:rnd(-3, 1), l:40, c:p.col.pop });
}
function fruitAt(x, y, vx = 0, vy = -2) { fruits.push({ x:x - 8, y:y - 8, w:16, h:16, vx, vy, t:0, kind:level % 3 }); }
function dropItem(x, y) {
  if (Math.random() > 0.3) return;
  const r = Math.random(), kind = r < 0.3 ? 'shoe' : r < 0.6 ? 'rapid' : r < 0.9 ? 'range' : 'heart';
  items.push({ x:x - 8, y:y - 8, w:16, h:16, vy:-3, t:0, kind });
}
function kill(e, p) { e.dead = true; if (p) p.score += 300; fruitAt(e.x + 8, e.y + 8); sfx(500, 0.1, 'square', 200); }
function pop(b, chain = 0, p = null) {
  b.dead = true;
  for (let i = 0; i < 8; i++) parts.push({ x:b.x, y:b.y, vx:rnd(-1.5, 1.5), vy:rnd(-1.5, 1.5), l:20, c:'#9cf' });
  if (!b.enemy) { sfx(700, 0.05, 'sine'); return; }
  if (p) p.score += 200 * (1 << Math.min(chain, 4));
  sfx(400 + chain * 120, 0.12, 'square', 300);
  fruitAt(b.x, b.y); dropItem(b.x, b.y);
  for (const o of bubbles) if (!o.dead && o.enemy && Math.hypot(o.x - b.x, o.y - b.y) < 36) pop(o, chain + 1, p);
}
function special(kind, x, y, p) {
  if (kind === 'water') waves.push({ k:'w', x:x - 6, y:y - 6, w:12, h:12, vx:0, vy:0, own:p, hc:-99 });
  else waves.push({ k:'b', x:x - 7, y:y - 18, w:14, h:36, vx:-4, own:p, hc:-99 }, { k:'b', x:x - 7, y:y - 18, w:14, h:36, vx:4, own:p, hc:-99 });
  sfx(kind === 'water' ? 300 : 120, 0.5, 'sawtooth', kind === 'water' ? 500 : 700);
}
function hurtBoss(d, p) {
  if (!boss) return;
  boss.hp -= d; boss.flash = 8; sfx(150, 0.1, 'sawtooth');
  if (boss.hp <= 0) {
    if (p) p.score += 5000;
    for (let i = 0; i < 12; i++) fruitAt(boss.x + 16, boss.y + 10, rnd(-2.5, 2.5), rnd(-6, -2));
    for (const e of enemies) kill(e, p);
    for (let i = 0; i < 30; i++) parts.push({ x:boss.x + rnd(0, 32), y:boss.y + rnd(0, 32), vx:rnd(-3, 3), vy:rnd(-3, 3), l:50, c:'#fa4' });
    boss = null; shots = []; sfx(200, 0.9, 'sawtooth', 600);
  } else if (!boss.sum && boss.hp <= boss.max / 2) {
    boss.sum = 1;
    enemies.push({ x:30, y:16, w:16, h:16, vx:0, vy:0, dir:1, ground:false, angry:false, jt:0 },
                 { x:210, y:16, w:16, h:16, vx:0, vy:0, dir:-1, ground:false, angry:false, jt:0 });
  }
}

// ---------- 갱신 ----------
function updPlayer(p) {
  if (p.out) return;
  if (p.deadT) {
    if (--p.deadT === 0) { if (p.lives > 0) place(p); else { p.out = true; if (players.every(q => q.out)) endGame(); } }
    return;
  }
  const k = inp(p);
  p.vx = k.left ? -p.spd : k.right ? p.spd : 0;
  if (p.vx) p.dir = Math.sign(p.vx);
  if (k.edge && p.ground) { p.vy = -5.4; sfx(440, 0.1, 'square', 250); }
  p.x = Math.max(8, Math.min(W - 8 - p.w, p.x + p.vx));
  moveY(p);
  if (p.inv > 0) p.inv--;
  if (p.cd > 0) p.cd--;
  if (k.shoot && p.cd <= 0) {
    p.cd = p.cdMax; sfx(900, 0.07, 'sine', -300);
    bubbles.push({ x:p.x + 8 + p.dir * 12, y:p.y + 8, vx:p.dir * 3.2, vy:0, r:7, state:'shot', age:0, range:p.range, life:520, enemy:null, trap:0, owner:p });
  }
}

function updEnemies() {
  const spd = Math.min(0.55 + level * 0.07, 1.0);
  for (const e of enemies) {
    const t = nearest(e), sp = e.angry ? spd + 0.7 : spd;
    if (e.ground) {
      if (!footHas(e.x + 8 + e.dir * 11, e.y + e.h + 2) && Math.random() < 0.04) e.dir = -e.dir;
      if (--e.jt <= 0) {
        e.jt = 30;
        if (Math.random() < (t.y < e.y - 20 ? 0.18 : 0.03)) { e.vy = -5.4; e.dir = t.x > e.x ? 1 : -1; }
      }
    }
    e.x += e.dir * sp;
    if (e.x < 8) { e.x = 8; e.dir = 1; } else if (e.x > W - 8 - e.w) { e.x = W - 8 - e.w; e.dir = -1; }
    moveY(e);
    for (const p of living()) if (hit(p, e, 3)) die(p);
  }
}

function updBoss() {
  const b = boss; b.t++; if (b.flash > 0) b.flash--;
  const rage = b.hp <= b.max / 2, t = nearest(b);
  if (b.ground && b.t % 140 === 0) { b.vy = -5; b.dir = t.x > b.x ? 1 : -1; }
  b.x += b.dir * (rage ? 0.9 : 0.55);
  if (b.x < 8) { b.x = 8; b.dir = 1; } else if (b.x > W - 8 - b.w) { b.x = W - 8 - b.w; b.dir = -1; }
  if (b.t % (rage ? 55 : 100) === 0) {
    const d = t.x > b.x ? 1 : -1;
    shots.push({ x:b.x + 12, y:b.y + 12, w:8, h:8, vx:d * (rage ? 2.2 : 1.6) });
    sfx(180, 0.2, 'sawtooth', -60);
  }
  moveY(b);
  for (const p of living()) if (hit(p, b, 5)) die(p);
}

function updBubbles() {
  for (const b of bubbles) {
    b.age++;
    if (b.state === 'shot') {
      b.x += b.vx;
      if (b.x < 14 || b.x > W - 14 || b.age > b.range) { b.state = 'float'; b.x = Math.max(14, Math.min(W - 14, b.x)); }
      const bb = { x:b.x - b.r, y:b.y - b.r, w:b.r * 2, h:b.r * 2 };
      if (boss && hit(bb, boss)) { hurtBoss(1, b.owner); b.dead = true; continue; }
      for (const e of enemies) if (!e.dead && hit(bb, e)) {
        e.dead = true; b.enemy = { angry:e.angry }; b.state = 'float'; b.trap = 420; b.r = 10; sfx(600, 0.15, 'sine', 400); break;
      }
      continue;
    }
    b.x += Math.sin((frame + b.age * 7) / 18) * 0.25;
    b.x = Math.max(14, Math.min(W - 14, b.x));
    const bb = { x:b.x - b.r, y:b.y - b.r, w:b.r * 2, h:b.r * 2 };
    if (b.sp) {                                     // 특수 거품: 닿으면 물/번개 발동
      b.y -= 0.4;
      if (--b.life <= 0 || b.y < 12) { b.dead = true; continue; }
      for (const p of living()) if (hit(p, bb, 2)) { b.dead = true; special(b.sp, b.x, b.y, p); break; }
      continue;
    }
    b.y = Math.max(14, b.y - (b.enemy ? 0.3 : 0.5));
    if (b.y <= 14) b.x += Math.sin(b.age / 40) * 0.4;
    if (b.enemy) {
      if (--b.trap <= 0) {                          // 거품을 깨고 나와 화난 적이 된다
        b.dead = true;
        enemies.push({ x:b.x - 8, y:b.y - 8, w:16, h:16, vx:0, vy:0, dir:Math.random() < .5 ? 1 : -1, ground:false, angry:true, jt:0 });
        sfx(250, 0.2, 'sawtooth', 100);
      }
    } else if (--b.life <= 0) pop(b);
    if (b.dead || b.age <= 40) continue;            // 막 뜬 거품은 잠깐 안 터진다
    for (const p of living()) if (hit(p, bb, 2)) { pop(b, 0, p); break; }
  }
  enemies = enemies.filter(e => !e.dead);
  bubbles = bubbles.filter(b => !b.dead);
}

function updWaves() {
  for (const w of waves) {
    if (w.k === 'b') w.x += w.vx;
    else {
      const pb = w.y + w.h; w.vy = Math.min(w.vy + 0.3, 4); w.y += w.vy;
      if (w.vy >= 0) for (const p of plats) {
        if (w.x + w.w > p.x && w.x < p.x + p.w && pb <= p.y && w.y + w.h >= p.y) {
          w.y = p.y - w.h; w.vy = 0;
          if (!w.vx) { w.vx = -2.2; waves.push({ ...w, vx:2.2 }); }
          break;
        }
      }
      w.x += w.vx;
    }
    for (const e of enemies) if (!e.dead && hit(w, e)) kill(e, w.own);
    if (boss && frame - w.hc > 20 && hit(w, boss)) { w.hc = frame; hurtBoss(2, w.own); }
    if (w.x < 0 || w.x > W || w.y > H) w.dead = true;
  }
  enemies = enemies.filter(e => !e.dead);
  waves = waves.filter(w => !w.dead);
}

function updDrops() {
  for (const f of fruits) {
    f.t++; f.x = Math.max(8, Math.min(W - 24, f.x + f.vx));
    const pb = f.y + f.h; f.vy = Math.min(f.vy + 0.2, 3); f.y += f.vy;
    if (f.vy >= 0) for (const p of plats) if (f.x + f.w > p.x && f.x < p.x + p.w && pb <= p.y && f.y + f.h >= p.y) { f.y = p.y - f.h; f.vy = 0; f.vx *= 0.85; }
    if (f.y > H) f.y = -f.h;
    for (const p of living()) if (hit(p, f)) { f.dead = true; p.score += 500; sfx(988, 0.08); setTimeout(() => sfx(1319, 0.12), 70); break; }
    if (f.t > 700) f.dead = true;
  }
  for (const it of items) {
    it.t++;
    const pb = it.y + it.h; it.vy = Math.min(it.vy + 0.2, 3); it.y += it.vy;
    if (it.vy >= 0) for (const p of plats) if (it.x + it.w > p.x && it.x < p.x + p.w && pb <= p.y && it.y + it.h >= p.y) { it.y = p.y - it.h; it.vy = 0; }
    if (it.y > H) it.y = -it.h;
    for (const p of living()) if (hit(p, it)) {
      it.dead = true; sfx(660, 0.1, 'triangle', 500);
      if (it.kind === 'shoe') p.spd = Math.min(p.spd + 0.35, 2.1);
      else if (it.kind === 'rapid') p.cdMax = Math.max(6, p.cdMax - 5);
      else if (it.kind === 'range') p.range = Math.min(62, p.range + 12);
      else p.lives = Math.min(p.lives + 1, 5);
      parts.push(...Array.from({ length:8 }, () => ({ x:p.x + 8, y:p.y + 8, vx:rnd(-2, 2), vy:rnd(-2, 1), l:25, c:'#ff6' })));
      break;
    }
    if (it.t > 900) it.dead = true;
  }
  for (const s of shots) {
    s.x += s.vx;
    if (s.x < 8 || s.x > W - 16) s.dead = true;
    for (const p of living()) if (hit(p, s, 1)) { die(p); s.dead = true; }
  }
  fruits = fruits.filter(f => !f.dead); items = items.filter(i => !i.dead); shots = shots.filter(s => !s.dead);
  parts.forEach(p => { p.x += p.vx; p.y += p.vy; p.l--; });
  parts = parts.filter(p => p.l > 0);
}

function update() {
  frame++; pollStart();
  if (mode === 'title') { if (startEdge) { startEdge = false; newGame(); } return; }
  if (mode === 'over') { if (++overT > 60 && startEdge) { startEdge = false; mode = 'title'; } else if (overT <= 60) startEdge = false; return; }
  startEdge = false;
  if (bannerT > 0) bannerT--;

  players.forEach(updPlayer);
  if (mode !== 'play') return;
  updEnemies();
  if (boss) updBoss();
  updBubbles(); updWaves(); updDrops();

  // 특수 거품(물·번개)이 가끔 아래에서 떠오른다
  if ((enemies.length || boss) && ++specT > 800) {
    specT = 0;
    bubbles.push({ x:rnd(24, 232), y:206, vx:0, vy:0, r:9, state:'float', age:0, life:700, enemy:null, trap:0, sp:Math.random() < .5 ? 'water' : 'bolt' });
  }

  // 스테이지 클리어
  if (!enemies.length && !boss && !bubbles.some(b => b.enemy)) {
    if (++clearT === 1) sfx(784, 0.3, 'triangle', 300);
    if (clearT > 150) { level++; players.forEach(p => { p.lives = Math.max(p.lives, 3); }); startLevel(); }   // 라운드가 넘어가면 목숨 복구
  } else clearT = 0;
  for (const p of players) if (p.score > hi) hi = p.score;
}
