-- Allow authenticated users to create notifications for others (e.g. agency notifying customer)
DROP POLICY IF EXISTS "Authenticated can create notifications" ON public.notifications;
CREATE POLICY "Authenticated can create notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);