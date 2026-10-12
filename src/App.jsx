import { useEffect, useRef, useState } from 'react'

const CA = '4T34YQu8UXC925v45yYDs1J2HHu32JpcbFRLw3mapump'
const LINKS = {
  tg: 'https://t.me/DegenMateCoin',
  x: 'https://x.com/degenmatecoin?s=11',
  pump: `https://pump.fun/coin/${CA}`,
  dex: `https://dexscreener.com/solana/${CA}`,
}

function Tape({ reverse = false, children }) {
  const row = Array.from({ length: 8 }, (_, i) => <span key={i}>{children}</span>)
  return (
    <div className={`tape ${reverse ? 'rev' : ''}`} aria-hidden="true">
      <div className="tape-track">{row}{row}</div>
    </div>
  )
}

function CountUp({ to, suffix = '' }) {
  const ref = useRef(null)
  const [n, setN] = useState(0)
  useEffect(() => {
    const el = ref.current
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setN(to); return }
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      const t0 = performance.now()
      const tick = (t) => {
        const p = Math.min((t - t0) / 1400, 1)
        setN(Math.round(to * (1 - Math.pow(1 - p, 3))))
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
    io.observe(el)
    return () => io.disconnect()
  }, [to])
  return <span ref={ref}>{n}{suffix}</span>
}

function CopyCA() {
  const [done, setDone] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(CA) } catch {
      const t = document.createElement('textarea'); t.value = CA
      document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove()
    }
    setDone(true); setTimeout(() => setDone(false), 1800)
  }
  return (
    <button className="ca" onClick={copy} aria-label="Copy contract address">
      <span className="ca-label">CA</span>
      <span className="ca-addr">{CA}</span>
      <span className="ca-copy">{done ? 'Copied!' : 'Copy'}</span>
    </button>
  )
}

const steps = [
  ['Get a wallet', 'Download Phantom or Solflare and set it up. Keep your seed phrase off the internet.'],
  ['Load it with SOL', 'Buy SOL on any exchange and send it to your wallet address.'],
  ['Find $MATE', 'Open pump.fun or Dexscreener and paste the contract address above. Check it matches exactly.'],
  ['Swap and hold', 'Swap your SOL for $MATE. Then come say g’day in the Telegram.'],
]

export default function App() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 10)
    f(); window.addEventListener('scroll', f, { passive: true })
    return () => window.removeEventListener('scroll', f)
  }, [])
  const go = () => setOpen(false)
  useEffect(() => {
  document.body.style.overflow = open ? 'hidden' : ''
  const esc = (e) => e.key === 'Escape' && setOpen(false)
  window.addEventListener('keydown', esc)
  return () => { window.removeEventListener('keydown', esc); document.body.style.overflow = '' }
}, [open])

  return (
    <>
      <header className={`nav ${scrolled ? 'solid' : ''}`}>
        <a href="#top" className="brand"><img src="/mate.png" alt="" /> <b>Degen Mate</b></a>
        <button className="burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
          <i /><i /><i />
        </button>
        <nav className={open ? 'open' : ''}>
          <a href="#why" onClick={go}>The Fair Go</a>
          <a href="#proof" onClick={go}>Safety Check</a>
          <a href="#buy" onClick={go}>How to buy</a>
          <a href="#crew" onClick={go}>The crew</a>
          <a className="btn small" href={LINKS.pump} target="_blank" rel="noreferrer" onClick={go}>Buy $MATE</a>
        </nav>
      </header>

      <main id="top">
        <section className="hero">
          <div className="sun" aria-hidden="true" />
          <div className="hero-copy">
            <p className="kicker">Now on Solana</p>
            <h1>
              <span>The</span> <span>People’s</span> <span>Coin.</span>
            </h1>
            <p className="lede">
              $MATE is built by the community, for the community. Contract renounced,
              liquidity burned, no presale. No cowboy builders doing a runner with the toolbox.
            </p>
            <div className="cta">
              <a className="btn" href={LINKS.pump} target="_blank" rel="noreferrer">Buy $MATE</a>
              <a className="btn ghost" href={LINKS.tg} target="_blank" rel="noreferrer">Join the Telegram</a>
            </div>
            <CopyCA />
          </div>
          <div className="hero-art">
            <div className="ring" aria-hidden="true" />
            <img src="/mate.png" alt="Degen Mate: a kangaroo in hi-vis, shades and a cap, holding a meat pie" className="roo" />
            <span className="sticker s1" aria-hidden="true">Renounced</span>
            <span className="sticker s2" aria-hidden="true">LP burned</span>
            <span className="sticker s3" aria-hidden="true">Fair go</span>
          </div>
        </section>

        <Tape>Smoko’s on ✦ $MATE ✦ No dodgy presale ✦ Hard yards ✦ </Tape>

        <section id="why" className="section manifesto">
          <h2>Grab your smoko, lads.</h2>
          <div className="cols">
            <p>
              We’re sick of the corporate suits, the trust-fund tech bros, and the whales hoarding
              all the green while the rest of us sweat our rings off for a dollar.
            </p>
            <p>
              This coin isn’t for the elite. It’s for every everyday punter who deserves a proper,
              bloody fair go. No dodgy pre-sales, no insider allocation, no corporate BS.
              Just opportunity for the working class.
            </p>
            <p>
              Sparkie, chippie, brickie, or just someone putting in the hard yards: this is our
              ticket to the moon. We’re building a community where everyone gets a slice of the pie.
            </p>
          </div>
        </section>

        <section id="proof" className="section proof">
          <h2>Site safety check</h2>
          <p className="sub">Everything signed off before the first brick went down.</p>
          <ul className="checks">
            <li><strong><CountUp to={100} suffix="%" /></strong><span>Liquidity burned to ashes</span></li>
            <li><strong><CountUp to={0} suffix="%" /></strong><span>Presale. None. Zip.</span></li>
            <li><strong><CountUp to={0} suffix="%" /></strong><span>Insider allocation</span></li>
            <li><strong>Renounced</strong><span>Contract locked. Nobody’s got the keys.</span></li>
          </ul>
        </section>

        <Tape reverse>Contract renounced ✦ Liquidity burned ✦ Built by the community ✦ </Tape>

        <section id="buy" className="section buy">
          <h2>How to buy $MATE</h2>
          <ol className="steps">
            {steps.map(([t, d], i) => (
              <li key={t}><span className="num">{i + 1}</span><div><h3>{t}</h3><p>{d}</p></div></li>
            ))}
          </ol>
          <div className="cta center">
            <a className="btn" href={LINKS.pump} target="_blank" rel="noreferrer">Open pump.fun</a>
            <a className="btn ghost" href={LINKS.dex} target="_blank" rel="noreferrer">View chart</a>
          </div>
        </section>

        <section id="crew" className="section crew">
          <h2>Who’s on site?</h2>
          <p className="sub">Smash that like button and get $MATE moving. Pick a channel.</p>
          <div className="cards">
            <a className="card" href={LINKS.tg} target="_blank" rel="noreferrer">
              <h3>Telegram</h3><p>The smoko room. Chat with the crew.</p><span>t.me/DegenMateCoin</span>
            </a>
            <a className="card" href={LINKS.x} target="_blank" rel="noreferrer">
              <h3>X</h3><p>News, memes, and raids.</p><span>@degenmatecoin</span>
            </a>
          </div>
        </section>
      </main>

      <footer>
        <img src="/mate.png" alt="" />
        <p><b>Degen Mate $MATE</b> is a meme coin with no intrinsic value or expectation of financial return. Nothing here is financial advice. Only spend what you can afford to lose, and always check the contract address.</p>
      </footer>
    </>
  )
}
