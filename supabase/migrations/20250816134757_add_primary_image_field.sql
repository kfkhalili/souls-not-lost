-- supabase/migrations/YYYYMMDDHHMMSS_add_primary_image_field.sql

ALTER TABLE public.memorials
ADD COLUMN primary_image_url TEXT;
