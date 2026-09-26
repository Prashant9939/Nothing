-- Supabase registry schema — write-through mirror of the SQLite app.
-- Run once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query),
-- or set SUPABASE_DB_URL and let scripts/supabase-migrate.js apply it.
-- Re-running is safe (everything is IF NOT EXISTS).
--
-- Security model: RLS is enabled on every table with ZERO policies, so the
-- anon and authenticated keys always get "permission denied". Only the
-- service role key (which bypasses RLS) can read/write, and it is used
-- exclusively by the server — it never reaches the browser.

create table if not exists public.students (
  id bigint generated always as identity primary key,
  local_user_id bigint not null unique,
  first_name text not null check (char_length(first_name) > 0),
  last_name text not null check (char_length(last_name) > 0),
  email text not null unique check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text not null default '',
  university text not null default '',
  college text not null default '',
  course text not null default '',
  year text not null default '',
  gender text not null default '',
  dob text not null default '',
  roll_no text not null default '',
  reg_no text not null default '',
  guardian_name text not null default '',
  guardian_phone text not null default '',
  guardian_relation text not null default '',
  created_by_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admins (
  id bigint generated always as identity primary key,
  local_user_id bigint not null unique,
  first_name text not null,
  last_name text not null default '',
  email text not null unique check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.enrollments (
  id bigint generated always as identity primary key,
  student_id bigint not null references public.students (id) on delete cascade,
  local_enrollment_id bigint not null unique,
  local_user_id bigint not null,
  internship_id bigint not null,
  internship_title text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'active', 'completed', 'expired')),
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  enrolled_at timestamptz,
  expires_at timestamptz,
  offer_no text,
  report_no text,
  attendance_no text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id bigint generated always as identity primary key,
  student_id bigint not null references public.students (id) on delete cascade,
  enrollment_id bigint references public.enrollments (id) on delete cascade,
  local_payment_id bigint not null unique,
  local_enrollment_id bigint not null,
  receipt_number text unique,
  amount numeric not null check (amount >= 0),
  method text not null default 'razorpay',
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'failed', 'refunded')),
  transaction_id text,
  razorpay_order_id text,
  razorpay_payment_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_enrollments_student_id on public.enrollments (student_id);
create index if not exists idx_enrollments_local_user_id on public.enrollments (local_user_id);
create index if not exists idx_payments_student_id on public.payments (student_id);
create index if not exists idx_payments_enrollment_id on public.payments (enrollment_id);

alter table public.students enable row level security;
alter table public.admins enable row level security;
alter table public.enrollments enable row level security;
alter table public.payments enable row level security;
-- Intentionally NO policies: with RLS enabled and no policies, anon and
-- authenticated get "permission denied" for every operation.
