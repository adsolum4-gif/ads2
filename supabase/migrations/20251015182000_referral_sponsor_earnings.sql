-- Link new users to a sponsor and pay sponsor share on each referred product submission.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles (id);

CREATE INDEX IF NOT EXISTS profiles_referred_by_idx ON public.profiles (referred_by);

ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS referral_earnings numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.complete_signup(
  p_username text,
  p_phone text,
  p_first_name text,
  p_last_name text,
  p_gender text,
  p_invitation_code text,
  p_transactional_password text,
  p_referral_token text DEFAULT NULL
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_code public.invitation_codes%ROWTYPE;
  v_pack uuid;
  v_bonus numeric;
  v_ref text;
  v_otp private.otp_codes%ROWTYPE;
  v_link public.referral_links%ROWTYPE;
  v_skip boolean := false;
  v_gift text;
  v_used text;
  v_sponsor uuid;
  v_code_text text := trim(coalesce(p_invitation_code, ''));
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  SELECT * INTO v_otp FROM private.otp_codes WHERE email = lower(v_email);
  IF NOT FOUND OR v_otp.verified IS NOT TRUE THEN
    RAISE EXCEPTION 'Email is not verified';
  END IF;

  v_sponsor := NULL;

  IF p_referral_token IS NOT NULL AND length(trim(p_referral_token)) > 0 THEN
    SELECT * INTO v_link FROM public.referral_links WHERE token = trim(p_referral_token);
    IF FOUND AND v_link.used_by IS NULL THEN
      v_skip := true;
    END IF;
  END IF;

  IF NOT v_skip THEN
    IF length(v_code_text) = 0 THEN
      RAISE EXCEPTION 'Invalid invitation or referral code';
    END IF;

    IF v_code_text ~ '^[0-9]{4}$' THEN
      SELECT * INTO v_code FROM public.invitation_codes WHERE upper(code) = upper(v_code_text);
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid invitation code';
      END IF;
      IF v_code.used_by IS NOT NULL AND v_code.reusable IS NOT TRUE THEN
        RAISE EXCEPTION 'Invitation code already used';
      END IF;
      v_used := v_code_text;
      IF v_code.created_by IS NOT NULL AND v_code.created_by <> v_uid THEN
        SELECT p.id INTO v_sponsor
        FROM public.profiles p
        WHERE p.id = v_code.created_by
          AND lower(p.username) <> 'admin';
      END IF;
    ELSE
      SELECT p.id INTO v_sponsor
      FROM public.profiles p
      WHERE upper(p.referral_code) = upper(v_code_text)
        AND lower(p.username) <> 'admin';
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid referral code';
      END IF;
      v_used := upper(v_code_text);
    END IF;
  ELSE
    v_used := 'LINK';
  END IF;

  IF v_sponsor = v_uid THEN
    v_sponsor := NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = p_username) THEN
    RAISE EXCEPTION 'Username already taken';
  END IF;

  v_ref := upper(substring(p_username FROM 1 FOR 4)) || lpad(floor(random()*100000)::int::text, 5, '0');
  SELECT id INTO v_pack FROM public.packs WHERE is_active ORDER BY usd_value ASC LIMIT 1;
  SELECT coalesce(registration_bonus, 0) INTO v_bonus FROM public.settings WHERE id = 1;

  INSERT INTO public.profiles (
    id, username, email, phone_number, first_name, last_name, gender, referral_code,
    invitation_code_used, transactional_password_hash, is_reg_balance_add, total_number_can_play,
    last_connection, referred_by
  ) VALUES (
    v_uid, p_username, v_email, p_phone, p_first_name, p_last_name, p_gender, v_ref,
    v_used, extensions.crypt(p_transactional_password, extensions.gen_salt('bf')), v_bonus > 0,
    coalesce((SELECT daily_missions FROM public.packs WHERE id = v_pack), 40), now(), v_sponsor
  );
  INSERT INTO public.wallets (user_id, balance, package_id) VALUES (v_uid, coalesce(v_bonus, 0), v_pack);
  INSERT INTO public.payments (user_id) VALUES (v_uid);

  IF NOT v_skip AND v_code_text ~ '^[0-9]{4}$' AND v_code.reusable IS NOT TRUE THEN
    UPDATE public.invitation_codes SET used_by = v_uid WHERE id = v_code.id;
  END IF;

  IF v_skip THEN
    UPDATE public.referral_links SET used_by = v_uid, used_at = now() WHERE id = v_link.id;
    LOOP
      v_gift := lpad(floor(random()*10000)::int::text, 4, '0');
      EXIT WHEN v_gift <> '0000' AND NOT EXISTS (SELECT 1 FROM public.invitation_codes WHERE code = v_gift);
    END LOOP;
    INSERT INTO public.invitation_codes (code, created_by, reusable) VALUES (v_gift, v_uid, false);
    INSERT INTO public.notifications (user_id, title, message)
    VALUES (v_uid, 'Your invitation code', 'Your invitation code is ' || v_gift || '. Share it with people you want to invite.');
  ELSE
    INSERT INTO public.notifications (user_id, message)
    VALUES (v_uid, 'Welcome to Adsterra. Your account is ready.');
  END IF;

  RETURN public.get_full_profile(v_uid);
END;
$function$;

CREATE OR REPLACE FUNCTION public.play_game(p_rating_score integer, p_comment text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_game public.games%ROWTYPE;
  v_hold numeric := 0;
  v_sponsor uuid;
  v_sponsor_pct numeric;
  v_sponsor_bonus numeric;
  v_ref_username text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT coalesce(on_hold, 0) INTO v_hold FROM public.wallets WHERE user_id = v_uid;
  IF v_hold <= -0.01 THEN
    RAISE EXCEPTION 'You have a pending transaction, please clear it to proceed.';
  END IF;

  PERFORM public.ensure_current_game();
  SELECT * INTO v_game FROM public.games WHERE user_id = v_uid AND pending = true ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'No pending task'; END IF;

  SELECT coalesce(on_hold, 0) INTO v_hold FROM public.wallets WHERE user_id = v_uid;
  IF v_hold <= -0.01 THEN
    RAISE EXCEPTION 'You have a pending transaction, please clear it to proceed.';
  END IF;

  UPDATE public.games
    SET pending = false, rating_score = p_rating_score, comment = coalesce(p_comment, ''), updated_at = now()
    WHERE id = v_game.id;

  IF coalesce(v_game.special_product, false) IS TRUE THEN
    UPDATE public.negative_users
      SET products_hit = LEAST(
            coalesce(products_hit, 0) + 1,
            GREATEST(1, coalesce(number_of_negative_products, 1))
          ),
          hold_applied = false,
          held_amount = 0
      WHERE user_id = v_uid AND is_active IS TRUE;
  END IF;

  UPDATE public.profiles
    SET current_number_count = current_number_count + 1,
        total_games_played = total_games_played + 1,
        today_profit = today_profit + v_game.commission
    WHERE id = v_uid;
  UPDATE public.wallets
    SET commission = coalesce(commission, 0) + v_game.commission,
        balance = coalesce(balance, 0) + v_game.commission,
        salary = coalesce(salary, 0) + v_game.commission,
        updated_at = now()
    WHERE user_id = v_uid;

  SELECT p.referred_by, p.username
    INTO v_sponsor, v_ref_username
  FROM public.profiles p
  WHERE p.id = v_uid;

  IF v_sponsor IS NOT NULL AND coalesce(v_game.commission, 0) > 0 THEN
    SELECT coalesce(s.percentage_of_sponsors, 0) INTO v_sponsor_pct FROM public.settings s WHERE s.id = 1;
    v_sponsor_bonus := round(v_game.commission * v_sponsor_pct / 100.0, 2);
    IF v_sponsor_bonus > 0 THEN
      UPDATE public.profiles
        SET today_profit = coalesce(today_profit, 0) + v_sponsor_bonus
        WHERE id = v_sponsor;
      UPDATE public.wallets
        SET balance = coalesce(balance, 0) + v_sponsor_bonus,
            commission = coalesce(commission, 0) + v_sponsor_bonus,
            salary = coalesce(salary, 0) + v_sponsor_bonus,
            referral_earnings = coalesce(referral_earnings, 0) + v_sponsor_bonus,
            updated_at = now()
        WHERE user_id = v_sponsor;
      INSERT INTO public.notifications (user_id, title, message, is_read)
      VALUES (
        v_sponsor,
        'Referral earnings',
        format(
          'You earned $%s referral bonus (%s%% of $%s) from %s''s product submission.',
          trim(to_char(v_sponsor_bonus, 'FM999999990.00')),
          trim(to_char(v_sponsor_pct, 'FM999990.##')),
          trim(to_char(v_game.commission, 'FM999999990.00')),
          coalesce(v_ref_username, 'your referral')
        ),
        false
      );
    END IF;
  END IF;

  BEGIN
    RETURN public.ensure_current_game();
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'id', v_game.id, 'pending', false, 'amount', v_game.amount, 'commission', v_game.commission,
      'special_product', v_game.special_product, 'penalty_hold', v_game.penalty_hold, 'products', '[]'::jsonb
    );
  END;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_full_profile(p_user_id uuid DEFAULT auth.uid())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_user_id <> auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT jsonb_build_object(
    'id', p.id,
    'username', p.username,
    'email', p.email,
    'phone_number', p.phone_number,
    'first_name', p.first_name,
    'last_name', p.last_name,
    'gender', p.gender,
    'profile_picture', p.profile_picture,
    'referral_code', p.referral_code,
    'referred_by', p.referred_by,
    'referral_count', (SELECT count(*)::int FROM public.profiles r WHERE r.referred_by = p.id),
    'today_profit', p.today_profit,
    'current_number_count', p.current_number_count,
    'total_number_can_play', p.total_number_can_play,
    'total_games_played', p.total_games_played,
    'total_negative_product_submitted', p.total_negative_product_submitted,
    'active', p.is_active,
    'is_active', p.is_active,
    'is_reg_balance_add', p.is_reg_balance_add,
    'is_min_balance_for_submission_removed', p.is_min_balance_for_submission_removed,
    'last_connection', p.last_connection,
    'created_at', p.created_at,
    'wallet', jsonb_build_object(
      'balance', w.balance,
      'on_hold', w.on_hold,
      'salary', w.salary,
      'commission', w.commission,
      'credit_score', w.credit_score,
      'referral_earnings', coalesce(w.referral_earnings, 0),
      'package', CASE WHEN pk.id IS NULL THEN NULL ELSE jsonb_build_object(
        'id', pk.id,
        'name', pk.name,
        'icon', pk.icon,
        'usd_value', pk.usd_value,
        'daily_missions', pk.daily_missions,
        'daily_withdrawals', pk.daily_withdrawals,
        'profit_percentage', pk.profit_percentage,
        'short_description', pk.short_description,
        'description', pk.description
      ) END
    ),
    'settings', (SELECT to_jsonb(s) FROM public.settings s WHERE s.id = 1)
  ) INTO result
  FROM public.profiles p
  LEFT JOIN public.wallets w ON w.user_id = p.id
  LEFT JOIN LATERAL (
    SELECT *
    FROM public.packs
    WHERE coalesce(is_active, true)
      AND usd_value <= coalesce(w.balance, 0)
    ORDER BY usd_value DESC
    LIMIT 1
  ) pk ON true
  WHERE p.id = p_user_id;
  RETURN result;
END;
$function$;
