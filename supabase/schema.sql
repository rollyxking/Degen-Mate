-- Run once in Supabase: SQL Editor > New query > paste > Run.
-- One row per player name (case-insensitive). Only the highest score is kept.
create table if not exists public.leaderboard (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 2 and 14),
  name_key text generated always as (lower(name)) stored,
  score integer not null check (score >= 0),
  coins integer not null default 0 check (coins >= 0),
  updated_at timestamptz not null default now()
);
create unique index if not exists leaderboard_name_key_idx on public.leaderboard (name_key);
create index if not exists leaderboard_score_idx on public.leaderboard (score desc);

alter table public.leaderboard enable row level security;

-- Everyone can read the board. Nobody can write directly; writes go through submit_score().
drop policy if exists "public read" on public.leaderboard;
create policy "public read" on public.leaderboard for select to anon, authenticated using (true);

create or replace function public.submit_score(p_name text, p_score integer, p_coins integer)
returns void language plpgsql security definer set search_path = public as $$
declare n text := btrim(regexp_replace(coalesce(p_name, ''), '[^A-Za-z0-9_ .\-]', '', 'g'));
begin
  if char_length(n) < 2 or char_length(n) > 14 then raise exception 'bad name'; end if;
  if p_score < 0 or p_score > 300000 or p_coins < 0 or p_coins > 20000 then raise exception 'bad score'; end if;
  insert into public.leaderboard (name, score, coins) values (n, p_score, p_coins)
  on conflict (name_key) do update
    set score = excluded.score, coins = excluded.coins, updated_at = now()
    where excluded.score > public.leaderboard.score;
end $$;

revoke all on function public.submit_score(text, integer, integer) from public;
grant execute on function public.submit_score(text, integer, integer) to anon, authenticated;
