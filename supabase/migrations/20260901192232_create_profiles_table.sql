create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null unique,
  name text not null,
  avatar_path text,
  tiktok text,
  instagram text,
  youtube text,
  twitch text,
  kick text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint profiles_nickname_format check (nickname ~ '^[a-z0-9_-]{3,20}$')
);

alter table profiles enable row level security;

create policy "profiles are publicly readable"
  on profiles for select
  using (true);

create policy "users manage their own profile"
  on profiles for all
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create index idx_profiles_nickname on profiles(nickname);;
