import { useEffect, useRef, useState } from 'react'

/*
  Random pie-throw jump scare.
  Every so often the mascot winds up and lobs a meat pie at the screen,
  it goes SPLAT, then he laughs at you for flinching.

  - If the hero mascot is on screen, HE throws it (lunge + laugh).
  - If you've scrolled past him, he pops up from the corner instead,
    so it can happen at any point on the page.
  - Never blocks clicks (pointer-events: none) and cleans itself up.
  - Respects prefers-reduced-motion (no flying/shaking, just a splat + laugh bubble).
  - Sound only plays once the visitor has interacted with the page
    (browser autoplay rules), so it never blasts a silent first load.

  Tweak timing here:
*/
const FIRST_DELAY = [500, 500]       // ms before the first pie [min, max]  (500 = right as they land)
const GAP = [60000, 60000]          // ms between pies after that (60000 = 1 min)
const THROW_ON_LINK_CLICK = true    // also throw a pie straight away when any link is clicked
// Browsers block sound until the visitor taps/clicks something. If sound is blocked on load,
// show a quick "Tap to enter" screen: the tap unlocks audio and the pie flies right away, WITH sound.
const SOUND_GATE = true
const WIND_UP = 250, FLIGHT = 400, SPLAT_HOLD = 3400

const rand = (a, b) => a + Math.random() * (b - a)

/* ---------- procedural splat so every hit looks different ---------- */
function blobPath(r, n = 16) {
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    const rr = r * (i % 2 ? rand(0.55, 0.85) : rand(0.9, 1.3))
    return [Math.cos(a) * rr, Math.sin(a) * rr]
  })
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  let d = `M${mid(pts[n - 1], pts[0]).join(',')}`
  for (let i = 0; i < n; i++) d += ` Q${pts[i].join(',')} ${mid(pts[i], pts[(i + 1) % n]).join(',')}`
  return d + 'Z'
}

function makeSplat() {
  return {
    sauce: blobPath(120),
    gravy: blobPath(88),
    crust: blobPath(58),
    bits: Array.from({ length: 16 }, () => {
      const a = rand(0, Math.PI * 2), d = rand(135, 195)
      return { x: Math.cos(a) * d, y: Math.sin(a) * d, r: rand(5, 15), c: Math.random() < 0.5 ? 'sauce' : 'crust' }
    }),
    drips: Array.from({ length: 5 }, (_, i) => ({
      x: -80 + i * 40 + rand(-10, 10), w: rand(14, 24), len: rand(70, 190), delay: rand(0, 0.5),
    })),
  }
}

function Splat({ data }) {
  return (
    <svg viewBox="-220 -220 440 440" aria-hidden="true">
      {data.drips.map((d, i) => (
        <rect key={i} className="pie-drip" x={d.x} y="20" width={d.w} height={d.len} rx={d.w / 2}
          style={{ animationDelay: `${0.25 + d.delay}s` }} />
      ))}
      <path className="s-sauce" d={data.sauce} />
      {data.bits.map((b, i) => <circle key={i} className={`s-${b.c}`} cx={b.x} cy={b.y} r={b.r} />)}
      <path className="s-gravy" d={data.gravy} />
      <path className="s-crust" d={data.crust} />
      <circle className="s-sauce" cx="-8" cy="-6" r="22" />
    </svg>
  )
}

function PieSvg() {
  return (
    <svg viewBox="0 0 200 140" aria-hidden="true">
      <ellipse cx="100" cy="98" rx="92" ry="34" fill="#7a3f12" stroke="#141414" strokeWidth="6" />
      <ellipse cx="100" cy="84" rx="92" ry="40" fill="#e9a840" stroke="#141414" strokeWidth="6" />
      <ellipse cx="100" cy="78" rx="68" ry="27" fill="#f4c660" />
      <path d="M78 76c4-14 36-16 46-4 6 8-4 18-24 18-18 0-28-6-22-14z" fill="#d62b1f" />
      <circle cx="56" cy="70" r="4" fill="#b8741f" /><circle cx="146" cy="82" r="4" fill="#b8741f" />
      <circle cx="70" cy="92" r="3" fill="#b8741f" /><circle cx="132" cy="64" r="3" fill="#b8741f" />
    </svg>
  )
}

/* ---------- tiny synthesised sound effects (no audio files) ---------- */
let ctx = null
function unlockAudio() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
  } catch { /* no audio, fine */ }
}
const noiseBuf = (c, secs) => {
  const b = c.createBuffer(1, Math.floor(c.sampleRate * secs), c.sampleRate)
  const d = b.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return b
}
function env(g, t, peak, attack, dur) {
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(peak, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
}
const sfx = {
  ready: () => ctx && ctx.state === 'running',
  whoosh() {
    if (!this.ready()) return
    const t = ctx.currentTime, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain()
    src.buffer = noiseBuf(ctx, 0.6); f.type = 'bandpass'; f.Q.value = 1.2
    f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(2600, t + 0.5)
    env(g, t, 0.28, 0.4, 0.55)
    src.connect(f).connect(g).connect(ctx.destination); src.start(t)
  },
  splat() {
    if (!this.ready()) return
    const t = ctx.currentTime, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain()
    src.buffer = noiseBuf(ctx, 0.4); f.type = 'lowpass'; f.frequency.setValueAtTime(2200, t); f.frequency.exponentialRampToValueAtTime(300, t + 0.3)
    env(g, t, 0.6, 0.01, 0.35)
    src.connect(f).connect(g).connect(ctx.destination); src.start(t)
    const o = ctx.createOscillator(), og = ctx.createGain()
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.25)
    env(og, t, 0.7, 0.01, 0.3)
    o.connect(og).connect(ctx.destination); o.start(t); o.stop(t + 0.35)
  },
  laugh(start = 0) {
    if (!this.ready()) return
    const base = ctx.currentTime + start
    for (let i = 0; i < 6; i++) {
      const t = base + i * 0.2, last = i === 5, dur = last ? 0.5 : 0.15
      const o = ctx.createOscillator(); o.type = 'sawtooth'
      o.frequency.setValueAtTime(230 - i * 6 + 40, t)
      o.frequency.exponentialRampToValueAtTime(190 - i * 6, t + dur)
      const vib = ctx.createOscillator(), vg = ctx.createGain()
      vib.frequency.value = 22; vg.gain.value = 9; vib.connect(vg).connect(o.frequency)
      const g = ctx.createGain(); env(g, t, 0.2 - i * 0.012, 0.02, dur)
      for (const [fq, q] of [[750, 6], [1250, 8]]) {
        const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = fq; f.Q.value = q
        o.connect(f).connect(g)
      }
      g.connect(ctx.destination)
      o.start(t); vib.start(t); o.stop(t + dur + 0.05); vib.stop(t + dur + 0.05)
    }
  },
}

/* ---------- the component ---------- */
export default function PieScare() {
  const [scare, setScare] = useState(null)
  const timers = useRef([])
  const busy = useRef(false)
  const fireRef = useRef(null)
  const [gate, setGate] = useState(false)

  useEffect(() => {
    const later = (ms, fn) => { const id = setTimeout(fn, ms); timers.current.push(id); return id }

    const unlock = () => unlockAudio()
    const evts = ['pointerdown', 'keydown', 'touchstart']
    evts.forEach((e) => window.addEventListener(e, unlock, { passive: true }))

    let next = null
    const schedule = (range) => { next = later(rand(...range), () => fire()) }

    // throw a pie the moment a link is clicked
    const onClick = (e) => {
      if (!THROW_ON_LINK_CLICK || busy.current || !e.target.closest?.('a[href]')) return
      clearTimeout(next)
      fire(true)
    }
    document.addEventListener('click', onClick, true)

    function fire(force = false) {
      if (busy.current) return
      // timed pies wait if the mobile menu is open or the tab is hidden (link clicks don't)
      if (!force && (document.hidden || document.body.style.overflow === 'hidden')) return schedule([4000, 8000])
      busy.current = true

      const vw = window.innerWidth, vh = window.innerHeight
      const roo = document.querySelector('.roo')
      const r = roo && roo.getBoundingClientRect()
      const visible = r && Math.min(r.bottom, vh) - Math.max(r.top, 0) > r.height * 0.5 && r.right > 0 && r.left < vw
      const peekW = Math.min(130, Math.max(84, vw * 0.18))

      const s = {
        mode: visible ? 'roo' : 'peek',
        ox: visible ? r.left + r.width * 0.8 : vw - 12 - peekW * 0.22,
        oy: visible ? r.top + r.height * 0.86 : vh - peekW * 0.2,
        bx: visible ? r.left + r.width * 0.5 : vw - 12 - peekW / 2,
        by: visible ? Math.max(r.top + r.height * 0.1, 110) : vh - peekW * 0.95,
        ex: vw / 2 + rand(-vw * 0.12, vw * 0.12),
        ey: vh / 2 + rand(-vh * 0.1, vh * 0.1),
        sc: Math.max(vw, vh) / 130,
        splat: makeSplat(),
        phase: 'wind',
      }
      setScare(s)
      const phase = (p) => setScare((cur) => cur && { ...cur, phase: p })
      const rooEl = visible ? roo : null
      rooEl && rooEl.classList.add('lunge')

      later(WIND_UP, () => { phase('fly'); sfx.whoosh() })
      later(WIND_UP + FLIGHT, () => {
        phase('splat')
        sfx.splat(); sfx.laugh(0.3)
        navigator.vibrate && navigator.vibrate([70, 40, 40])
        if (rooEl) { rooEl.classList.remove('lunge'); rooEl.classList.add('laugh') }
        const main = document.querySelector('main')
        if (main) { main.classList.remove('pie-shake'); void main.offsetWidth; main.classList.add('pie-shake') }
      })
      later(WIND_UP + FLIGHT + SPLAT_HOLD, () => phase('out'))
      later(WIND_UP + FLIGHT + SPLAT_HOLD + 700, () => {
        rooEl && rooEl.classList.remove('lunge', 'laugh')
        document.querySelector('main')?.classList.remove('pie-shake')
        setScare(null); busy.current = false
        schedule(GAP)
      })
    }

    fireRef.current = fire

    // First pie: straight away if the browser already allows sound, otherwise ask for one tap.
    unlockAudio()
    const probe = later(150, () => {
      if (!SOUND_GATE || (ctx && ctx.state === 'running')) schedule(FIRST_DELAY)
      else { setGate(true); document.body.style.overflow = 'hidden' }
    })
    return () => {
      clearTimeout(probe)
      document.removeEventListener('click', onClick, true)
      timers.current.forEach(clearTimeout); timers.current = []
      evts.forEach((e) => window.removeEventListener(e, unlock))
      document.querySelector('.roo')?.classList.remove('lunge', 'laugh')
      busy.current = false
    }
  }, [])

  const enter = () => {
    unlockAudio()                       // this tap is the user gesture that allows sound
    setGate(false); document.body.style.overflow = ''
    setTimeout(() => fireRef.current && fireRef.current(true), 120)
  }

  if (gate) {
    return (
      <div className="pie-gate" role="dialog" aria-label="Welcome">
        <img src="/mate.png" alt="" />
        <h2>G’day, mate!</h2>
        <button className="btn" autoFocus onClick={enter}>Tap to enter 🔊</button>
      </div>
    )
  }
  if (!scare) return null
  const { mode, phase } = scare
  const showSplat = phase === 'splat' || phase === 'out'
  const laughing = showSplat

  return (
    <div className="pie-layer" aria-hidden="true">
      {mode === 'peek' && (
        <img src="/mate.png" alt="" className={`pie-peek ${phase === 'out' ? 'down' : ''} ${laughing ? 'laugh' : ''}`} />
      )}

      {phase === 'fly' && (
        <div className="pie-fly" style={{
          '--sx': `${scare.ox}px`, '--sy': `${scare.oy}px`,
          '--ex': `${scare.ex}px`, '--ey': `${scare.ey}px`, '--sc': scare.sc,
          animationDuration: `${FLIGHT}ms`,
        }}>
          <PieSvg />
        </div>
      )}

      {showSplat && (
        <>
          <div className="pie-flash" />
          <div className={`pie-splat ${phase === 'out' ? 'out' : ''}`} style={{ left: scare.ex, top: scare.ey }}>
            <Splat data={scare.splat} />
          </div>
          <div className={`pie-bubble ${phase === 'out' ? 'out' : ''}`} style={{ left: scare.bx, top: scare.by }}>
            <b>HA HA HA!</b>
            <span>Got ya, mate!</span>
          </div>
        </>
      )}
    </div>
  )
}
