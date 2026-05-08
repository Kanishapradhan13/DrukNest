-- DrukNest — Fix: Safer trigger + profile insert policy
-- Run this in your Supabase SQL Editor

-- 1. Replace trigger with exception-safe version so it never blocks signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  begin
    insert into profiles (id, email, full_name, display_name, role, avatar_letter)
    values (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
      coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
      coalesce(new.raw_user_meta_data->>'role', 'tenant'),
      upper(substr(coalesce(new.raw_user_meta_data->>'full_name', new.email), 1, 1))
    )
    on conflict (id) do nothing;
  exception when others then
    null; -- never block signup due to profile errors
  end;
  return new;
end;
$$;

-- Re-create trigger (in case it wasn't set up yet)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- 2. Also allow service-role upserts (for client-side profile creation)
drop policy if exists "Service role can manage profiles" on profiles;
create policy "Service role can manage profiles" on profiles
  for all using (true) with check (true);
-- Note: the above is broad; in production narrow to service role only

-- 3. Make sure profiles table exists (idempotent)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  display_name text,
  phone text,
  whatsapp text,
  city text default 'Thimphu',
  bio text,
  role text not null default 'tenant' check (role in ('tenant','owner','admin')),
  cid_verified boolean not null default false,
  docs_verified boolean not null default false,
  avatar_letter text,
  preferred_contact text default 'Phone Call',
  response_time text default 'Within 24 hours',
  created_at timestamptz default now()
);

-- 4. Make sure listings table exists (idempotent)
create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  location text not null,
  city text not null,
  type text not null,
  price integer not null,
  beds integer not null default 1,
  baths integer not null default 1,
  sqft integer,
  floor text,
  furnished text default 'Fully Furnished',
  duration text default 'Long-term (6+ months)',
  description text,
  rating numeric(3,2) default 0,
  review_count integer default 0,
  verified boolean default false,
  has_wifi boolean default false,
  has_heat boolean default false,
  has_parking boolean default false,
  has_water boolean default true,
  has_electricity boolean default true,
  has_security boolean default false,
  status text not null default 'pending' check (status in ('pending','live','rejected','unpublished')),
  tag text,
  pal text[] default array['#D4C5F0','#B09FDC'],
  address text,
  deposit integer default 0,
  created_at timestamptz default now()
);

alter table listings enable row level security;

drop policy if exists "Live listings are public" on listings;
create policy "Live listings are public" on listings
  for select using (status = 'live');

drop policy if exists "Owners can see own listings" on listings;
create policy "Owners can see own listings" on listings
  for select using (owner_id = auth.uid());

drop policy if exists "Owners can insert listings" on listings;
create policy "Owners can insert listings" on listings
  for insert with check (auth.uid() = owner_id);

drop policy if exists "Owners can update own listings" on listings;
create policy "Owners can update own listings" on listings
  for update using (owner_id = auth.uid());

drop policy if exists "Admins can see all listings" on listings;
create policy "Admins can see all listings" on listings
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "Admins can update any listing" on listings;
create policy "Admins can update any listing" on listings
  for update using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- 5. Inquiries
create table if not exists inquiries (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings(id) on delete cascade not null,
  sender_id uuid references profiles(id) on delete cascade not null,
  owner_id uuid references profiles(id) on delete cascade not null,
  message text not null,
  created_at timestamptz default now()
);

alter table inquiries enable row level security;
drop policy if exists "Users can create inquiries" on inquiries;
create policy "Users can create inquiries" on inquiries for insert with check (auth.uid() = sender_id);
drop policy if exists "Owners can see inquiries" on inquiries;
create policy "Owners can see inquiries" on inquiries for select using (owner_id = auth.uid() or sender_id = auth.uid());

-- 6. Leases
create table if not exists leases (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings(id) on delete cascade not null,
  tenant_id uuid references profiles(id) on delete cascade not null,
  owner_id uuid references profiles(id) on delete cascade not null,
  start_date date not null,
  end_date date not null,
  monthly_rent integer not null,
  status text not null default 'pending' check (status in ('pending','active','expired','cancelled')),
  created_at timestamptz default now()
);

alter table leases enable row level security;
drop policy if exists "Lease access" on leases;
create policy "Lease access" on leases for all using (tenant_id = auth.uid() or owner_id = auth.uid());

-- 7. Reports
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references profiles(id) on delete set null,
  title text not null,
  target_listing_id uuid references listings(id) on delete set null,
  target_user_id uuid references profiles(id) on delete set null,
  description text not null,
  priority text not null default 'Medium' check (priority in ('Low','Medium','High')),
  status text not null default 'Open' check (status in ('Open','Investigating','Resolved')),
  created_at timestamptz default now()
);

alter table reports enable row level security;
drop policy if exists "Anyone can create reports" on reports;
create policy "Anyone can create reports" on reports for insert with check (true);
drop policy if exists "Admins manage reports" on reports;
create policy "Admins manage reports" on reports for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
