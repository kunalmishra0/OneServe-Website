-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles Table (Base Layer)
-- Stores login info and role. Shared by all user types.
create table if not exists profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  role text default 'citizen' check (role in ('citizen', 'admin')),
  created_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- 2. Citizens Table (Extension Layer)
-- Stores additional info specific to citizens
create table if not exists citizens (
  id uuid references profiles(id) on delete cascade not null primary key,
  full_name text,
  email text, -- Added missing email column
  phoneno text,
  address text,
  city text,
  state text,
  pincode text,
  updated_at timestamptz default now()
);

alter table citizens enable row level security;
create policy "Citizens can view own data" on citizens for select using (auth.uid() = id);
create policy "Citizens can update own data" on citizens for update using (auth.uid() = id);
create policy "Citizens can insert own data" on citizens for insert with check (auth.uid() = id);

-- 3. Admins Table (Extension Layer - Future Proofing)
create table if not exists admins (
  id uuid references profiles(id) on delete cascade not null primary key,
  department text,
  badge_number text,
  updated_at timestamptz default now()
);

alter table admins enable row level security;
create policy "Admins can view own data" on admins for select using (auth.uid() = id);



-- 2. Raw Complaints (Layer 1)
-- Initial submission by the citizen. No AI data yet.
create table if not exists raw_complaints (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  user_id uuid references citizens(id) not null,
  title text not null,
  description text not null,
  category text not null,
  location_text text not null, -- formatted address string
  images text[] default array[]::text[], -- Array of Image URLs
  
  -- Metadata
  source text default 'web',
  status text default 'pending_analysis' check (status in ('pending_analysis', 'processed'))
);

-- RLS for Raw Complaints
alter table raw_complaints enable row level security;

create policy "Citizens can view own raw complaints" on raw_complaints
  for select using (auth.uid() = user_id);

create policy "Citizens can insert raw complaints" on raw_complaints
  for insert with check (auth.uid() = user_id);

create policy "Citizens can update own raw complaints" on raw_complaints 
  for update using (auth.uid() = user_id);
  
create policy "Admins can view all raw complaints" on raw_complaints
  for select using (
    exists (select 1 from profiles where id = auth.uid() and (role = 'admin' or email like '%admin%'))
  );


-- 3. Processed Complaints (Layer 2)
-- Enriched data after AI analysis. Accessible by Admins.
create table if not exists processed_complaints (
  id uuid primary key references raw_complaints(id) on delete cascade, -- One-to-one with raw
  created_at timestamptz default now() not null,
  user_id uuid references citizens(id) not null,
  
  -- Inherited/Copied for easier querying (optional, but requested to have 'these columns along with old one')
  description text,
  category text, 
  location_text text,
  images text[],
  
  -- AI / Admin Fields
  priority_score float default 0,
  admin_visible boolean default false,
  ai_status text default 'analyzing', -- AI processing status
  complaint_status text default 'submitted' check (complaint_status in ('submitted', 'verified', 'in_progress', 'resolved', 'rejected')),
  
  ai_analysis_json jsonb -- Full AI response dump
);

-- RLS for Processed Complaints
alter table processed_complaints enable row level security;

create policy "Citizens can view own processed status" on processed_complaints
  for select using (auth.uid() = user_id);

create policy "Admins can all processed complaints" on processed_complaints
  for all using (
     exists (select 1 from profiles where id = auth.uid() and (role = 'admin' or email like '%admin%'))
  );

-- Storage bucket configuration (Script based)
-- insert into storage.buckets (id, name, public) values ('complaints', 'complaints', true);
