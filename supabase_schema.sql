-- DrukNest Supabase Schema
-- Safe to re-run: DROP POLICY IF EXISTS guards prevent duplicate-policy errors.
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
  cid_number text,
  cid_status text not null default 'none' check (cid_status in ('none','pending','verified','rejected')),
  cid_doc_url text,
  avatar_letter text,
  preferred_contact text default 'Phone Call',
  response_time text default 'Within 24 hours',
  created_at timestamptz default now()
);

-- Add new columns if upgrading an existing database
alter table profiles add column if not exists cid_number  text;
alter table profiles add column if not exists cid_doc_url text;
-- cid_status needs special handling for NOT NULL + default on existing rows
do $$ begin
  if not exists (select 1 from information_schema.columns
                 where table_name = 'profiles' and column_name = 'cid_status') then
    alter table profiles add column cid_status text not null default 'none'
      check (cid_status in ('none','pending','verified','rejected'));
  end if;
end $$;

-- RLS for profiles
alter table profiles enable row level security;
drop policy if exists "Public profiles are viewable by everyone" on profiles;
create policy "Public profiles are viewable by everyone" on profiles for select using (true);
drop policy if exists "Users can insert their own profile" on profiles;
create policy "Users can insert their own profile" on profiles for insert with check (auth.uid() = id);
drop policy if exists "Users can update their own profile" on profiles;
create policy "Users can update their own profile" on profiles for update using (auth.uid() = id);
drop policy if exists "Admins can update any profile" on profiles;
create policy "Admins can update any profile" on profiles for update
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

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
drop policy if exists "Live listings are public" on listings;
create policy "Live listings are public" on listings for select using (status = 'live');
drop policy if exists "Admins can see all listings" on listings;
create policy "Admins can see all listings" on listings for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
drop policy if exists "Owners can see own listings" on listings;
create policy "Owners can see own listings" on listings for select using (owner_id = auth.uid());
drop policy if exists "Owners can insert listings" on listings;
create policy "Owners can insert listings" on listings for insert with check (
  auth.uid() = owner_id and
  exists (select 1 from profiles where id = auth.uid() and role in ('owner','admin'))
);
drop policy if exists "Owners can update own listings" on listings;
create policy "Owners can update own listings" on listings for update using (owner_id = auth.uid());
drop policy if exists "Admins can update any listing" on listings;
create policy "Admins can update any listing" on listings for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
drop policy if exists "Owners can delete own listings" on listings;
create policy "Owners can delete own listings" on listings for delete using (owner_id = auth.uid());

-- ─── INQUIRIES ─────────────────────────────────────────────────────────────────
create table if not exists inquiries (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid references listings(id) on delete cascade not null,
  sender_id uuid references profiles(id) on delete cascade not null,
  owner_id uuid references profiles(id) on delete cascade not null,
  message text not null,
  accepted boolean not null default false,
  created_at timestamptz default now()
);

alter table inquiries add column if not exists accepted boolean not null default false;
alter table inquiries enable row level security;
drop policy if exists "Users can create inquiries" on inquiries;
create policy "Users can create inquiries" on inquiries for insert with check (auth.uid() = sender_id);
drop policy if exists "Owners can see inquiries about their listings" on inquiries;
create policy "Owners can see inquiries about their listings" on inquiries for select using (owner_id = auth.uid());
drop policy if exists "Senders can see their own inquiries" on inquiries;
create policy "Senders can see their own inquiries" on inquiries for select using (sender_id = auth.uid());
drop policy if exists "Owners can update inquiries" on inquiries;
create policy "Owners can update inquiries" on inquiries for update using (owner_id = auth.uid());

-- ─── MESSAGES ──────────────────────────────────────────────────────────────────
create table if not exists messages (
  id uuid primary key default uuid_generate_v4(),
  inquiry_id uuid references inquiries(id) on delete cascade not null,
  sender_id uuid references profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

alter table messages enable row level security;
drop policy if exists "Participants can view messages" on messages;
create policy "Participants can view messages" on messages for select using (
  exists (
    select 1 from inquiries
    where id = inquiry_id
    and (sender_id = auth.uid() or owner_id = auth.uid())
  )
);
drop policy if exists "Participants can send messages" on messages;
create policy "Participants can send messages" on messages for insert with check (
  auth.uid() = sender_id and
  exists (
    select 1 from inquiries
    where id = inquiry_id
    and (sender_id = auth.uid() or owner_id = auth.uid())
  )
);

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'messages') then
    alter publication supabase_realtime add table messages;
  end if;
end $$;

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
drop policy if exists "Tenants can create lease requests" on leases;
create policy "Tenants can create lease requests" on leases for insert with check (auth.uid() = tenant_id);
drop policy if exists "Owners can see leases for their listings" on leases;
create policy "Owners can see leases for their listings" on leases for select using (owner_id = auth.uid());
drop policy if exists "Tenants can see their own leases" on leases;
create policy "Tenants can see their own leases" on leases for select using (tenant_id = auth.uid());
drop policy if exists "Owners can update lease status" on leases;
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
drop policy if exists "Anyone can create reports" on reports;
create policy "Anyone can create reports" on reports for insert with check (true);
drop policy if exists "Admins can see all reports" on reports;
create policy "Admins can see all reports" on reports for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
drop policy if exists "Admins can update reports" on reports;
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
drop policy if exists "Users can manage their own saved listings" on saved_listings;
create policy "Users can manage their own saved listings" on saved_listings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── STORAGE BUCKETS ───────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public) values ('listing-photos', 'listing-photos', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('listing-docs',   'listing-docs',   true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('cid-docs',       'cid-docs',       true) on conflict do nothing;

drop policy if exists "Auth users upload listing photos" on storage.objects;
create policy "Auth users upload listing photos" on storage.objects for insert with check (bucket_id = 'listing-photos' and auth.uid() is not null);
drop policy if exists "Auth users upload listing docs" on storage.objects;
create policy "Auth users upload listing docs"   on storage.objects for insert with check (bucket_id = 'listing-docs'   and auth.uid() is not null);
drop policy if exists "Users upload own CID doc" on storage.objects;
create policy "Users upload own CID doc"         on storage.objects for insert with check (bucket_id = 'cid-docs'       and auth.uid() is not null);
drop policy if exists "Public read listing photos" on storage.objects;
create policy "Public read listing photos" on storage.objects for select using (bucket_id = 'listing-photos');
drop policy if exists "Public read listing docs" on storage.objects;
create policy "Public read listing docs"   on storage.objects for select using (bucket_id = 'listing-docs');
drop policy if exists "Public read cid docs" on storage.objects;
create policy "Public read cid docs"       on storage.objects for select using (bucket_id = 'cid-docs');

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
drop policy if exists "Anyone can view active roommate posts" on roommate_posts;
create policy "Anyone can view active roommate posts" on roommate_posts for select using (active = true);
drop policy if exists "Users can create their own roommate post" on roommate_posts;
create policy "Users can create their own roommate post" on roommate_posts for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update their own roommate post" on roommate_posts;
create policy "Users can update their own roommate post" on roommate_posts for update using (auth.uid() = user_id);
drop policy if exists "Users can delete their own roommate post" on roommate_posts;
create policy "Users can delete their own roommate post" on roommate_posts for delete using (auth.uid() = user_id);

-- ─── ROOMMATE CONNECTIONS ───────────────────────────────────────────────────────
create table if not exists roommate_connections (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid references roommate_posts(id) on delete cascade not null,
  sender_id uuid references profiles(id) on delete cascade not null,
  poster_id uuid references profiles(id) on delete cascade not null,
  message text not null,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz default now(),
  unique(post_id, sender_id)
);

-- Add status column if upgrading an existing database
alter table roommate_connections add column if not exists status text not null default 'pending'
  check (status in ('pending','accepted','declined'));

alter table roommate_connections enable row level security;
drop policy if exists "Users can send connection requests" on roommate_connections;
create policy "Users can send connection requests" on roommate_connections for insert with check (auth.uid() = sender_id);
drop policy if exists "Participants can view their connections" on roommate_connections;
create policy "Participants can view their connections" on roommate_connections for select using (sender_id = auth.uid() or poster_id = auth.uid());
drop policy if exists "Posters can update connection status" on roommate_connections;
create policy "Posters can update connection status" on roommate_connections for update using (poster_id = auth.uid());

-- ─── ROOMMATE MESSAGES ──────────────────────────────────────────────────────────
create table if not exists roommate_messages (
  id uuid primary key default uuid_generate_v4(),
  connection_id uuid references roommate_connections(id) on delete cascade not null,
  sender_id uuid references profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

alter table roommate_messages enable row level security;
drop policy if exists "Participants can view roommate messages" on roommate_messages;
create policy "Participants can view roommate messages" on roommate_messages for select using (
  exists (
    select 1 from roommate_connections
    where id = connection_id
    and (sender_id = auth.uid() or poster_id = auth.uid())
  )
);
drop policy if exists "Participants can send roommate messages" on roommate_messages;
create policy "Participants can send roommate messages" on roommate_messages for insert with check (
  auth.uid() = sender_id and
  exists (
    select 1 from roommate_connections
    where id = connection_id
    and (sender_id = auth.uid() or poster_id = auth.uid())
  )
);

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'roommate_messages') then
    alter publication supabase_realtime add table roommate_messages;
  end if;
end $$;

-- ─── PROFILES: new columns ────────────────────────────────────────────────────
alter table profiles add column if not exists suspended boolean not null default false;
alter table profiles add column if not exists avatar_url text;

-- ─── LISTINGS: new columns ─────────────────────────────────────────────────────
alter table listings add column if not exists views integer not null default 0;
alter table listings add column if not exists available_from date;

-- ─── ROOMMATE POSTS: expiry + apartment link ────────────────────────────────────
alter table roommate_posts add column if not exists expires_at timestamptz;
alter table roommate_posts add column if not exists listing_id uuid references listings(id);

-- ─── NOTIFICATIONS ─────────────────────────────────────────────────────────────
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null,
  type text not null,
  title text not null,
  body text not null,
  link_view text,
  read boolean not null default false,
  created_at timestamptz default now()
);

alter table notifications enable row level security;
drop policy if exists "Users can view own notifications" on notifications;
create policy "Users can view own notifications" on notifications for select using (auth.uid() = user_id);
drop policy if exists "Users can update own notifications" on notifications;
create policy "Users can update own notifications" on notifications for update using (auth.uid() = user_id);
drop policy if exists "System can insert notifications" on notifications;
create policy "System can insert notifications" on notifications for insert with check (true);

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'notifications') then
    alter publication supabase_realtime add table notifications;
  end if;
end $$;

-- ─── REVIEWS ───────────────────────────────────────────────────────────────────
create table if not exists reviews (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid references listings(id) on delete cascade not null,
  tenant_id uuid references profiles(id) on delete cascade not null,
  lease_id uuid references leases(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now(),
  unique(listing_id, tenant_id)
);

alter table reviews enable row level security;
drop policy if exists "Anyone can view reviews" on reviews;
create policy "Anyone can view reviews" on reviews for select using (true);
drop policy if exists "Tenants can write reviews" on reviews;
create policy "Tenants can write reviews" on reviews for insert with check (auth.uid() = tenant_id);
drop policy if exists "Tenants can update own review" on reviews;
create policy "Tenants can update own review" on reviews for update using (auth.uid() = tenant_id);

-- ─── RENT PAYMENTS ─────────────────────────────────────────────────────────────
create table if not exists rent_payments (
  id uuid primary key default uuid_generate_v4(),
  lease_id uuid references leases(id) on delete cascade not null,
  tenant_id uuid references profiles(id) on delete cascade not null,
  owner_id uuid references profiles(id) on delete cascade not null,
  due_date date not null,
  amount integer not null,
  status text not null default 'unpaid' check (status in ('unpaid','pending_confirmation','paid','overdue')),
  paid_date timestamptz,
  bank_reference text,
  proof_url text,
  owner_confirmed_at timestamptz,
  month_label text,
  created_at timestamptz default now()
);

alter table rent_payments enable row level security;
drop policy if exists "Tenants can view own rent payments" on rent_payments;
create policy "Tenants can view own rent payments" on rent_payments for select using (auth.uid() = tenant_id);
drop policy if exists "Owners can view own rent payments" on rent_payments;
create policy "Owners can view own rent payments" on rent_payments for select using (auth.uid() = owner_id);
drop policy if exists "Tenants can update own rent payments" on rent_payments;
create policy "Tenants can update own rent payments" on rent_payments for update using (auth.uid() = tenant_id);
drop policy if exists "Owners can confirm rent payments" on rent_payments;
create policy "Owners can confirm rent payments" on rent_payments for update using (auth.uid() = owner_id);
drop policy if exists "System can insert rent payments" on rent_payments;
create policy "System can insert rent payments" on rent_payments for insert with check (true);
drop policy if exists "Admins can see all rent payments" on rent_payments;
create policy "Admins can see all rent payments" on rent_payments for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- storage bucket for payment proofs and avatars
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict do nothing;
drop policy if exists "Users upload own avatar" on storage.objects;
create policy "Users upload own avatar" on storage.objects for insert with check (bucket_id = 'avatars' and auth.uid() is not null);
drop policy if exists "Public read avatars" on storage.objects;
create policy "Public read avatars" on storage.objects for select using (bucket_id = 'avatars');

insert into storage.buckets (id, name, public) values ('payment-proofs', 'payment-proofs', true) on conflict do nothing;
drop policy if exists "Tenants upload payment proofs" on storage.objects;
create policy "Tenants upload payment proofs" on storage.objects for insert with check (bucket_id = 'payment-proofs' and auth.uid() is not null);
drop policy if exists "Participants can view payment proofs" on storage.objects;
create policy "Participants can view payment proofs" on storage.objects for select using (bucket_id = 'payment-proofs');

-- owner bank details on profiles
alter table profiles add column if not exists bank_name text;
alter table profiles add column if not exists bank_account text;

-- leases: deposit confirmation, notes
alter table leases add column if not exists deposit_amount integer default 0;
alter table leases add column if not exists deposit_paid boolean default false;
alter table leases add column if not exists notes text;

-- ─── TRIGGER: auto-create profile on signup ────────────────────────────────────
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─── SEED: make a specific user admin ──────────────────────────────────────────
-- After signing up, run this to grant admin role (replace with your actual email):
-- update profiles set role = 'admin' where email = 'your-admin@example.com';
