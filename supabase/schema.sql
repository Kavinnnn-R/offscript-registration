-- Run this in Supabase Dashboard > SQL Editor.
-- Keep SUPABASE_SERVICE_ROLE_KEY only in server/.env. Never put it in VITE_* variables.

create table if not exists public.event_settings (
  id integer primary key default 1 check (id = 1),
  event_name text not null default 'ELVORA OFFGRID',
  location text not null default 'Anaikatti, Tamil Nadu',
  event_date text not null default 'DATE ANNOUNCEMENT COMING SOON',
  ticket_price integer not null default 999 check (ticket_price >= 0),
  max_people_per_registration integer not null default 4 check (max_people_per_registration between 1 and 4),
  registration_open boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.event_settings (id, event_name, location, event_date, ticket_price, max_people_per_registration, registration_open)
values (1, 'ELVORA OFFGRID', 'Anaikatti, Tamil Nadu', 'DATE ANNOUNCEMENT COMING SOON', 999, 4, true)
on conflict (id) do nothing;

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  registration_code text not null unique,
  event_name text not null,
  participant_count integer not null check (participant_count between 1 and 4),
  amount_due integer not null check (amount_due >= 0),
  currency text not null default 'INR',
  payment_status text not null default 'pending' check (payment_status in ('pending','paid','failed','refunded')),
  registration_status text not null default 'registered' check (registration_status in ('registered','cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.attendees (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  participant_order integer not null check (participant_order between 1 and 4),
  full_name text not null,
  phone text not null,
  email text not null,
  profession text not null,
  age_group text not null,
  created_at timestamptz not null default now(),
  unique (registration_id, participant_order)
);

-- Browser clients receive no direct table access. Server uses service role after validation.
alter table public.event_settings enable row level security;
alter table public.registrations enable row level security;
alter table public.attendees enable row level security;

revoke all on public.event_settings from anon, authenticated;
revoke all on public.registrations from anon, authenticated;
revoke all on public.attendees from anon, authenticated;

-- Future Razorpay integration: add orders/payment IDs only when server-side payment flow is implemented.
