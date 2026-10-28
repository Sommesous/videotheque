-- Ma Vidéothèque : base de données Supabase
-- À coller dans Supabase > SQL Editor > New query, puis cliquer sur « Run ».
-- Le script peut être relancé sans risque.

-- 1. Vidéos
create table if not exists public.videos (
  id          uuid primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  url         text not null,
  platform    text not null default 'web',
  ref         text not null default '',
  key         text not null,
  title       text not null,
  category    text not null default 'Sans catégorie',
  note        text not null default '',
  kind        text not null default 'video',   -- video, recipe, product, outfit, place
  ingredients text not null default '',         -- fiche recette
  price       text not null default '',         -- fiche produit
  address     text not null default '',         -- fiche lieu
  added_at    timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, key)
);

-- 1b. Si la table existait déjà (mise à jour d'une installation précédente) :
alter table public.videos add column if not exists kind        text not null default 'video';
alter table public.videos add column if not exists ingredients text not null default '';
alter table public.videos add column if not exists price       text not null default '';
alter table public.videos add column if not exists address     text not null default '';
-- Miniature : '' = aucune, 'yt' = image fournie par YouTube, sinon chemin du fichier dans l'espace « thumbs »
alter table public.videos add column if not exists thumb         text not null default '';
-- Moment choisi dans la vidéo, en secondes (YouTube l'ouvre à cet instant)
alter table public.videos add column if not exists start_seconds integer;

-- 2. Catégories
create table if not exists public.categories (
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null,
  position    integer not null default 0,
  primary key (user_id, name)
);
alter table public.categories add column if not exists color text not null default '';

-- 3. Sécurité : chaque compte ne voit et ne modifie que ses propres données
alter table public.videos     enable row level security;
alter table public.categories enable row level security;

drop policy if exists "videos: mes lignes" on public.videos;
create policy "videos: mes lignes" on public.videos
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "categories: mes lignes" on public.categories;
create policy "categories: mes lignes" on public.categories
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 4. Temps réel : prévenir les autres appareils à chaque changement
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and tablename = 'videos') then
    alter publication supabase_realtime add table public.videos;
  end if;
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and tablename = 'categories') then
    alter publication supabase_realtime add table public.categories;
  end if;
end $$;

create index if not exists videos_user_added on public.videos (user_id, added_at desc);

-- 5. Miniatures : espace de fichiers PRIVÉ « thumbs »
--    Chaque compte ne peut lire et écrire que dans son propre dossier (thumbs/<son identifiant>/...).
insert into storage.buckets (id, name, public)
values ('thumbs', 'thumbs', false)
on conflict (id) do nothing;

drop policy if exists "thumbs: lire mes images" on storage.objects;
create policy "thumbs: lire mes images" on storage.objects
  for select to authenticated
  using (bucket_id = 'thumbs' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "thumbs: ajouter mes images" on storage.objects;
create policy "thumbs: ajouter mes images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'thumbs' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "thumbs: remplacer mes images" on storage.objects;
create policy "thumbs: remplacer mes images" on storage.objects
  for update to authenticated
  using (bucket_id = 'thumbs' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'thumbs' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "thumbs: supprimer mes images" on storage.objects;
create policy "thumbs: supprimer mes images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'thumbs' and (storage.foldername(name))[1] = (select auth.uid()::text));
