import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import Generator from './Generator.jsx'
import './styles.css'

// Tiny hash router: "#/generator" shows the meme generator, anything else is the
// original landing page (so existing "#why", "#buy" anchors keep working).
const routeOf = () => (window.location.hash.startsWith('#/generator') ? 'generator' : 'home')

function Root() {
  const [route, setRoute] = useState(routeOf)
  useEffect(() => {
    const onHash = () => setRoute(routeOf())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  useEffect(() => { window.scrollTo(0, 0) }, [route])
  return route === 'generator' ? <Generator /> : <App />
}

createRoot(document.getElementById('root')).render(<Root />)
