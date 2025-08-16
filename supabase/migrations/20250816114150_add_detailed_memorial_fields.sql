-- supabase/migrations/YYYYMMDDHHMMSS_add_detailed_memorial_fields.sql

ALTER TABLE public.memorials
ADD COLUMN date_of_birth DATE,
ADD COLUMN place_of_birth TEXT,
ADD COLUMN place_of_death TEXT,
ADD COLUMN nationality TEXT,
-- Using JSONB to store structured data like [{"url": "...", "title": "..."}] which is more AI-friendly.
ADD COLUMN sources JSONB DEFAULT '[]'::jsonb,
ADD COLUMN images JSONB DEFAULT '[]'::jsonb;
