import { useEffect, useRef, useState } from 'react'

const SIZE = 1080
const SITE = 'https://megenmate.vercel.app/'
const FONT = '"Bowlby One","Arial Black",Impact,sans-serif'
const BAND = 190 // height of the caption bands on the banded templates

// Templates use the existing mascot (public/mate.png). The mascot image has its own
// white background, so the coloured templates frame it between caption bands.
const TEMPLATES = [
  { id: 'classic', name: 'Classic', banded: false, fill: '#ffffff', stroke: '#141414' },
  { id: 'hivis', name: 'Hi-Vis', banded: true, bg: '#d7f50f', fill: '#141414', stroke: null },
  { id: 'sky', name: 'Sky', banded: true, bg: '#1f8fe8', fill: '#ffffff', stroke: '#141414' },
  { id: 'roo', name: 'Roo', banded: true, bg: '#f2582b', fill: '#ffffff', stroke: '#141414' },
]

function wrap(ctx, text, maxW) {
  const words = text.split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (line && ctx.measureText(test).width > maxW) { lines.push(line); line = w } else line = test
  }
  if (line) lines.push(line)
  return lines
}

function fit(ctx, text, maxW, maxLines, start, min) {
  for (let size = start; size >= min; size -= 4) {
    ctx.font = `${size}px ${FONT}`
    const lines = wrap(ctx, text, maxW)
    if (lines.length <= maxLines && lines.every((l) => ctx.measureText(l).width <= maxW)) return { size, lines }
  }
  ctx.font = `${min}px ${FONT}`
  return { size: min, lines: wrap(ctx, text, maxW).slice(0, maxLines) }
}

function drawText(ctx, text, tpl, zone) {
  const t = text.trim().toUpperCase()
  if (!t) return
  const { size, lines } = fit(ctx, t, SIZE - 100, 3, tpl.banded ? 92 : 120, 36)
  const lh = size * 1.08
  const total = lh * lines.length
  let y
  if (tpl.banded) y = zone === 'top' ? (BAND - total) / 2 : SIZE - BAND + (BAND - total) / 2
  else y = zone === 'top' ? 36 : SIZE - 36 - total
  ctx.font = `${size}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.lineJoin = 'round'
  lines.forEach((l, i) => {
    const ly = y + i * lh
    if (tpl.stroke) { ctx.lineWidth = size * 0.18; ctx.strokeStyle = tpl.stroke; ctx.strokeText(l, SIZE / 2, ly) }
    ctx.fillStyle = tpl.fill
    ctx.fillText(l, SIZE / 2, ly)
  })
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function render(canvas, img, tpl, top, bottom) {
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, SIZE, SIZE)
  if (tpl.banded) {
    ctx.fillStyle = tpl.bg
    ctx.fillRect(0, 0, SIZE, SIZE)
    ctx.fillStyle = 'rgba(0,0,0,.06)'
    for (let x = -SIZE; x < SIZE * 2; x += 120) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 60, 0); ctx.lineTo(x + 60 - SIZE * 0.47, SIZE); ctx.lineTo(x - SIZE * 0.47, SIZE); ctx.fill()
    }
    const h = SIZE - BAND * 2
    const w = h * (img.width / img.height)
    const x = (SIZE - w) / 2
    ctx.save()
    roundedRect(ctx, x, BAND, w, h, 28)
    ctx.clip()
    ctx.drawImage(img, x, BAND, w, h)
    ctx.restore()
    ctx.lineWidth = 10; ctx.strokeStyle = '#141414'
    roundedRect(ctx, x, BAND, w, h, 28)
    ctx.stroke()
  } else {
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, SIZE, SIZE)
    const s = Math.max(SIZE / img.width, SIZE / img.height)
    ctx.drawImage(img, (SIZE - img.width * s) / 2, (SIZE - img.height * s) / 2, img.width * s, img.height * s)
  }
  drawText(ctx, top, tpl, 'top')
  drawText(ctx, bottom, tpl, 'bottom')
}

const toBlob = (canvas) => new Promise((res) => canvas.toBlob(res, 'image/png'))

export default function Generator() {
  const canvasRef = useRef(null)
  const imgRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [tplId, setTplId] = useState('classic')
  const [top, setTop] = useState('Smoko’s on')
  const [bottom, setBottom] = useState('Fair go for every punter')
  const [notice, setNotice] = useState('')
  const tpl = TEMPLATES.find((t) => t.id === tplId)

  useEffect(() => {
    let alive = true
    const img = new Image()
    img.src = '/mate.png'
    const loaded = new Promise((res, rej) => { img.onload = res; img.onerror = rej })
    const font = document.fonts ? document.fonts.load(`40px "Bowlby One"`).catch(() => {}) : Promise.resolve()
    Promise.all([loaded, font]).then(() => { if (alive) { imgRef.current = img; setReady(true) } })
      .catch(() => { if (alive) setNotice('Could not load the mascot image. Refresh and try again.') })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (ready && canvasRef.current) render(canvasRef.current, imgRef.current, tpl, top, bottom)
  }, [ready, tpl, top, bottom])

  const download = async () => {
    const blob = await toBlob(canvasRef.current)
    if (!blob) { setNotice('Could not create the image. Try again.'); return false }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'degen-mate-meme.png'
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    setNotice('Meme downloaded.')
    return true
  }

  const shareX = async () => {
    const text = `${top ? top + ' ' : ''}${bottom || ''}`.trim()
    const caption = `${text ? text + ' ' : ''}$MATE @degenmatecoin`.slice(0, 200)
    const blob = await toBlob(canvasRef.current)
    const file = blob && new File([blob], 'degen-mate-meme.png', { type: 'image/png' })
    // Phones: share the actual image through the native share sheet (pick X).
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], text: caption }); return } catch (e) { if (e.name === 'AbortError') return }
    }
    // Desktop: X web intents can't attach images, so save the file and open the composer.
    if (await download()) {
      window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(caption)}&url=${encodeURIComponent(SITE)}`, '_blank', 'noopener')
      setNotice('Meme saved. Attach it to your post on X.')
    }
  }

  return (
    <>
      <header className="nav solid">
        <a href="#top" className="brand"><img src="/mate.png" alt="" /> <b>Degen Mate</b></a>
        <nav style={{ display: 'flex' }}>
          <a className="btn small" href="#top">Back to site</a>
        </nav>
      </header>
      <main className="gen">
        <div className="gen-head">
          <p className="kicker">Meme generator</p>
          <h1>Make a Mate meme.</h1>
        </div>
        <div className="gen-grid">
          <div className="gen-preview">
            <canvas ref={canvasRef} width={SIZE} height={SIZE} className="gen-canvas" role="img"
              aria-label={`Meme preview. Top text: ${top || 'none'}. Bottom text: ${bottom || 'none'}.`} />
          </div>
          <div className="gen-controls">
            <fieldset>
              <legend>Template</legend>
              <div className="gen-tpls">
                {TEMPLATES.map((t) => (
                  <button key={t.id} type="button" className="gen-tpl" aria-pressed={t.id === tplId} onClick={() => setTplId(t.id)}>
                    <i style={{ background: t.bg || '#fff' }} aria-hidden="true" />{t.name}
                  </button>
                ))}
              </div>
            </fieldset>
            <label>Top text
              <input value={top} maxLength={80} onChange={(e) => setTop(e.target.value)} placeholder="Top text" />
            </label>
            <label>Bottom text
              <input value={bottom} maxLength={80} onChange={(e) => setBottom(e.target.value)} placeholder="Bottom text" />
            </label>
            <div className="cta">
              <button className="btn" type="button" onClick={download} disabled={!ready}>Download</button>
              <button className="btn ghost" type="button" onClick={shareX} disabled={!ready}>Share on X</button>
            </div>
            <p className="gen-note" role="status" aria-live="polite">{notice}</p>
          </div>
        </div>
      </main>
    </>
  )
}
