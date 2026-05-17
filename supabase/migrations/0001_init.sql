-- =====================================================
-- Serenity Track — Initial Schema
-- Paste this into your Supabase SQL editor and run it
-- =====================================================

-- =====================================================
-- PROFILES (auto-created on signup via trigger)
-- =====================================================
create table if not exists profiles (
  id              uuid primary key references auth.users on delete cascade,
  display_name    text,
  unit_system     text default 'kg' check (unit_system in ('kg','lb')),
  starting_weight_kg numeric,
  goal_weight_kg  numeric,
  treatment_type  text,
  treatment_start_date date,
  theme_preference text default 'system' check (theme_preference in ('system','light','dark')),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Auto-create a profile row when a new auth user signs up
create or replace function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =====================================================
-- WEIGHT
-- =====================================================
create table if not exists weight_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  weight_kg   numeric(6,2) not null,
  logged_at   timestamptz not null default now(),
  notes       text,
  created_at  timestamptz default now()
);
create index if not exists idx_weight_user_date on weight_entries (user_id, logged_at desc);

-- =====================================================
-- FOODS (library) + FOOD LOGS
-- =====================================================
create table if not exists foods (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references profiles(id) on delete cascade, -- null = public
  name                  text not null,
  calories_per_serving  numeric not null,
  serving_size          text,
  is_custom             boolean default false,
  is_favorite           boolean default false,
  created_at            timestamptz default now()
);
create index if not exists idx_foods_user on foods (user_id);
create index if not exists idx_foods_name on foods (lower(name));

create table if not exists food_logs (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references profiles(id) on delete cascade,
  food_id              uuid references foods(id),
  food_name_snapshot   text not null,
  calories             numeric not null,
  servings             numeric default 1,
  meal_type            text check (meal_type in ('breakfast','lunch','dinner','snack')),
  eaten_at             timestamptz not null default now(),
  notes                text,
  created_at           timestamptz default now()
);
create index if not exists idx_food_logs_user_date on food_logs (user_id, eaten_at desc);

-- =====================================================
-- EXERCISE
-- =====================================================
create table if not exists exercise_logs (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references profiles(id) on delete cascade,
  exercise_type    text not null,
  duration_minutes int not null,
  intensity        text check (intensity in ('light','medium','hard')),
  notes            text,
  performed_at     timestamptz not null default now(),
  created_at       timestamptz default now()
);
create index if not exists idx_exercise_user_date on exercise_logs (user_id, performed_at desc);

-- =====================================================
-- WELLNESS (one row per date)
-- =====================================================
create table if not exists wellness_entries (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references profiles(id) on delete cascade,
  logged_for_date    date not null,
  mood_rating        int check (mood_rating between 1 and 5),
  energy_rating      int check (energy_rating between 1 and 5),
  hydration_glasses  int default 0,
  symptoms           text[],
  journal_notes      text,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now(),
  unique(user_id, logged_for_date)
);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
alter table profiles enable row level security;
alter table weight_entries enable row level security;
alter table foods enable row level security;
alter table food_logs enable row level security;
alter table exercise_logs enable row level security;
alter table wellness_entries enable row level security;

-- profiles
drop policy if exists "own profile read" on profiles;
create policy "own profile read" on profiles for select using (auth.uid() = id);
drop policy if exists "own profile update" on profiles;
create policy "own profile update" on profiles for update using (auth.uid() = id);
drop policy if exists "own profile insert" on profiles;
create policy "own profile insert" on profiles for insert with check (auth.uid() = id);

-- weight_entries
drop policy if exists "own weight" on weight_entries;
create policy "own weight" on weight_entries for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- foods (own + public readable; only own writable)
drop policy if exists "foods read" on foods;
create policy "foods read" on foods for select
  using (user_id = auth.uid() or user_id is null);
drop policy if exists "foods write own" on foods;
create policy "foods write own" on foods for insert with check (user_id = auth.uid());
drop policy if exists "foods update own" on foods;
create policy "foods update own" on foods for update using (user_id = auth.uid());
drop policy if exists "foods delete own" on foods;
create policy "foods delete own" on foods for delete using (user_id = auth.uid());

-- food_logs
drop policy if exists "own food_logs" on food_logs;
create policy "own food_logs" on food_logs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- exercise_logs
drop policy if exists "own exercise" on exercise_logs;
create policy "own exercise" on exercise_logs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- wellness_entries
drop policy if exists "own wellness" on wellness_entries;
create policy "own wellness" on wellness_entries for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =====================================================
-- SEED PUBLIC FOODS (~60 common foods to get started)
-- =====================================================
insert into foods (user_id, name, calories_per_serving, serving_size) values
  (null, 'Apple', 95, '1 medium'),
  (null, 'Banana', 105, '1 medium'),
  (null, 'Orange', 62, '1 medium'),
  (null, 'Strawberries', 49, '1 cup'),
  (null, 'Blueberries', 84, '1 cup'),
  (null, 'Grapes', 104, '1 cup'),
  (null, 'Watermelon', 46, '1 cup'),
  (null, 'Avocado', 234, '1 medium'),
  (null, 'Egg (boiled)', 78, '1 large'),
  (null, 'Egg (fried)', 90, '1 large'),
  (null, 'Greek yogurt (plain)', 100, '1 cup'),
  (null, 'Oatmeal (cooked)', 154, '1 cup'),
  (null, 'White rice (cooked)', 206, '1 cup'),
  (null, 'Brown rice (cooked)', 218, '1 cup'),
  (null, 'Quinoa (cooked)', 222, '1 cup'),
  (null, 'Pasta (cooked)', 220, '1 cup'),
  (null, 'Bread, whole wheat', 81, '1 slice'),
  (null, 'Bread, white', 75, '1 slice'),
  (null, 'Bagel, plain', 245, '1 medium'),
  (null, 'Toast with butter', 130, '1 slice'),
  (null, 'Chicken breast (grilled)', 165, '100 g'),
  (null, 'Chicken thigh (grilled)', 209, '100 g'),
  (null, 'Salmon (baked)', 206, '100 g'),
  (null, 'Tuna (canned, water)', 116, '100 g'),
  (null, 'Shrimp (cooked)', 99, '100 g'),
  (null, 'Beef (lean, grilled)', 250, '100 g'),
  (null, 'Pork chop (grilled)', 231, '100 g'),
  (null, 'Tofu (firm)', 144, '100 g'),
  (null, 'Lentils (cooked)', 230, '1 cup'),
  (null, 'Chickpeas (cooked)', 269, '1 cup'),
  (null, 'Black beans (cooked)', 227, '1 cup'),
  (null, 'Almonds', 164, '1 oz (23 nuts)'),
  (null, 'Walnuts', 185, '1 oz'),
  (null, 'Peanut butter', 188, '2 tbsp'),
  (null, 'Cheddar cheese', 113, '1 oz'),
  (null, 'Mozzarella', 85, '1 oz'),
  (null, 'Milk, 2%', 122, '1 cup'),
  (null, 'Milk, almond unsweetened', 30, '1 cup'),
  (null, 'Butter', 102, '1 tbsp'),
  (null, 'Olive oil', 119, '1 tbsp'),
  (null, 'Broccoli (steamed)', 55, '1 cup'),
  (null, 'Spinach (raw)', 7, '1 cup'),
  (null, 'Carrots (raw)', 52, '1 cup'),
  (null, 'Sweet potato (baked)', 112, '1 medium'),
  (null, 'Potato (baked)', 161, '1 medium'),
  (null, 'Tomato', 22, '1 medium'),
  (null, 'Cucumber', 16, '1 cup'),
  (null, 'Bell pepper', 24, '1 medium'),
  (null, 'Salad with vinaigrette', 150, '2 cups'),
  (null, 'Hummus', 70, '2 tbsp'),
  (null, 'Soup, chicken noodle', 75, '1 cup'),
  (null, 'Soup, tomato', 90, '1 cup'),
  (null, 'Sandwich, turkey', 320, '1 sandwich'),
  (null, 'Pizza slice (cheese)', 285, '1 slice'),
  (null, 'Burger (hamburger)', 354, '1 medium'),
  (null, 'French fries', 312, '1 medium order'),
  (null, 'Dark chocolate', 170, '1 oz'),
  (null, 'Ice cream (vanilla)', 137, '1/2 cup'),
  (null, 'Cookie (chocolate chip)', 78, '1 small'),
  (null, 'Coffee (black)', 2, '1 cup'),
  (null, 'Tea (unsweetened)', 2, '1 cup'),
  (null, 'Orange juice', 112, '1 cup'),
  (null, 'Protein shake', 160, '1 scoop with water')
on conflict do nothing;
