
CREATE TABLE public.email_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url text DEFAULT 'https://todaviqzeylccmyduomt.supabase.co/storage/v1/object/public/email-assets/colab-wordmark.svg',
  brand_name text DEFAULT 'Colab',
  primary_color text DEFAULT '#18181b',
  button_radius text DEFAULT '12px',
  footer_text text DEFAULT '— The Colab Team',
  support_email text DEFAULT 'support@letscolab.in',
  signup_heading text DEFAULT 'Welcome aboard 👋',
  signup_body text DEFAULT 'You''re one step away from creating with Colab. Confirm your email to get started.',
  signup_button text DEFAULT 'Get Started',
  recovery_heading text DEFAULT 'Reset your password',
  recovery_body text DEFAULT 'We got a request to reset your password. Click below to choose a new one.',
  recovery_button text DEFAULT 'Reset Password',
  magiclink_heading text DEFAULT 'Sign in to Colab',
  magiclink_body text DEFAULT 'Click below to log in. This link expires shortly, so use it soon.',
  magiclink_button text DEFAULT 'Sign In',
  welcome_heading text DEFAULT 'Welcome to Colab!',
  welcome_body text DEFAULT 'You''re now part of a creative community using AI to design amazing visuals.',
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id)
);

ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read email_settings"
  ON public.email_settings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert email_settings"
  ON public.email_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update email_settings"
  ON public.email_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Insert default row
INSERT INTO public.email_settings (id) VALUES (gen_random_uuid());
