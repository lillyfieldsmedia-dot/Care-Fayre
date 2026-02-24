
-- Fix overly permissive notifications INSERT policy
DROP POLICY "Authenticated can create notifications" ON public.notifications;
CREATE POLICY "Authenticated can create notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = recipient_id OR public.has_role(auth.uid(), 'admin'));
