-- This schedules a cron job to run the cleanup-images function every day at 3:00 AM UTC.
-- The function is invoked via an HTTP POST request.
SELECT
  cron.schedule(
    'daily-image-cleanup', -- The name of our cron job
    '0 3 * * *', -- 3:00 AM UTC every day
    $$
    SELECT
      net.http_post(
        url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/cleanup-images',
        headers := format('{"Authorization": "Bearer %s", "Content-Type": "application/json"}', 'YOUR_ANON_KEY')::jsonb
      ) AS "request_id";
    $$
  );