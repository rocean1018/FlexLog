-- FlexLog schema (optional)
-- Run in Supabase SQL editor

create extension if not exists "uuid-ossp";

-- Profiles
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  units text not null default 'lb'
);

-- Targets
create table if not exists targets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  calories numeric not null,
  protein_g numeric not null,
  carbs_g numeric not null,
  fat_g numeric not null,
  updated_at timestamptz not null default now()
);

-- Daily logs
create table if not exists daily_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

-- Meal groups
create table if not exists meal_groups (
  id uuid primary key default uuid_generate_v4(),
  daily_log_id uuid not null references daily_logs(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  collapsed boolean not null default false,
  created_at timestamptz not null default now()
);

-- Food items
create table if not exists food_items (
  id uuid primary key default uuid_generate_v4(),
  meal_group_id uuid not null references meal_groups(id) on delete cascade,
  name text not null,
  source text not null check (source in ('FDC','OFF','CUSTOM')),
  source_id text,
  barcode text,
  qty numeric not null default 1,
  unit text not null default 'serving',
  calories numeric not null default 0,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  created_at timestamptz not null default now()
);

-- Food cache (server-side proxy cache)
create table if not exists food_cache (
  id uuid primary key default uuid_generate_v4(),
  cache_key text unique not null,
  source text,
  source_id text,
  barcode text,
  raw_json jsonb,
  normalized_json jsonb,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Workout days
create table if not exists workout_days (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  weekday int,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Workout exercises
create table if not exists workout_exercises (
  id uuid primary key default uuid_generate_v4(),
  workout_day_id uuid not null references workout_days(id) on delete cascade,
  name text not null,
  sets int not null default 3,
  reps text not null default '8-12',
  track_weight boolean not null default false,
  created_at timestamptz not null default now()
);

-- Exercise logs
create table if not exists exercise_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_day_id uuid not null references workout_days(id) on delete cascade,
  workout_exercise_id uuid not null references workout_exercises(id) on delete cascade,
  date date not null,
  weight numeric,
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, workout_exercise_id, date)
);

-- Enable RLS
alter table profiles enable row level security;
alter table targets enable row level security;
alter table daily_logs enable row level security;
alter table meal_groups enable row level security;
alter table food_items enable row level security;
alter table workout_days enable row level security;
alter table workout_exercises enable row level security;
alter table exercise_logs enable row level security;
alter table food_cache enable row level security;

-- Policies (user-owned rows)
create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_upsert_own" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

create policy "targets_select_own" on targets for select using (auth.uid() = user_id);
create policy "targets_upsert_own" on targets for insert with check (auth.uid() = user_id);
create policy "targets_update_own" on targets for update using (auth.uid() = user_id);

create policy "daily_logs_select_own" on daily_logs for select using (auth.uid() = user_id);
create policy "daily_logs_upsert_own" on daily_logs for insert with check (auth.uid() = user_id);
create policy "daily_logs_update_own" on daily_logs for update using (auth.uid() = user_id);
create policy "daily_logs_delete_own" on daily_logs for delete using (auth.uid() = user_id);

create policy "meal_groups_select_own" on meal_groups
for select using (exists(select 1 from daily_logs dl where dl.id = daily_log_id and dl.user_id = auth.uid()));
create policy "meal_groups_insert_own" on meal_groups
for insert with check (exists(select 1 from daily_logs dl where dl.id = daily_log_id and dl.user_id = auth.uid()));
create policy "meal_groups_update_own" on meal_groups
for update using (exists(select 1 from daily_logs dl where dl.id = daily_log_id and dl.user_id = auth.uid()));
create policy "meal_groups_delete_own" on meal_groups
for delete using (exists(select 1 from daily_logs dl where dl.id = daily_log_id and dl.user_id = auth.uid()));

create policy "food_items_select_own" on food_items
for select using (
  exists(
    select 1
    from meal_groups mg
    join daily_logs dl on dl.id = mg.daily_log_id
    where mg.id = meal_group_id and dl.user_id = auth.uid()
  )
);
create policy "food_items_insert_own" on food_items
for insert with check (
  exists(
    select 1
    from meal_groups mg
    join daily_logs dl on dl.id = mg.daily_log_id
    where mg.id = meal_group_id and dl.user_id = auth.uid()
  )
);
create policy "food_items_update_own" on food_items
for update using (
  exists(
    select 1
    from meal_groups mg
    join daily_logs dl on dl.id = mg.daily_log_id
    where mg.id = meal_group_id and dl.user_id = auth.uid()
  )
);
create policy "food_items_delete_own" on food_items
for delete using (
  exists(
    select 1
    from meal_groups mg
    join daily_logs dl on dl.id = mg.daily_log_id
    where mg.id = meal_group_id and dl.user_id = auth.uid()
  )
);

create policy "workout_days_select_own" on workout_days for select using (auth.uid() = user_id);
create policy "workout_days_insert_own" on workout_days for insert with check (auth.uid() = user_id);
create policy "workout_days_update_own" on workout_days for update using (auth.uid() = user_id);
create policy "workout_days_delete_own" on workout_days for delete using (auth.uid() = user_id);

create policy "workout_exercises_select_own" on workout_exercises
for select using (exists(select 1 from workout_days wd where wd.id = workout_day_id and wd.user_id = auth.uid()));
create policy "workout_exercises_insert_own" on workout_exercises
for insert with check (exists(select 1 from workout_days wd where wd.id = workout_day_id and wd.user_id = auth.uid()));
create policy "workout_exercises_update_own" on workout_exercises
for update using (exists(select 1 from workout_days wd where wd.id = workout_day_id and wd.user_id = auth.uid()));
create policy "workout_exercises_delete_own" on workout_exercises
for delete using (exists(select 1 from workout_days wd where wd.id = workout_day_id and wd.user_id = auth.uid()));

create policy "exercise_logs_select_own" on exercise_logs for select using (auth.uid() = user_id);
create policy "exercise_logs_insert_own" on exercise_logs for insert with check (auth.uid() = user_id);
create policy "exercise_logs_update_own" on exercise_logs for update using (auth.uid() = user_id);
create policy "exercise_logs_delete_own" on exercise_logs for delete using (auth.uid() = user_id);

-- Food cache: allow service role only (recommended). For now, block anon/auth by default.
create policy "food_cache_no_access" on food_cache for select using (false);
create policy "food_cache_no_access_insert" on food_cache for insert with check (false);
create policy "food_cache_no_access_update" on food_cache for update using (false);
create policy "food_cache_no_access_delete" on food_cache for delete using (false);

-- Guest snapshots: device-level serialized state for unauthenticated users (service role access only)
create table if not exists guest_snapshots (
  id uuid primary key default uuid_generate_v4(),
  device_id text unique not null,
  state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table guest_snapshots enable row level security;
create policy "guest_snapshots_service_only" on guest_snapshots for select using (false);
create policy "guest_snapshots_service_only_insert" on guest_snapshots for insert with check (false);
create policy "guest_snapshots_service_only_update" on guest_snapshots for update using (false);
create policy "guest_snapshots_service_only_delete" on guest_snapshots for delete using (false);
