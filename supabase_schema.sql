-- DrukNest Supabase Schema
-- Run this in your Supabase SQL editor at https://app.supabase.com

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── PROFILES ──────────────────────────────────────────────────────────────────
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

-- RLS for profiles
alter table profiles enable row level security;
create policy "Public profiles are viewable by everyone" on profiles for select using (true);
create policy "Users can insert their own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users can update their own profile" on profiles for update using (auth.uid() = id);

-- ─── LISTINGS ──────────────────────────────────────────────────────────────────
create table if not exists listings (
  id uuid primary key default uuid_generate_v4(),
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
  district text,
  deposit integer default 0,
  photo_urls text[] default array[]::text[],
  doc_url text,
  created_at timestamptz default now()
);

-- RLS for listings
alter table listings enable row level security;
-- Anyone can read live listings (no auth required)
create policy "Live listings are public" on listings for select using (status = 'live');
-- Admins can see all listings
create policy "Admins can see all listings" on listings for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
-- Owners can see their own listings
create policy "Owners can see own listings" on listings for select using (owner_id = auth.uid());
-- Owners can insert listings
create policy "Owners can insert listings" on listings for insert with check (
  auth.uid() = owner_id and
  exists (select 1 from profiles where id = auth.uid() and role in ('owner','admin'))
);
-- Owners can update their own listings
create policy "Owners can update own listings" on listings for update using (owner_id = auth.uid());
-- Admins can update any listing (for approve/reject)
create policy "Admins can update any listing" on listings for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
-- Owners can delete their own listings
create policy "Owners can delete own listings" on listings for delete using (owner_id = auth.uid());

-- ─── MESSAGING ─────────────────────────────────────────────────────────────────
-- Add accepted flag to inquiries (run once)
alter table inquiries add column if not exists accepted boolean not null default false;

-- Allow owners to accept inquiries
create policy "Owners can update inquiries" on inquiries for update using (owner_id = auth.uid());

-- Messages table for live chat
create table if not exists messages (
  id uuid primary key default uuid_generate_v4(),
  inquiry_id uuid references inquiries(id) on delete cascade not null,
  sender_id uuid references profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

alter table messages enable row level security;

create policy "Participants can view messages" on messages for select using (
  exists (
    select 1 from inquiries
    where id = inquiry_id
    and (sender_id = auth.uid() or owner_id = auth.uid())
  )
);

create policy "Participants can send messages" on messages for insert with check (
  auth.uid() = sender_id and
  exists (
    select 1 from inquiries
    where id = inquiry_id
    and (sender_id = auth.uid() or owner_id = auth.uid())
  )
);

-- Enable real-time for messages
alter publication supabase_realtime add table messages;

-- ─── INQUIRIES ─────────────────────────────────────────────────────────────────
create table if not exists inquiries (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid references listings(id) on delete cascade not null,
  sender_id uuid references profiles(id) on delete cascade not null,
  owner_id uuid references profiles(id) on delete cascade not null,
  message text not null,
  created_at timestamptz default now()
);

alter table inquiries enable row level security;
create policy "Users can create inquiries" on inquiries for insert with check (auth.uid() = sender_id);
create policy "Owners can see inquiries about their listings" on inquiries for select using (owner_id = auth.uid());
create policy "Senders can see their own inquiries" on inquiries for select using (sender_id = auth.uid());

-- ─── LEASES ────────────────────────────────────────────────────────────────────
create table if not exists leases (
  id uuid primary key default uuid_generate_v4(),
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
create policy "Tenants can create lease requests" on leases for insert with check (auth.uid() = tenant_id);
create policy "Owners can see leases for their listings" on leases for select using (owner_id = auth.uid());
create policy "Tenants can see their own leases" on leases for select using (tenant_id = auth.uid());
create policy "Owners can update lease status" on leases for update using (owner_id = auth.uid());

-- ─── REPORTS ───────────────────────────────────────────────────────────────────
create table if not exists reports (
  id uuid primary key default uuid_generate_v4(),
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
create policy "Anyone can create reports" on reports for insert with check (true);
create policy "Admins can see all reports" on reports for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Admins can update reports" on reports for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ─── SAVED LISTINGS ───────────────────────────────────────────────────────────
create table if not exists saved_listings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null,
  listing_id uuid references listings(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(user_id, listing_id)
);

alter table saved_listings enable row level security;
create policy "Users can manage their own saved listings" on saved_listings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── STORAGE BUCKETS ───────────────────────────────────────────────────────────
-- Run once in Supabase SQL editor to create storage buckets and policies:
insert into storage.buckets (id, name, public) values ('listing-photos', 'listing-photos', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('listing-docs',   'listing-docs',   true) on conflict do nothing;

-- Allow authenticated users to upload
create policy "Auth users upload listing photos" on storage.objects for insert with check (bucket_id = 'listing-photos' and auth.uid() is not null);
create policy "Auth users upload listing docs"   on storage.objects for insert with check (bucket_id = 'listing-docs'   and auth.uid() is not null);
-- Allow public read
create policy "Public read listing photos" on storage.objects for select using (bucket_id = 'listing-photos');
create policy "Public read listing docs"   on storage.objects for select using (bucket_id = 'listing-docs');

-- If adding columns to an existing table (run only if table already exists):
-- alter table listings add column if not exists photo_urls text[] default array[]::text[];
-- alter table listings add column if not exists doc_url text;

-- ─── ROOMMATE POSTS ────────────────────────────────────────────────────────────
create table if not exists roommate_posts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null,
  city text not null,
  budget integer not null,
  occupation text not null check (occupation in ('Student', 'Working')),
  gender_preference text not null default 'Any' check (gender_preference in ('Any', 'Male only', 'Female only')),
  move_in_date date not null,
  bio text not null,
  active boolean not null default true,
  created_at timestamptz default now()
);

alter table roommate_posts enable row level security;
create policy "Anyone can view active roommate posts" on roommate_posts for select using (active = true);
create policy "Users can create their own roommate post" on roommate_posts for insert with check (auth.uid() = user_id);
create policy "Users can update their own roommate post" on roommate_posts for update using (auth.uid() = user_id);
create policy "Users can delete their own roommate post" on roommate_posts for delete using (auth.uid() = user_id);

-- ─── ROOMMATE CONNECTIONS ───────────────────────────────────────────────────────
create table if not exists roommate_connections (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid references roommate_posts(id) on delete cascade not null,
  sender_id uuid references profiles(id) on delete cascade not null,
  poster_id uuid references profiles(id) on delete cascade not null,
  message text not null,
  created_at timestamptz default now(),
  unique(post_id, sender_id)
);

alter table roommate_connections enable row level security;
create policy "Users can send connection requests" on roommate_connections for insert with check (auth.uid() = sender_id);
create policy "Participants can view their connections" on roommate_connections for select using (sender_id = auth.uid() or poster_id = auth.uid());

-- ─── ROOMMATE MESSAGES ──────────────────────────────────────────────────────────
create table if not exists roommate_messages (
  id uuid primary key default uuid_generate_v4(),
  connection_id uuid references roommate_connections(id) on delete cascade not null,
  sender_id uuid references profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

alter table roommate_messages enable row level security;

create policy "Participants can view roommate messages" on roommate_messages for select using (
  exists (
    select 1 from roommate_connections
    where id = connection_id
    and (sender_id = auth.uid() or poster_id = auth.uid())
  )
);

create policy "Participants can send roommate messages" on roommate_messages for insert with check (
  auth.uid() = sender_id and
  exists (
    select 1 from roommate_connections
    where id = connection_id
    and (sender_id = auth.uid() or poster_id = auth.uid())
  )
);

alter publication supabase_realtime add table roommate_messages;

-- ─── TRIGGER: auto-create profile on signup ────────────────────────────────────
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
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
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─── SEED: make a specific user admin ──────────────────────────────────────────
-- After signing up, run this to grant admin role (replace with your user's email):
-- update profiles set role = 'admin' where email = 'your-admin@example.com';
