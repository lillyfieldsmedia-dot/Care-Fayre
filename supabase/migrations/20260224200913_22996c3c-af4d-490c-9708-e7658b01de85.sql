-- Tighten: only authenticated users can insert notifications
DROP POLICY IF EXISTS "Authenticated can create notifications" ON public.notifications;
CREATE POLICY "Authenticated can create notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);