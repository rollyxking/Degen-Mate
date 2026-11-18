import { drawRoo } from './roo.js'

export const W = 800, H = 400, GY = 330
const GRAV = 2000, JUMP_V = -780, TAU = Math.PI * 2
const rnd = (a, b) => a + Math.random() * (b - a)
const OL = '#1b0a2e'

/* ---------- Sound: tiny WebAudio synth, no audio files ---------- */
export class Sfx {
  constructor() { this.ctx = null; this.master = null; this.muted = false; this.musicOn = false; this.timer = null; this.step = 0; this.next = 0 }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return }
    try {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return
      this.ctx = new AC()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.muted ? 0 : 1
      this.master.connect(this.ctx.destination)
    } catch { this.ctx = null }
  }
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 1 }
  tone(f0, f1, dur, type = 'square', vol = 0.1, delay = 0) {
    if (!this.ctx) return
    const t = this.ctx.currentTime + Math.max(0, delay)
    const o = this.ctx.createOscillator(), g = this.ctx.createGain()
    o.type = type
    o.frequency.setValueAtTime(f0, t)
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur)
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g); g.connect(this.master)
    o.start(t); o.stop(t + dur + 0.03)
  }
  play(n) {
    switch (n) {
      case 'jump': this.tone(320, 640, 0.14, 'square', 0.08); break
      case 'coin': this.tone(988, 988, 0.06, 'square', 0.07); this.tone(1319, 1319, 0.12, 'square', 0.07, 0.06); break
      case 'crown': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, f, 0.12, 'square', 0.08, i * 0.07)); break
      case 'stomp': this.tone(180, 460, 0.12, 'square', 0.09); break
      case 'hit': this.tone(220, 50, 0.3, 'sawtooth', 0.14); break
      case 'over': [392, 330, 262, 196].forEach((f, i) => this.tone(f, f * 0.97, 0.26, 'triangle', 0.15, i * 0.18)); break
      default:
    }
  }
  startMusic() {
    if (!this.ctx || this.musicOn) return
    this.musicOn = true; this.step = 0; this.next = this.ctx.currentTime + 0.05
    this.timer = setInterval(() => this.sched(), 90)
  }
  stopMusic() { this.musicOn = false; clearInterval(this.timer); this.timer = null }
  sched() {
    if (!this.ctx || !this.musicOn) return
    const lead = [440, 0, 523, 0, 659, 523, 0, 440, 392, 0, 494, 0, 587, 494, 0, 392]
    const bass = [110, 110, 98, 98]
    while (this.next < this.ctx.currentTime + 0.3) {
      const d = this.next - this.ctx.currentTime, i = this.step % 16
      if (lead[i]) this.tone(lead[i], lead[i], 0.12, 'square', 0.028, d)
      if (i % 4 === 0) this.tone(bass[(i / 4) | 0], bass[(i / 4) | 0], 0.3, 'triangle', 0.07, d)
      this.step++; this.next += 0.17
    }
  }
}

/* ---------- Scenery generators ---------- */
const mkCity = (minH, maxH, minW, maxW) => {
  let x = 0; const b = []
  while (x < 1700) {
    const w = rnd(minW, maxW), h = rnd(minH, maxH)
    const cols = Math.max(0, Math.floor((w - 8) / 12)), rows = Math.max(0, Math.floor((h - 10) / 16))
    b.push({ x, w, h, cols, rows, wins: Array.from({ length: cols * rows }, () => Math.random() < 0.35), hue: Math.random() < 0.5 })
    x += w + rnd(4, 18)
  }
  return { b, width: x }
}

/* ---------- Engine ---------- */
export function createGame(canvas, cb, sfx, opts = {}) {
  const W = opts.width || 800 // narrower view on portrait phones so everything stays big
  const MX = W - 160
  const c = canvas.getContext('2d')
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = W * dpr; canvas.height = H * dpr
  c.setTransform(dpr, 0, 0, dpr, 0, 0)

  const stars = Array.from({ length: 70 }, () => ({ x: rnd(0, W), y: rnd(0, 220), r: rnd(0.5, 1.6), p: rnd(0, 6) }))
  const far = mkCity(110, 260, 40, 80), near = mkCity(60, 170, 50, 100)
  const islands = Array.from({ length: 4 }, (_, i) => ({ x: i * 420 + rnd(0, 150), y: rnd(70, 170), w: rnd(70, 130) }))
  const clouds = Array.from({ length: 5 }, (_, i) => ({ x: i * 220, y: rnd(40, 200), s: rnd(0.8, 1.6) }))
  const sky = c.createLinearGradient(0, 0, 0, GY)
  sky.addColorStop(0, '#05031a'); sky.addColorStop(0.45, '#1a0e5c'); sky.addColorStop(0.8, '#5a1fa6'); sky.addColorStop(1, '#c13cc9')
  const gnd = c.createLinearGradient(0, GY, 0, H)
  gnd.addColorStop(0, '#2f1668'); gnd.addColorStop(1, '#0b0524')

  let s, raf = 0, last = 0, paused = false, destroyed = false, held = false, hudKey = ''

  const fresh = () => ({
    t: 0, dist: 0, speed: 260, coins: 0, crowns: 0, stomps: 0, lives: 3, inv: 0, shake: 0, flash: 0,
    dead: false, deadT: 0, over: false, spawnIn: 360, buf: 0, coyote: 0,
    p: { x: W < 700 ? 90 : 120, y: GY, vy: 0, ground: true },
    objs: [], parts: [],
  })
  s = fresh()
  const score = () => Math.floor(s.dist / 12) + s.coins * 10 + s.crowns * 100 + s.stomps * 50
  const emit = () => {
    const k = `${score()}|${s.lives}|${s.coins}`
    if (k !== hudKey) { hudKey = k; cb.onHud && cb.onHud({ score: score(), lives: s.lives, coins: s.coins }) }
  }
  const burst = (x, y, col, n = 10, sp = 160) => {
    for (let i = 0; i < n; i++) { const a = rnd(0, TAU), v = rnd(30, sp); s.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: rnd(0.3, 0.7), max: 0.7, col, r: rnd(1.5, 3.5) }) }
  }

  /* ----- spawning ----- */
  const coinRow = (x, y, n, gap = 32) => { for (let i = 0; i < n; i++) s.objs.push({ t: 'coin', x: x + i * gap, y, ph: rnd(0, 6) }) }
  const coinArc = (x, w, n) => { for (let i = 0; i < n; i++) s.objs.push({ t: 'coin', x: x + (w * i) / (n - 1), y: GY - 50 - Math.sin((i / (n - 1)) * Math.PI) * 95, ph: i }) }
  function spawn() {
    const x = W + 60, tm = s.t
    const kinds = ['spike', 'spike', 'rock', 'walker', 'plat', 'plat']
    if (tm > 10) kinds.push('fly', 'walker')
    const k = kinds[(Math.random() * kinds.length) | 0]
    let width = 60
    if (k === 'spike') {
      const n = 1 + ((Math.random() * (tm > 15 ? 4 : 3)) | 0)
      for (let i = 0; i < n; i++) s.objs.push({ t: 'spike', x: x + i * 28, y: GY - 30, w: 28, h: 30 })
      width = n * 28
      coinArc(x - 20, width + 40, 5)
      if (Math.random() < 0.08) s.objs.push({ t: 'crown', x: x + width / 2, y: GY - 170, ph: 0 })
    } else if (k === 'rock') {
      const w = rnd(50, 70), h = rnd(40, 54)
      s.objs.push({ t: 'rock', x, y: GY - h, w, h })
      coinRow(x + 8, GY - h - 28, 2, 30)
      width = w
    } else if (k === 'walker') {
      s.objs.push({ t: 'walker', x, y: GY - 34, w: 44, h: 34, vx: -90, ph: rnd(0, 6) })
      coinArc(x - 25, 90, 4)
      width = 44
    } else if (k === 'fly') {
      s.objs.push({ t: 'fly', x, y: GY - rnd(105, 125), w: 42, h: 26, vx: -40, ph: rnd(0, 6) })
      coinRow(x - 10, GY - 22, 3, 30)
      width = 60
    } else {
      const w = rnd(180, 260), y = GY - rnd(100, 118)
      s.objs.push({ t: 'plat', x, y, w, h: 16 })
      coinRow(x + 20, y - 28, Math.floor((w - 40) / 40))
      if (Math.random() < 0.22) s.objs.push({ t: 'crown', x: x + w / 2, y: y - 62, ph: 0 })
      if (tm > 8 && Math.random() < 0.5) { s.objs.push({ t: 'spike', x: x + w / 2 - 28, y: GY - 30, w: 28, h: 30 }, { t: 'spike', x: x + w / 2, y: GY - 30, w: 28, h: 30 }) }
      width = w
    }
    s.spawnIn = width + s.speed * rnd(0.8, 1.5) + 60
  }

  /* ----- actions ----- */
  function hurt() {
    s.lives--; s.inv = 1.6; s.shake = 0.3; s.flash = 0.25
    s.p.vy = -440; s.p.ground = false
    sfx.play('hit'); burst(s.p.x, s.p.y - 30, '#ff3b5c', 14)
    if (s.lives <= 0) { s.lives = 0; s.dead = true; s.deadT = 0; s.p.vy = -560; sfx.stopMusic(); sfx.play('over') }
    emit()
  }
  function stomp(o) {
    o.dead = true; s.stomps++; s.p.vy = -600; s.p.ground = false
    sfx.play('stomp'); burst(o.x + o.w / 2, o.y + o.h / 2, '#ffd54a', 14)
  }
  const hb = (o) => (o.t === 'spike' ? { x: o.x + 6, y: o.y + 10, w: o.w - 12, h: o.h - 10 } : o)
  const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

  /* ----- update ----- */
  function update(dt) {
    s.t += dt
    const p = s.p
    if (s.dead) {
      s.deadT += dt
      p.vy += GRAV * dt; p.y += p.vy * dt
      if (s.deadT > 1 && !s.over) { s.over = true; cb.onOver && cb.onOver({ score: score(), coins: s.coins, crowns: s.crowns, stomps: s.stomps }) }
    } else {
      s.speed = Math.min(260 + s.t * 6.5, W < 700 ? 540 : 600)
      s.dist += s.speed * dt
      s.inv = Math.max(0, s.inv - dt); s.shake = Math.max(0, s.shake - dt); s.flash = Math.max(0, s.flash - dt)

      s.buf = Math.max(0, s.buf - dt)
      s.coyote = p.ground ? 0.1 : Math.max(0, s.coyote - dt)
      if (s.buf > 0 && (p.ground || s.coyote > 0)) { p.vy = JUMP_V; p.ground = false; s.coyote = 0; s.buf = 0; sfx.play('jump'); burst(p.x, p.y, 'rgba(255,255,255,.6)', 5, 70) }
      if (!held && p.vy < -300) p.vy = -300

      const prevY = p.y, wasAir = !p.ground
      p.vy += GRAV * dt; p.y += p.vy * dt; p.ground = false
      if (p.y >= GY) { p.y = GY; p.vy = 0; p.ground = true }
      for (const o of s.objs) {
        if ((o.t === 'plat' || o.t === 'rock') && p.vy >= 0 && prevY <= o.y + 2 && p.y >= o.y && p.x + 14 > o.x && p.x - 14 < o.x + o.w) { p.y = o.y; p.vy = 0; p.ground = true }
      }
      if (wasAir && p.ground) burst(p.x, p.y, 'rgba(255,255,255,.5)', 6, 80)

      s.spawnIn -= s.speed * dt
      if (s.spawnIn <= 0) spawn()

      const pr = { x: p.x - 13, y: p.y - 60, w: 26, h: 60 }
      for (const o of s.objs) {
        o.x -= (s.speed - (o.vx || 0)) * dt
        if (o.dead) continue
        if (o.t === 'coin' || o.t === 'crown') {
          if (Math.abs(o.x - p.x) < 24 && Math.abs(o.y - (p.y - 30)) < 42) {
            o.dead = true
            if (o.t === 'coin') { s.coins++; sfx.play('coin'); burst(o.x, o.y, '#ffd54a', 6, 90) }
            else { s.crowns++; sfx.play('crown'); burst(o.x, o.y, '#fff3a0', 16, 180) }
            emit()
          }
        } else if (o.t !== 'plat') {
          if (!hit(pr, hb(o))) continue
          if (o.t === 'rock') { if (p.y > o.y + 12 && s.inv <= 0) hurt(); continue }
          if ((o.t === 'walker' || o.t === 'fly') && p.vy > 0 && prevY <= o.y + 10) { stomp(o); emit(); continue }
          if (s.inv <= 0) hurt()
        }
      }
      s.objs = s.objs.filter((o) => !o.dead && o.x + (o.w || 20) > -80)
      emit()
    }
    for (const q of s.parts) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 500 * dt }
    s.parts = s.parts.filter((q) => q.life > 0)
  }

  /* ----- render ----- */
  function city(ct, off, fill, edge, lit) {
    const ox = -(((off % ct.width) + ct.width) % ct.width)
    for (let rep = 0; rep < 2; rep++) {
      for (const b of ct.b) {
        const x = ox + rep * ct.width + b.x
        if (x > W || x + b.w < 0) continue
        const y = GY - b.h
        c.fillStyle = fill; c.fillRect(x, y, b.w, b.h)
        c.fillStyle = edge; c.fillRect(x, y, b.w, 2)
        for (let r = 0; r < b.rows; r++) for (let q = 0; q < b.cols; q++) {
          if (!b.wins[r * b.cols + q]) continue
          c.fillStyle = b.hue ? lit[0] : lit[1]
          c.fillRect(x + 6 + q * 12, y + 8 + r * 16, 5, 7)
        }
      }
    }
  }

  function drawCoin(o) {
    const sx = Math.max(0.25, Math.abs(Math.cos(s.t * 4 + o.ph))), cy = o.y + Math.sin(s.t * 3 + o.ph) * 3
    c.save(); c.translate(o.x, cy); c.scale(sx, 1)
    c.shadowColor = '#ffd54a'; c.shadowBlur = 10
    c.fillStyle = '#ffc928'; c.strokeStyle = '#b06a00'; c.lineWidth = 2
    c.beginPath(); c.arc(0, 0, 11, 0, TAU); c.fill(); c.stroke()
    c.shadowBlur = 0
    c.fillStyle = '#fff0a0'; c.beginPath(); c.arc(0, 0, 7.5, 0, TAU); c.fill()
    c.fillStyle = '#d08a00'
    c.beginPath(); c.moveTo(-4, 3); c.lineTo(-4, -2); c.lineTo(-2, 0); c.lineTo(0, -3); c.lineTo(2, 0); c.lineTo(4, -2); c.lineTo(4, 3); c.closePath(); c.fill()
    c.restore()
  }
  function drawCrown(o) {
    const cy = o.y + Math.sin(s.t * 3) * 5
    c.save(); c.translate(o.x, cy); c.scale(1 + Math.sin(s.t * 5) * 0.06, 1 + Math.sin(s.t * 5) * 0.06)
    c.shadowColor = '#fff3a0'; c.shadowBlur = 18
    c.fillStyle = '#ffd23a'; c.strokeStyle = '#8a5200'; c.lineWidth = 2; c.lineJoin = 'round'
    c.beginPath(); c.moveTo(-16, 10); c.lineTo(-18, -10); c.lineTo(-8, -2); c.lineTo(0, -14); c.lineTo(8, -2); c.lineTo(18, -10); c.lineTo(16, 10); c.closePath(); c.fill(); c.stroke()
    c.shadowBlur = 0
    c.fillStyle = '#ff4fd8'; c.beginPath(); c.arc(0, 2, 3, 0, TAU); c.fill()
    c.fillStyle = '#7df9ff'; c.beginPath(); c.arc(-9, 4, 2, 0, TAU); c.arc(9, 4, 2, 0, TAU); c.fill()
    c.restore()
  }
  function drawObj(o) {
    if (o.t === 'coin') return drawCoin(o)
    if (o.t === 'crown') return drawCrown(o)
    c.lineJoin = 'round'
    if (o.t === 'spike') {
      const g = c.createLinearGradient(o.x, o.y, o.x, o.y + o.h)
      g.addColorStop(0, '#f2f4ff'); g.addColorStop(1, '#6b5bd6')
      c.fillStyle = g; c.strokeStyle = OL; c.lineWidth = 2
      c.beginPath(); c.moveTo(o.x, o.y + o.h); c.lineTo(o.x + o.w / 2, o.y); c.lineTo(o.x + o.w, o.y + o.h); c.closePath(); c.fill(); c.stroke()
      c.fillStyle = '#ff4fd8'; c.beginPath(); c.arc(o.x + o.w / 2, o.y + 2, 2.4, 0, TAU); c.fill()
    } else if (o.t === 'rock') {
      c.fillStyle = '#4a3578'; c.strokeStyle = OL; c.lineWidth = 2.5
      c.beginPath(); c.moveTo(o.x, o.y + o.h); c.lineTo(o.x + 4, o.y + o.h * 0.35); c.lineTo(o.x + o.w * 0.25, o.y); c.lineTo(o.x + o.w * 0.7, o.y + 3)
      c.lineTo(o.x + o.w, o.y + o.h * 0.4); c.lineTo(o.x + o.w - 3, o.y + o.h); c.closePath(); c.fill(); c.stroke()
      c.strokeStyle = '#7df9ff'; c.lineWidth = 2.5
      c.beginPath(); c.moveTo(o.x + o.w * 0.25, o.y + 1); c.lineTo(o.x + o.w * 0.7, o.y + 4); c.stroke()
      c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1.5
      c.beginPath(); c.moveTo(o.x + o.w * 0.4, o.y + 10); c.lineTo(o.x + o.w * 0.5, o.y + o.h * 0.7); c.stroke()
    } else if (o.t === 'plat') {
      c.fillStyle = 'rgba(125,249,255,.10)'; c.fillRect(o.x - 4, o.y + o.h, o.w + 8, 40)
      c.fillStyle = '#2d1b69'; c.strokeStyle = OL; c.lineWidth = 2.5
      c.beginPath(); c.rect(o.x, o.y, o.w, o.h); c.fill(); c.stroke()
      c.shadowColor = '#7df9ff'; c.shadowBlur = 10; c.fillStyle = '#7df9ff'; c.fillRect(o.x, o.y, o.w, 4); c.shadowBlur = 0
      c.fillStyle = '#6a3fd1'
      for (let i = 14; i < o.w - 10; i += 38) { c.beginPath(); c.moveTo(o.x + i, o.y + o.h); c.lineTo(o.x + i + 8, o.y + o.h + 14); c.lineTo(o.x + i + 16, o.y + o.h); c.closePath(); c.fill() }
    } else if (o.t === 'walker') {
      const hop = Math.abs(Math.sin(s.t * 8 + o.ph)) * 5, cx = o.x + 22, cy = o.y + 18 - hop
      c.fillStyle = '#14141c'; c.beginPath(); c.ellipse(cx - 11, o.y + 33, 7, 3.5, 0, 0, TAU); c.ellipse(cx + 11, o.y + 33, 7, 3.5, 0, 0, TAU); c.fill()
      c.fillStyle = '#ff2d55'; c.strokeStyle = OL; c.lineWidth = 2.5
      c.beginPath(); c.ellipse(cx, cy, 22, 17, 0, 0, TAU); c.fill(); c.stroke()
      c.fillStyle = '#fff'; c.beginPath(); c.arc(cx - 8, cy - 4, 5.5, 0, TAU); c.arc(cx + 8, cy - 4, 5.5, 0, TAU); c.fill()
      c.fillStyle = OL; c.beginPath(); c.arc(cx - 9, cy - 3, 2.4, 0, TAU); c.arc(cx + 7, cy - 3, 2.4, 0, TAU); c.fill()
      c.strokeStyle = OL; c.lineWidth = 2.5
      c.beginPath(); c.moveTo(cx - 14, cy - 12); c.lineTo(cx - 3, cy - 8); c.moveTo(cx + 14, cy - 12); c.lineTo(cx + 3, cy - 8); c.stroke()
      c.fillStyle = '#fff'; c.font = '700 8px Barlow, sans-serif'; c.textAlign = 'center'; c.fillText('RUG', cx, cy + 12)
    } else if (o.t === 'fly') {
      const cx = o.x + 21, cy = o.y + 13 + Math.sin(s.t * 4 + o.ph) * 4, fl = Math.sin(s.t * 20) * 8
      c.fillStyle = '#ff2d55'; c.strokeStyle = OL; c.lineWidth = 2
      c.beginPath(); c.moveTo(cx - 6, cy); c.lineTo(cx - 24, cy - 10 - fl); c.lineTo(cx - 16, cy + 6); c.closePath(); c.fill(); c.stroke()
      c.beginPath(); c.moveTo(cx + 6, cy); c.lineTo(cx + 24, cy - 10 - fl); c.lineTo(cx + 16, cy + 6); c.closePath(); c.fill(); c.stroke()
      c.fillStyle = '#1a1033'; c.beginPath(); c.ellipse(cx, cy, 12, 11, 0, 0, TAU); c.fill(); c.stroke()
      c.shadowColor = '#ff2d55'; c.shadowBlur = 8; c.fillStyle = '#ff5a7a'
      c.beginPath(); c.arc(cx - 4, cy - 2, 2.6, 0, TAU); c.arc(cx + 4, cy - 2, 2.6, 0, TAU); c.fill(); c.shadowBlur = 0
      c.fillStyle = '#fff'; c.font = '700 7px Barlow, sans-serif'; c.textAlign = 'center'; c.fillText('FUD', cx, cy + 8)
    }
  }

  function render() {
    const t = s.t
    c.save()
    if (s.shake > 0) c.translate(rnd(-1, 1) * s.shake * 14, rnd(-1, 1) * s.shake * 14)
    c.fillStyle = sky; c.fillRect(-20, -20, W + 40, H + 40)
    for (const st of stars) { c.globalAlpha = 0.4 + 0.5 * Math.sin(t * 2 + st.p); c.fillStyle = '#fff'; c.fillRect(st.x, st.y, st.r, st.r) }
    c.globalAlpha = 1
    // moon
    const mg = c.createRadialGradient(MX, 95, 30, MX, 95, 140)
    mg.addColorStop(0, 'rgba(190,140,255,.45)'); mg.addColorStop(1, 'rgba(190,140,255,0)')
    c.fillStyle = mg; c.fillRect(MX - 160, -50, 320, 290)
    c.fillStyle = '#f4e9d0'; c.beginPath(); c.arc(MX, 95, 44, 0, TAU); c.fill()
    c.fillStyle = '#dccdb4'; c.beginPath(); c.arc(MX - 15, 85, 9, 0, TAU); c.arc(MX + 15, 108, 12, 0, TAU); c.arc(MX + 10, 75, 5, 0, TAU); c.fill()
    // clouds
    c.fillStyle = 'rgba(120,70,200,.35)'
    for (const cl of clouds) {
      const x = (((cl.x - s.dist * 0.04 - t * 6) % (W + 240)) + (W + 240)) % (W + 240) - 120
      c.beginPath(); c.ellipse(x, cl.y, 60 * cl.s, 14 * cl.s, 0, 0, TAU); c.ellipse(x + 30 * cl.s, cl.y - 8, 36 * cl.s, 12 * cl.s, 0, 0, TAU); c.fill()
    }
    // floating islands
    for (const is of islands) {
      const x = (((is.x - s.dist * 0.1) % (W + 300)) + (W + 300)) % (W + 300) - 150, y = is.y + Math.sin(t + is.x) * 4
      c.fillStyle = '#26125e'; c.beginPath(); c.moveTo(x - is.w / 2, y); c.lineTo(x + is.w / 2, y); c.lineTo(x + is.w * 0.15, y + is.w * 0.35); c.lineTo(x - is.w * 0.1, y + is.w * 0.28); c.closePath(); c.fill()
      c.fillStyle = '#7df9ff'; c.fillRect(x - is.w / 2, y - 2, is.w, 3)
    }
    city(far, s.dist * 0.12, '#1a0f4d', '#4f7bff', ['#8fb3ff', '#c58bff'])
    city(near, s.dist * 0.28, '#0f0833', '#ff4fd8', ['#ffe27a', '#7df9ff'])
    // ground
    c.fillStyle = gnd; c.fillRect(-20, GY, W + 40, H - GY + 20)
    c.strokeStyle = 'rgba(125,249,255,.18)'; c.lineWidth = 1
    c.beginPath()
    for (let i = -1; i < 12; i++) { const x = i * 80 - (s.dist % 80); c.moveTo(x, GY); c.lineTo(x - 50 - (x - W / 2) * 0.25, H) }
    c.moveTo(0, GY + 24); c.lineTo(W, GY + 24); c.moveTo(0, GY + 50); c.lineTo(W, GY + 50); c.stroke()
    c.shadowColor = '#7df9ff'; c.shadowBlur = 12; c.strokeStyle = '#7df9ff'; c.lineWidth = 3
    c.beginPath(); c.moveTo(0, GY); c.lineTo(W, GY); c.stroke(); c.shadowBlur = 0

    for (const o of s.objs) drawObj(o)

    for (const q of s.parts) { c.globalAlpha = Math.max(0, q.life / q.max); c.fillStyle = q.col; c.beginPath(); c.arc(q.x, q.y, q.r, 0, TAU); c.fill() }
    c.globalAlpha = 1

    // player + shadow
    const p = s.p
    if (!s.dead) { c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(p.x, GY + 3, 18 - Math.min(8, (GY - p.y) / 14), 4, 0, 0, TAU); c.fill() }
    if (!(s.inv > 0 && Math.floor(s.inv * 12) % 2 === 0 && !s.dead)) {
      c.shadowColor = '#c9ff1f'; c.shadowBlur = 8
      drawRoo(c, p.x, p.y, { t: s.t, air: !p.ground, scale: 0.85, rot: s.dead ? s.deadT * 9 : 0 })
      c.shadowBlur = 0
    }
    if (s.flash > 0) { c.fillStyle = `rgba(255,40,80,${s.flash * 1.2})`; c.fillRect(-20, -20, W + 40, H + 40) }
    c.restore()
  }

  /* ----- loop & controls ----- */
  function frame(ts) {
    if (destroyed) return
    raf = requestAnimationFrame(frame)
    const dt = Math.min((ts - last) / 1000, 0.033) || 0
    last = ts
    if (!paused) update(dt)
    render()
  }
  const jumpDown = () => { if (paused || s.dead) return; s.buf = 0.12; held = true }
  const jumpUp = () => { held = false }
  function setPaused(v) {
    if (s.dead || destroyed || paused === v) return
    paused = v
    if (v) sfx.stopMusic(); else sfx.startMusic()
    cb.onPause && cb.onPause(v)
  }
  const keys = ['Space', 'ArrowUp', 'KeyW']
  const kd = (e) => {
    if (keys.includes(e.code)) { e.preventDefault(); if (!e.repeat) jumpDown() }
    else if (e.code === 'Escape') { e.preventDefault(); setPaused(!paused) }
  }
  const ku = (e) => { if (keys.includes(e.code)) jumpUp() }
  const vis = () => { if (document.hidden) setPaused(true) }
  const pd = (e) => { e.preventDefault(); jumpDown() }
  window.addEventListener('keydown', kd)
  window.addEventListener('keyup', ku)
  document.addEventListener('visibilitychange', vis)
  canvas.addEventListener('pointerdown', pd)
  canvas.addEventListener('pointerup', jumpUp)
  canvas.addEventListener('pointercancel', jumpUp)

  return {
    start() { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); sfx.startMusic(); emit(); last = performance.now(); raf = requestAnimationFrame(frame) },
    pause: setPaused,
    jumpDown, jumpUp,
    destroy() {
      destroyed = true; cancelAnimationFrame(raf); sfx.stopMusic()
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku)
      document.removeEventListener('visibilitychange', vis)
      canvas.removeEventListener('pointerdown', pd); canvas.removeEventListener('pointerup', jumpUp); canvas.removeEventListener('pointercancel', jumpUp)
    },
  }
}
