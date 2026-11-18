# Degen Mate ($MATE) website
React + Vite.

    npm install
    npm run dev      # local preview
    npm run build    # outputs /dist, deploy to Netlify / Vercel / Cloudflare Pages

Edit the contract address and links at the top of `src/App.jsx`.
Replace `public/mate.png` to swap the logo.

## Game: The Last Degen
Route `#/game` (Play Game button in nav, hero and a banner on the home page).
Files: `src/Game.jsx` (UI), `src/gameEngine.js` (canvas engine + sounds), `src/roo.js` (kangaroo), `src/leaderboard.js` (local storage, async so Supabase can replace it), `src/game.css`.

### Global leaderboard (free, Supabase)
1. Create a free project at supabase.com, open **SQL Editor**, paste `supabase/schema.sql`, Run.
2. Project Settings > API: copy the **Project URL** and the **anon / publishable key**.
3. Vercel > Project > Settings > Environment Variables: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then redeploy. (Locally: copy `.env.example` to `.env.local`.)
Without these variables the game falls back to a per-device board. Players can only write through `submit_score()`, which keeps each name's best score and rejects impossible values.
