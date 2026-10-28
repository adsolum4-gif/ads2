-- Reject signup OTP when email is already registered (auth or profile).

CREATE OR REPLACE FUNCTION public.send_otp(p_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'extensions', 'auth'
AS $function$
DECLARE
  v_email text := lower(trim(coalesce(p_email, '')));
  v_code text := lpad(floor(random() * 1000000)::int::text, 6, '0');
BEGIN
  IF v_email = '' OR position('@' in v_email) < 2 THEN
    RAISE EXCEPTION 'Please enter a valid email address.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM auth.users u WHERE lower(u.email) = v_email
  ) OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE lower(p.email) = v_email
  ) THEN
    RAISE EXCEPTION 'Email already registered';
  END IF;

  INSERT INTO private.otp_codes(email, code_hash, expires_at, verified)
  VALUES (v_email, extensions.crypt(v_code, extensions.gen_salt('bf')), now() + interval '10 minutes', false)
  ON CONFLICT (email) DO UPDATE
    SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, verified = false;

  RETURN jsonb_build_object('success', true, 'message', 'OTP sent.', 'otp_code', v_code);
END;
$function$;
