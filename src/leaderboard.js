// Leaderboard: shared global board via Supabase (free tier) when configured,
// otherwise a local board stored in this browser. Uses plain fetch, no extra packages.
const URL_ = (import.meta.env && import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const KEY_ = (import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) || ''
export const isGlobal = Boolean(URL_ && KEY_)

const LB = 'dm_lb_v1', BEST = 'dm_best_v1', NAME = 'dm_name_v1'
const read = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch { return d } }
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* storage blocked */ } }
export const cleanName = (n) => String(n || '').replace(/[^\w .\-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 14)

const headers = () => {
  const h = { apikey: KEY_, 'Content-Type': 'application/json' }
  if (KEY_.startsWith('eyJ')) h.Authorization = `Bearer ${KEY_}` // legacy JWT keys only
  return h
}
async function api(path, opts = {}, ms = 6000) {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), ms)
  try {
    const r = await fetch(`${URL_}/rest/v1/${path}`, { ...opts, headers: headers(), signal: ctl.signal })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.status === 204 ? null : await r.json().catch(() => null)
  } finally { clearTimeout(timer) }
}

const localTop = (limit) => read(LB, []).sort((a, b) => b.score - a.score || b.coins - a.coins).slice(0, limit)

/** Returns { rows, global } where global=false means the local fallback was used. */
export async function getTop(limit = 10) {
  if (isGlobal) {
    try {
      const rows = await api(`leaderboard?select=name,score,coins&order=score.desc,coins.desc&limit=${limit}`)
      return { rows: Array.isArray(rows) ? rows : [], global: true }
    } catch { /* fall through to local */ }
  }
  return { rows: localTop(limit), global: false }
}

/** Saves locally always; also to the global board when configured. Returns 'global' | 'local'. */
export async function submitScore({ name, score, coins }) {
  const list = read(LB, [])
  const i = list.findIndex((e) => e.name.toLowerCase() === name.toLowerCase())
  if (i === -1) list.push({ name, score, coins, date: Date.now() })
  else if (score > list[i].score) list[i] = { name: list[i].name, score, coins, date: Date.now() }
  write(LB, list.sort((a, b) => b.score - a.score).slice(0, 50))
  if (isGlobal) {
    try { await api('rpc/submit_score', { method: 'POST', body: JSON.stringify({ p_name: name, p_score: score, p_coins: coins }) }); return 'global' } catch { return 'local' }
  }
  return 'local'
}

export const getBest = () => Number(read(BEST, 0)) || 0
export const setBest = (v) => write(BEST, v)
export const getName = () => read(NAME, '')
export const setName = (n) => write(NAME, n)
