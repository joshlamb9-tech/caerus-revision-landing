-- Caerus Revision — Supabase setup
-- Run this in the Supabase SQL editor (https://supabase.com/dashboard)
-- Last updated: 2026-03-03 — added access_grants for paid users

-- 1. Page views
CREATE TABLE IF NOT EXISTS page_views (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page        TEXT NOT NULL,
  referrer    TEXT,
  session_id  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert" ON page_views
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "auth_select" ON page_views
  FOR SELECT TO authenticated USING (true);

-- 2. Contact submissions
CREATE TABLE IF NOT EXISTS contact_submissions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT,
  email       TEXT,
  school      TEXT,
  subject     TEXT,
  message     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert" ON contact_submissions
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "auth_select" ON contact_submissions
  FOR SELECT TO authenticated USING (true);

-- 3. User mastery progress (SRS sync)
CREATE TABLE IF NOT EXISTS user_progress (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product    TEXT NOT NULL DEFAULT 'latin',
  word_id    TEXT NOT NULL,
  score      INT NOT NULL DEFAULT 0,
  correct    INT NOT NULL DEFAULT 0,
  seen       INT NOT NULL DEFAULT 0,
  last_seen  BIGINT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product, word_id)
);

ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Users can read and write their own progress
CREATE POLICY "user_own_progress" ON user_progress
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Access grants (paid user access)
CREATE TABLE IF NOT EXISTS access_grants (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                 UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email                   TEXT NOT NULL,
  product                 TEXT NOT NULL DEFAULT 'latin',
  stripe_customer_id      TEXT,
  stripe_payment_intent   TEXT,
  valid_until             TIMESTAMPTZ NOT NULL,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product)
);

ALTER TABLE access_grants ENABLE ROW LEVEL SECURITY;

-- Users can read their own grant (needed for the login wall check)
CREATE POLICY "user_read_own" ON access_grants
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Only Edge Function (service role) can write grants
CREATE POLICY "service_write" ON access_grants
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "service_update" ON access_grants
  FOR UPDATE TO service_role USING (true);

-- Admin can read all
CREATE POLICY "auth_select_all" ON access_grants
  FOR SELECT TO authenticated USING (true);
