-- Allow admins to view all payments
CREATE POLICY "Admins can view all payments"
ON public.payments
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update agency profiles (for verification)
CREATE POLICY "Admins can update agency profiles"
ON public.agency_profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));
