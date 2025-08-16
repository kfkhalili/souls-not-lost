-- supabase/migrations/YYYYMMDDHHMMSS_remove_redundant_image_url_column.sql

ALTER TABLE public.memorials
DROP COLUMN IF EXISTS image_url;