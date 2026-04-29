-- ═══════════════════════════════════════════════════════════════
-- 雙福輔導團週報系統 · Supabase SQL Schema
-- 在 Supabase > SQL Editor 貼入後點「Run」執行
-- ═══════════════════════════════════════════════════════════════

-- 週報摘要表
create table if not exists weekly_summary (
  id             uuid default gen_random_uuid() primary key,
  user_name      text not null,
  week_key       text not null,
  expected_hours numeric default 0,
  actual_hours   numeric default 0,
  leave_hours    numeric default 0,
  ot_hours       numeric default 0,
  traffic_hours  numeric default 0,
  diff_hours     numeric default 0,
  notes          text,
  updated_at     timestamptz default now(),
  unique(user_name, week_key)
);

-- 工作項目明細表
create table if not exists work_items (
  id          uuid default gen_random_uuid() primary key,
  user_name   text not null,
  week_key    text not null,
  goal        text,
  subcat      text,
  category    text,
  item_name   text,
  hours       numeric default 0,
  note        text,
  updated_at  timestamptz default now()
);

-- 年度計畫表
create table if not exists annual_plan (
  id          uuid default gen_random_uuid() primary key,
  user_name   text not null,
  year        text not null,
  goal        text not null,
  job_pct     numeric,
  plan_pct    numeric,
  note        text,
  updated_at  timestamptz default now(),
  unique(user_name, year, goal)
);

-- ── Row Level Security ─────────────────────────────────────────
alter table weekly_summary enable row level security;
alter table work_items     enable row level security;
alter table annual_plan    enable row level security;

-- 每個登入用戶只能讀寫自己的資料（使用 Supabase Auth email）
create policy "users own data" on weekly_summary
  for all using (user_name = auth.jwt() ->> 'email')
  with check (user_name = auth.jwt() ->> 'email');

create policy "users own data" on work_items
  for all using (user_name = auth.jwt() ->> 'email')
  with check (user_name = auth.jwt() ->> 'email');

create policy "users own data" on annual_plan
  for all using (user_name = auth.jwt() ->> 'email')
  with check (user_name = auth.jwt() ->> 'email');

-- 主管可以讀取所有人的資料（需手動設定 is_manager = true）
-- 可選：若要讓管理員看到所有人資料，另建 admin policy：
-- create policy "managers read all" on weekly_summary
--   for select using (
--     exists (select 1 from auth.users where id = auth.uid() and raw_user_meta_data->>'is_manager' = 'true')
--   );

-- ── 效能索引 ──────────────────────────────────────────────────
create index if not exists idx_weekly_summary_user  on weekly_summary(user_name);
create index if not exists idx_weekly_summary_week  on weekly_summary(week_key);
create index if not exists idx_work_items_user      on work_items(user_name);
create index if not exists idx_work_items_week      on work_items(week_key);
create index if not exists idx_work_items_goal      on work_items(goal);
create index if not exists idx_annual_plan_user     on annual_plan(user_name, year);
