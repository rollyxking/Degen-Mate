// Procedural DegenMate kangaroo (orange fur, backward black cap, pink shades,
// neon-green hi-vis vest, black trousers, sneakers). Facing right, feet at (x, y).
const OL = '#1b0a2e', OR = '#f2582b', CR = '#fde7c4', VEST = '#c9ff1f', SH = '#ff4fd8'

export function drawRoo(c, x, y, o = {}) {
  const s = o.scale || 1, t = o.t || 0, air = !!o.air, p = t * 13
  const bob = air ? 0 : -Math.abs(Math.sin(p)) * 3
  c.save()
  c.translate(x, y)
  c.scale(s, s)
  if (o.rot) { c.translate(0, -35); c.rotate(o.rot); c.translate(0, 35) }
  c.lineJoin = 'round'; c.lineCap = 'round'

  // tail
  const sw = Math.sin(p) * 3 + (air ? -5 : 0)
  c.strokeStyle = OL; c.lineWidth = 12
  c.beginPath(); c.moveTo(-8, -26 + bob); c.quadraticCurveTo(-30, -12, -42, -34 + sw); c.stroke()
  c.strokeStyle = OR; c.lineWidth = 8
  c.beginPath(); c.moveTo(-8, -26 + bob); c.quadraticCurveTo(-30, -12, -42, -34 + sw); c.stroke()

  const leg = (ph, back) => {
    const hx = back ? -3 : 3
    const fx = air ? (back ? -6 : 12) : Math.sin(ph) * 12
    const lift = air ? (back ? 10 : 6) : Math.max(0, Math.cos(ph)) * 9
    c.strokeStyle = OL; c.lineWidth = 14
    c.beginPath(); c.moveTo(hx, -28 + bob); c.lineTo(fx + 2, -10 - lift); c.stroke()
    c.strokeStyle = '#1d1a2b'; c.lineWidth = 10
    c.beginPath(); c.moveTo(hx, -28 + bob); c.lineTo(fx + 2, -10 - lift); c.stroke()
    c.fillStyle = '#fff'; c.strokeStyle = OL; c.lineWidth = 1.6
    c.beginPath(); c.ellipse(fx + 6, -5 - lift, 12, 5.5, 0, 0, Math.PI * 2); c.fill(); c.stroke()
    c.fillStyle = '#14141c'
    c.beginPath(); c.ellipse(fx + 12, -5 - lift, 5, 4.2, 0, 0, Math.PI * 2); c.fill()
    c.fillStyle = '#ffd54a'; c.fillRect(fx + 2, -9 - lift, 4, 2)
  }
  leg(p + Math.PI, true)

  // torso + vest
  c.fillStyle = OR; c.strokeStyle = OL; c.lineWidth = 1.8
  c.beginPath(); c.ellipse(0, -42 + bob, 13, 18, 0, 0, Math.PI * 2); c.fill(); c.stroke()
  c.fillStyle = VEST
  c.beginPath(); c.moveTo(-10, -57 + bob); c.lineTo(11, -57 + bob); c.lineTo(12, -29 + bob); c.lineTo(-11, -29 + bob); c.closePath(); c.fill(); c.stroke()
  c.fillStyle = '#d5dde2'; c.fillRect(-11, -45 + bob, 23, 4)
  c.fillStyle = '#14141c'
  c.beginPath(); c.moveTo(-8, -58 + bob); c.lineTo(9, -58 + bob); c.lineTo(1, -50 + bob); c.closePath(); c.fill()
  c.strokeStyle = OL; c.lineWidth = 1.2
  c.beginPath(); c.moveTo(1, -50 + bob); c.lineTo(1, -29 + bob); c.stroke()

  leg(p, false)

  // arm
  const ax = 11 + Math.sin(p + Math.PI) * 6, ay = -36 + bob + (air ? -8 : 0)
  c.strokeStyle = OL; c.lineWidth = 9
  c.beginPath(); c.moveTo(3, -52 + bob); c.lineTo(ax, ay); c.stroke()
  c.strokeStyle = OR; c.lineWidth = 6
  c.beginPath(); c.moveTo(3, -52 + bob); c.lineTo(ax, ay); c.stroke()
  c.fillStyle = OR; c.strokeStyle = OL; c.lineWidth = 1.5
  c.beginPath(); c.arc(ax, ay, 4, 0, Math.PI * 2); c.fill(); c.stroke()

  // ears
  for (const [ex, rot] of [[1, -0.25], [11, 0.15]]) {
    c.save(); c.translate(ex, -86 + bob); c.rotate(rot)
    c.fillStyle = OR; c.strokeStyle = OL; c.lineWidth = 1.6
    c.beginPath(); c.ellipse(0, 0, 4.6, 12, 0, 0, Math.PI * 2); c.fill(); c.stroke()
    c.fillStyle = '#ffb3c7'
    c.beginPath(); c.ellipse(0, 1, 2.2, 8, 0, 0, Math.PI * 2); c.fill()
    c.restore()
  }
  // head
  c.fillStyle = OR; c.strokeStyle = OL; c.lineWidth = 1.8
  c.beginPath(); c.ellipse(8, -65 + bob, 11, 10, 0, 0, Math.PI * 2); c.fill(); c.stroke()
  c.fillStyle = CR
  c.beginPath(); c.ellipse(19, -61 + bob, 8, 6, 0.1, 0, Math.PI * 2); c.fill(); c.stroke()
  c.fillStyle = OL
  c.beginPath(); c.arc(25, -63 + bob, 2.4, 0, Math.PI * 2); c.fill()
  c.strokeStyle = OL; c.lineWidth = 1.2
  c.beginPath(); c.moveTo(15, -58 + bob); c.quadraticCurveTo(20, -55 + bob, 24, -58 + bob); c.stroke()
  // backward cap
  c.fillStyle = '#16161d'; c.strokeStyle = OL; c.lineWidth = 1.6
  c.beginPath(); c.moveTo(-3, -66 + bob); c.quadraticCurveTo(8, -88 + bob, 20, -68 + bob); c.closePath(); c.fill(); c.stroke()
  c.beginPath(); c.moveTo(-3, -67 + bob); c.lineTo(-16, -64 + bob); c.lineTo(-14, -60 + bob); c.lineTo(-2, -63 + bob); c.closePath(); c.fill(); c.stroke()
  c.fillStyle = SH; c.fillRect(6, -77 + bob, 5, 3)
  // shades
  c.strokeStyle = OL; c.lineWidth = 1.5
  c.beginPath(); c.moveTo(7, -66 + bob); c.lineTo(-1, -67 + bob); c.stroke()
  c.fillStyle = SH
  c.beginPath(); c.ellipse(15, -65.5 + bob, 8, 4.4, 0, 0, Math.PI * 2); c.fill(); c.stroke()
  c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1.2
  c.beginPath(); c.moveTo(11, -67 + bob); c.lineTo(15, -67.5 + bob); c.stroke()
  c.restore()
}
