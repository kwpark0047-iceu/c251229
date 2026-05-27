/* Migration: Add Naver enrichment columns to leads */
ALTER TABLE leads
  ADD COLUMN homepage_url TEXT,
  ADD COLUMN blog_url TEXT,
  ADD COLUMN email TEXT,
  ADD COLUMN naver_place_id TEXT;
