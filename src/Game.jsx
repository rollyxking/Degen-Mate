import { useCallback, useEffect, useRef, useState } from 'react'
import { createGame, Sfx } from './gameEngine.js'
import { drawRoo } from './roo.js'
import { cleanName, getBest, getName, getTop, isGlobal, setBest, setName, submitScore } from './leaderboard.js'

const sfx = new Sfx()
try { sfx.muted = localStorage.getItem('dm_muted') === '1' } catch { /* ignore */ }

function Preview() {
  const ref = useRef(null)
  useEffect(() => {
    const cv = ref.current, c = cv.getContext('2d')
    let raf, t = 0
    const loop = () => {
      raf = requestAnimationFrame(loop); t += 0.016
      c.clearRect(0, 0, 320, 320)
      const g = c.createRadialGradient(160, 170, 20, 160, 170, 150)
      g.addColorStop(0, 'rgba(125,249,255,.35)'); g.addColorStop(1, 'rgba(125,249,255,0)')
      c.fillStyle = g; c.fillRect(0, 0, 320, 320)
      for (let i = 0; i < 3; i++) {
        const a = t * 1.5 + i * 2.1, x = 160 + Math.cos(a) * 120, y = 150 + Math.sin(a * 1.3) * 60
        c.save(); c.translate(x, y); c.scale(Math.max(0.3, Math.abs(Math.cos(t * 4 + i))), 1)
        c.fillStyle = '#ffc928'; c.strokeStyle = '#b06a00'; c.lineWidth = 3
        c.beginPath(); c.arc(0, 0, 15, 0, Math.PI * 2); c.fill(); c.stroke(); c.restore()
      }
      c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(160, 290, 50, 9, 0, 0, Math.PI * 2); c.fill()
      drawRoo(c, 150, 288 - Math.abs(Math.sin(t * 3)) * 26, { t, air: false, scale: 2.6 })
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [])
  return <canvas ref={ref} width="320" height="320" className="dg-preview" role="img" aria-label="DegenMate kangaroo running" />
}

export default function Game() {
  const [screen, setScreen] = useState('home') // home | play | over
  const [runId, setRunId] = useState(0)
  const [name, setNameState] = useState(() => getName())
  const [err, setErr] = useState('')
  const [best, setBestState] = useState(() => getBest())
  const [board, setBoard] = useState([])
  const [boardInfo, setBoardInfo] = useState({ loading: true, global: false })
  const [viewW, setViewW] = useState(800)
  const [saveState, setSaveState] = useState('')
  const [muted, setMuted] = useState(sfx.muted)
  const [hud, setHud] = useState({ score: 0, lives: 3, coins: 0 })
  const [paused, setPaused] = useState(false)
  const [result, setResult] = useState(null)
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const nameRef = useRef(name)
  const viewRef = useRef(800)
  nameRef.current = name

  const refresh = useCallback(async () => {
    setBoardInfo((b) => ({ ...b, loading: true }))
    const r = await getTop(10)
    setBoard(r.rows); setBoardInfo({ loading: false, global: r.global }); setBestState(getBest())
  }, [])
  useEffect(() => { refresh() }, [refresh])

  const handleOver = useCallback(async (r) => {
    const prev = getBest()
    const isBest = r.score > prev
    if (isBest) setBest(r.score)
    setResult({ ...r, isBest, best: Math.max(prev, r.score) })
    setSaveState('saving')
    setScreen('over')
    const where = await submitScore({ name: cleanName(nameRef.current) || 'Degen', score: r.score, coins: r.coins })
    setSaveState(where)
    refresh()
  }, [refresh])

  const inStage = screen !== 'home'
  useEffect(() => {
    if (!inStage) return undefined
    const g = createGame(canvasRef.current, { onHud: setHud, onPause: setPaused, onOver: handleOver }, sfx, { width: viewRef.current })
    const de = document.documentElement
    de.classList.add('dg-lock')
    gameRef.current = g
    g.start()
    return () => { g.destroy(); gameRef.current = null; de.classList.remove('dg-lock') }
  }, [inStage, runId, handleOver])

  const pickView = () => {
    const w = window.innerWidth < 700 && window.innerHeight > window.innerWidth ? 560 : 800
    viewRef.current = w; setViewW(w)
  }
  const begin = () => {
    const n = cleanName(name)
    if (n.length < 2) { setErr('Pick a username (2–14 characters) to hit the leaderboard.'); return }
    setErr(''); setNameState(n); setName(n)
    sfx.init(); pickView()
    setHud({ score: 0, lives: 3, coins: 0 }); setPaused(false); setResult(null); setSaveState('')
    setRunId((r) => r + 1); setScreen('play')
  }
  const again = () => { sfx.init(); pickView(); setSaveState(''); setHud({ score: 0, lives: 3, coins: 0 }); setPaused(false); setResult(null); setRunId((r) => r + 1); setScreen('play') }
  const home = () => { setScreen('home'); setPaused(false); refresh() }
  const toggleSound = () => {
    const m = !muted; setMuted(m); sfx.setMuted(m)
    try { localStorage.setItem('dm_muted', m ? '1' : '0') } catch { /* ignore */ }
  }
  const jd = (e) => { e.preventDefault(); gameRef.current && gameRef.current.jumpDown() }
  const ju = () => gameRef.current && gameRef.current.jumpUp()

  return (
    <div className="dg">
      <header className="dg-top">
        <a className="dg-back" href="#top">← Back to site</a>
        <b className="dg-brand"><img src="/mate.png" alt="" /> Degen Mate</b>
        <button className="dg-icon" onClick={toggleSound} aria-label={muted ? 'Turn sound on' : 'Turn sound off'} aria-pressed={!muted}>{muted ? '🔇' : '🔊'}</button>
      </header>

      {screen === 'home' && (
        <main className="dg-home">
          <section className="dg-hero">
            <div className="dg-hero-copy">
              <h1><span>DEGENMATECOIN</span><em>THE LAST DEGEN</em></h1>
              <p className="dg-tag">Play. Survive. Earn Glory!</p>
              <label className="dg-name">
                <span>Your username</span>
                <input value={name} maxLength={14} placeholder="e.g. SmokoKing" autoComplete="off"
                  onChange={(e) => { setNameState(e.target.value); setErr('') }}
                  onKeyDown={(e) => e.key === 'Enter' && begin()} />
              </label>
              {err && <p className="dg-err" role="alert">{err}</p>}
              <button className="dg-play" onClick={begin}>PLAY NOW</button>
              <p className="dg-best">Personal best: <b>{best.toLocaleString()}</b></p>
            </div>
            <Preview />
          </section>

          <section className="dg-grid">
            <div className="dg-card">
              <h2>How to play</h2>
              <ul className="dg-how">
                <li><b>Run.</b> The kangaroo runs on its own. You jump.</li>
                <li><b>Jump.</b> <kbd>Space</kbd> or <kbd>↑</kbd> on desktop, tap the big button (or the screen) on mobile. Hold for a higher jump.</li>
                <li><b>Collect.</b> Gold coins = 10 pts, golden crowns = 100 pts.</li>
                <li><b>Avoid.</b> Spikes, rocks and enemies cost a life. Land on an enemy to squash it for 50 pts.</li>
                <li><b>Survive.</b> 3 lives. It gets faster the longer you last. <kbd>Esc</kbd> pauses.</li>
              </ul>
            </div>
            <div className="dg-card">
              <h2>Top 10 <button className="dg-refresh" onClick={refresh} aria-label="Refresh leaderboard">↻</button></h2>
              {boardInfo.loading && board.length === 0 ? <p className="dg-empty">Loading scores…</p> : board.length === 0 ? <p className="dg-empty">No scores yet. Be the first degen on the board!</p> : (
                <div className="dg-scroll"><table className="dg-board">
                  <thead><tr><th>#</th><th>Player</th><th>Score</th><th>Coins</th></tr></thead>
                  <tbody>{board.map((e, i) => (
                    <tr key={e.name} className={e.name.toLowerCase() === name.trim().toLowerCase() ? 'me' : ''}>
                      <td>{i + 1}</td><td>{e.name}</td><td>{e.score.toLocaleString()}</td><td>{e.coins}</td>
                    </tr>))}</tbody>
                </table></div>
              )}
              <p className="dg-note">{boardInfo.global ? 'Global leaderboard: everyone playing sees the same ranking.' : isGlobal ? 'Could not reach the global leaderboard, showing scores saved on this device.' : 'Local leaderboard: scores are saved in this browser only.'}</p>
            </div>
          </section>
          <p className="dg-fine">Free to play. Coins are virtual game points only: no $MATE tokens, rewards or real-money earnings are connected to this game.</p>
        </main>
      )}

      {inStage && (
        <main className="dg-stage">
          <div className="dg-frame" style={{ '--ar': viewW / 400 }}>
            <canvas ref={canvasRef} className="dg-canvas" style={{ aspectRatio: `${viewW} / 400` }} aria-label="DegenMateCoin: The Last Degen game" />
            <div className="dg-hud">
              <div className="dg-stat"><small>SCORE</small><b>{hud.score.toLocaleString()}</b><small>BEST {Math.max(best, hud.score).toLocaleString()}</small></div>
              <div className="dg-lives" aria-label={`${hud.lives} lives left`}>
                {[0, 1, 2].map((i) => <span key={i} className={i < hud.lives ? 'on' : ''}>♥</span>)}
              </div>
              <div className="dg-stat r"><small>COINS</small><b>🪙 {hud.coins}</b></div>
              <button className="dg-icon sm" onClick={() => gameRef.current && gameRef.current.pause(!paused)} aria-label="Pause">⏸</button>
            </div>

            {paused && screen === 'play' && (
              <div className="dg-overlay">
                <h2>PAUSED</h2>
                <button className="dg-play" onClick={() => gameRef.current && gameRef.current.pause(false)}>RESUME</button>
                <button className="dg-ghost" onClick={home}>QUIT TO HOME</button>
              </div>
            )}
            {screen === 'over' && result && (
              <div className="dg-overlay">
                <h2 className="dg-over">GAME OVER!</h2>
                {result.isBest && <p className="dg-new">★ NEW PERSONAL BEST ★</p>}
                <dl className="dg-res">
                  <div><dt>Final score</dt><dd>{result.score.toLocaleString()}</dd></div>
                  <div><dt>Coins</dt><dd>{result.coins}</dd></div>
                  <div><dt>Personal best</dt><dd>{result.best.toLocaleString()}</dd></div>
                </dl>
                <p className="dg-save">{saveState === 'saving' ? 'Saving score…' : saveState === 'global' ? '✓ Score sent to the global leaderboard' : saveState === 'local' ? (isGlobal ? 'Offline: saved on this device only' : 'Saved on this device') : ''}</p>
                <button className="dg-play" onClick={again}>PLAY AGAIN</button>
                <button className="dg-ghost" onClick={home}>BACK TO GAME HOME</button>
              </div>
            )}
          </div>
          <button className="dg-jump" onPointerDown={jd} onPointerUp={ju} onPointerCancel={ju} onPointerLeave={ju} onContextMenu={(e) => e.preventDefault()}>JUMP</button>
          <p className="dg-fine">Space / ↑ to jump · Esc to pause</p>
        </main>
      )}
    </div>
  )
}
