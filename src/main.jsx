import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import Generator from './Generator.jsx'
import Game from './Game.jsx'
import './styles.css'
import './game.css'

// Tiny hash router: "#/generator" = meme generator, "#/game" = The Last Degen game, anything else is the
// original landing page (so existing "#why", "#buy" anchors keep working).
const routeOf = () => {
  const h = window.location.hash
  return h.startsWith('#/generator') ? 'generator' : h.startsWith('#/game') ? 'game' : 'home'
}

function Root() {
  const [route, setRoute] = useState(routeOf)
  useEffect(() => {
    const onHash = () => setRoute(routeOf())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  useEffect(() => { window.scrollTo(0, 0) }, [route])
  if (route === 'generator') return <Generator />
  if (route === 'game') return <Game />
  return <App />
}

createRoot(document.getElementById('root')).render(<Root />)
