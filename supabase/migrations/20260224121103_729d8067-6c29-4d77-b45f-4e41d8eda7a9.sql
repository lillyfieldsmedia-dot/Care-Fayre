
-- Enum for user roles
CREATE TYPE public.app_role AS ENUM ('customer', 'agency', 'admin');

-- Enum for CQC ratings
CREATE TYPE public.cqc_rating AS ENUM ('Outstanding', 'Good', 'Requires Improvement', 'Inadequate');

-- Enum for care request status
CREATE TYPE public.request_status AS ENUM ('open', 'accepting_bids', 'accepted', 'closed', 'cancelled');

-- Enum for bid status
CREATE TYPE public.bid_status AS ENUM ('active', 'accepted', 'rejected', 'withdrawn');

-- Enum for job status
CREATE TYPE public.job_status AS ENUM ('active', 'paused', 'completed', 'disputed', 'cancelled');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  postcode TEXT DEFAULT '',
  profile_photo TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Agency profiles
CREATE TABLE public.agency_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  agency_name TEXT NOT NULL,
  cqc_provider_id TEXT DEFAULT '',
  cqc_location_id TEXT DEFAULT '',
  cqc_rating cqc_rating,
  cqc_last_checked TIMESTAMPTZ,
  cqc_verified BOOLEAN NOT NULL DEFAULT false,
  service_area_postcodes TEXT[] DEFAULT '{}',
  service_radius_miles INTEGER NOT NULL DEFAULT 25,
  bio TEXT DEFAULT '',
  website TEXT DEFAULT '',
  insurance_confirmed BOOLEAN NOT NULL DEFAULT false,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  active_jobs_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Care requests
CREATE TABLE public.care_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  postcode TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  care_types TEXT[] NOT NULL DEFAULT '{}',
  hours_per_week INTEGER NOT NULL DEFAULT 1,
  frequency TEXT NOT NULL DEFAULT 'Daily',
  start_date DATE,
  description TEXT DEFAULT '',
  status request_status NOT NULL DEFAULT 'open',
  bid_deadline TIMESTAMPTZ,
  lowest_bid_rate NUMERIC(10,2),
  winning_bid_id UUID,
  bids_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bids
CREATE TABLE public.bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  care_request_id UUID REFERENCES public.care_requests(id) ON DELETE CASCADE NOT NULL,
  bidder_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  agency_profile_id UUID REFERENCES public.agency_profiles(id) ON DELETE CASCADE NOT NULL,
  hourly_rate NUMERIC(10,2) NOT NULL,
  notes TEXT DEFAULT '',
  status bid_status NOT NULL DEFAULT 'active',
  distance_miles NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add foreign key for winning_bid after bids table exists
ALTER TABLE public.care_requests ADD CONSTRAINT fk_winning_bid FOREIGN KEY (winning_bid_id) REFERENCES public.bids(id);

-- Jobs
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  care_request_id UUID REFERENCES public.care_requests(id) NOT NULL,
  winning_bid_id UUID REFERENCES public.bids(id) NOT NULL,
  customer_id UUID REFERENCES auth.users(id) NOT NULL,
  agency_id UUID REFERENCES auth.users(id) NOT NULL,
  agency_profile_id UUID REFERENCES public.agency_profiles(id) NOT NULL,
  locked_hourly_rate NUMERIC(10,2) NOT NULL,
  agreed_hours_per_week INTEGER NOT NULL,
  start_date DATE,
  status job_status NOT NULL DEFAULT 'active',
  total_paid_to_date NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  related_request_id UUID REFERENCES public.care_requests(id),
  related_job_id UUID REFERENCES public.jobs(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- App settings (single row)
CREATE TABLE public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_bid_decrement NUMERIC(10,2) NOT NULL DEFAULT 1,
  platform_fee_pct NUMERIC(5,2) NOT NULL DEFAULT 10,
  bid_window_hours INTEGER NOT NULL DEFAULT 72,
  max_radius_miles INTEGER NOT NULL DEFAULT 25,
  cqc_api_base TEXT NOT NULL DEFAULT 'https://api.service.cqc.org.uk/public/v1',
  notification_email TEXT NOT NULL DEFAULT 'hello@carematch.co.uk'
);

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_agency_profiles_updated_at BEFORE UPDATE ON public.agency_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_care_requests_updated_at BEFORE UPDATE ON public.care_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- PROFILES RLS
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- USER ROLES RLS
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own role on signup" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- AGENCY PROFILES RLS
CREATE POLICY "Anyone authenticated can view agency profiles" ON public.agency_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Agency can update own profile" ON public.agency_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Agency can insert own profile" ON public.agency_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- CARE REQUESTS RLS
CREATE POLICY "Authenticated users can view open requests" ON public.care_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Customers can create requests" ON public.care_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update own requests" ON public.care_requests FOR UPDATE TO authenticated USING (auth.uid() = creator_id);

-- BIDS RLS
CREATE POLICY "Request creator and bidder can view bids" ON public.bids FOR SELECT TO authenticated
  USING (auth.uid() = bidder_id OR auth.uid() = (SELECT creator_id FROM public.care_requests WHERE id = care_request_id));
CREATE POLICY "Agencies can place bids" ON public.bids FOR INSERT TO authenticated WITH CHECK (auth.uid() = bidder_id);
CREATE POLICY "Bidder can update own bid" ON public.bids FOR UPDATE TO authenticated USING (auth.uid() = bidder_id);

-- JOBS RLS
CREATE POLICY "Job parties can view their jobs" ON public.jobs FOR SELECT TO authenticated
  USING (auth.uid() = customer_id OR auth.uid() = agency_id);
CREATE POLICY "System can create jobs" ON public.jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Job parties can update" ON public.jobs FOR UPDATE TO authenticated
  USING (auth.uid() = customer_id OR auth.uid() = agency_id);

-- NOTIFICATIONS RLS
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = recipient_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = recipient_id);
CREATE POLICY "Authenticated can create notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

-- APP SETTINGS RLS (read-only for all authenticated, admin can update via has_role)
CREATE POLICY "Authenticated can read settings" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can update settings" ON public.app_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Insert default app settings
INSERT INTO public.app_settings (min_bid_decrement, platform_fee_pct, bid_window_hours, max_radius_miles) VALUES (1, 10, 72, 25);
