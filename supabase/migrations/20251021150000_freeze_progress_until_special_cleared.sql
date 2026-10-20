-- Do not zero task progress at Lagos midnight while a special product is still uncleared.

CREATE OR REPLACE FUNCTION public.ensure_daily_reset()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_today date := (timezone('Africa/Lagos', now()))::date;
  v_reset_rows int := 0;
  v_neg public.negative_users%ROWTYPE;
  v_pending_uncleared_special boolean := false;
  v_on_hold_negative boolean := false;
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.games g
    WHERE g.user_id = v_uid
      AND g.pending IS TRUE
      AND (
        coalesce(g.special_product, false) IS TRUE
        OR coalesce(g.penalty_hold, 0) > 0
      )
  ) INTO v_pending_uncleared_special;

  SELECT EXISTS (
    SELECT 1
    FROM public.wallets w
    WHERE w.user_id = v_uid
      AND coalesce(w.on_hold, 0) <= -0.01
  ) INTO v_on_hold_negative;

  IF v_pending_uncleared_special OR v_on_hold_negative THEN
    UPDATE public.profiles
      SET daily_reset_on = v_today
    WHERE id = v_uid
      AND daily_reset_on IS DISTINCT FROM v_today;
  ELSE
    UPDATE public.profiles
      SET current_number_count = 0,
          today_profit = 0,
          daily_reset_on = v_today
    WHERE id = v_uid
      AND daily_reset_on IS DISTINCT FROM v_today;

    GET DIAGNOSTICS v_reset_rows = ROW_COUNT;
  END IF;

  IF v_reset_rows > 0 AND NOT v_pending_uncleared_special AND NOT v_on_hold_negative THEN
    UPDATE public.negative_users
      SET products_hit = 0, hold_applied = false, held_amount = 0
      WHERE user_id = v_uid AND is_active IS TRUE;

    SELECT * INTO v_neg FROM public.negative_users
      WHERE user_id = v_uid AND is_active IS TRUE AND scheduled_for_next_reset IS TRUE;
    IF FOUND THEN
      PERFORM public.negative_user_activate_window(v_uid);
    END IF;
  END IF;

  DELETE FROM public.notifications
  WHERE user_id = v_uid
    AND created_at < now() - interval '10 days';
END;
$function$;
