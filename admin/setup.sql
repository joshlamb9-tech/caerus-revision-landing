-- Caerus Revision — Supabase setup
-- Run this in the Supabase SQL editor (https://supabase.com/dashboard)

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
