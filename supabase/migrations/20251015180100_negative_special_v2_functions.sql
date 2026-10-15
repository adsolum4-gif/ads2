-- Part 2: admin upsert, daily reset, ensure_current_game, play_game

CREATE OR REPLACE FUNCTION public.admin_upsert_negative_user(
  p_user_id uuid, p_range_min integer, p_range_max integer, p_negative_products integer, p_rank integer
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count int;
  v_rank int;
  v_row public.negative_users%ROWTYPE;
  v_old public.negative_users%ROWTYPE;
  v_done int;
  v_total int;
  v_left int;
  v_level int;
  v_max_rank int;
  v_pack_name text;
  v_scheduled boolean := false;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'Select a user'; END IF;
  IF p_range_min IS NULL OR p_range_max IS NULL OR p_range_min < 1 OR p_range_max < p_range_min THEN
    RAISE EXCEPTION 'Select a valid penalty range';
  END IF;

  v_count := GREATEST(1, FLOOR(COALESCE(p_negative_products, 1))::int);
  v_rank := GREATEST(1, FLOOR(COALESCE(p_rank, 1))::int);

  SELECT coalesce(current_number_count, 0), coalesce(total_number_can_play, 0)
    INTO v_done, v_total
  FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
  v_left := GREATEST(coalesce(v_total, 0) - v_done, 0);

  SELECT coalesce(pk.name, 'VIP 1') INTO v_pack_name
  FROM public.wallets w
  LEFT JOIN public.packs pk ON pk.id = w.package_id
  WHERE w.user_id = p_user_id;
  v_level := GREATEST(1, COALESCE(NULLIF(regexp_replace(coalesce(v_pack_name, 'VIP 1'), '[^0-9]', '', 'g'), '')::int, 1));
  IF v_level > 10 THEN v_level := 10; END IF;
  v_max_rank := 30 + (v_level - 1) * 10;

  IF v_rank > v_max_rank THEN
    RAISE EXCEPTION 'Rank of appearance cannot exceed % for VIP %', v_max_rank, v_level;
  END IF;
  IF v_left < 1 THEN
    RAISE EXCEPTION 'This user has no product appearances left today';
  END IF;

  v_scheduled := v_left < v_rank;

  SELECT * INTO v_old FROM public.negative_users WHERE user_id = p_user_id;
  IF FOUND AND v_old.is_active IS TRUE AND coalesce(v_old.held_amount, 0) <> 0 THEN
    UPDATE public.wallets
      SET on_hold = coalesce(on_hold, 0) + v_old.held_amount, updated_at = now()
      WHERE user_id = p_user_id;
  END IF;

  INSERT INTO public.negative_users (
    user_id, number_of_negative_products, rank, is_active,
    penalty_amount, product_amount, held_amount, range_min, range_max, range_label,
    appearance_slots, amount_splits, total_special_amount, products_hit, hold_applied,
    scheduled_for_next_reset, window_start, window_end
  ) VALUES (
    p_user_id, v_count, v_rank, true,
    0, 0, 0, p_range_min, p_range_max, p_range_min::text || '-' || p_range_max::text,
    '[]'::jsonb, '[]'::jsonb, NULL, 0, false,
    v_scheduled, NULL, NULL
  )
  ON CONFLICT (user_id) DO UPDATE SET
    number_of_negative_products = excluded.number_of_negative_products,
    rank = excluded.rank,
    is_active = true,
    penalty_amount = 0,
    product_amount = 0,
    held_amount = 0,
    range_min = excluded.range_min,
    range_max = excluded.range_max,
    range_label = excluded.range_label,
    appearance_slots = '[]'::jsonb,
    amount_splits = '[]'::jsonb,
    total_special_amount = NULL,
    products_hit = 0,
    hold_applied = false,
    scheduled_for_next_reset = excluded.scheduled_for_next_reset,
    window_start = NULL,
    window_end = NULL
  RETURNING * INTO v_row;

  IF NOT v_scheduled AND v_count > LEAST(v_rank, v_left) THEN
    RAISE EXCEPTION 'Cannot place % special products in a window of only % upcoming tasks.',
      v_count, LEAST(v_rank, v_left);
  END IF;

  IF NOT v_scheduled THEN
    v_row := public.negative_user_activate_window(p_user_id);
  END IF;

  RETURN to_jsonb(v_row) || jsonb_build_object(
    'scheduled_for_next_reset', v_scheduled,
    'message', CASE
      WHEN v_scheduled THEN format(
        'Not enough appearances left today (%s left, rank %s). Scheduled for the next daily reset.',
        v_left, v_rank
      )
      ELSE format(
        'Special products (%s) will appear on tasks %s within window %s-%s. Total amount from range split across appearances.',
        v_count,
        (SELECT string_agg(x::text, ', ' ORDER BY x::int) FROM jsonb_array_elements_text(v_row.appearance_slots) t(x)),
        v_row.window_start,
        v_row.window_end
      )
    END
  );
END;
$function$;

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
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;

  UPDATE public.profiles
    SET current_number_count = 0,
        today_profit = 0,
        daily_reset_on = v_today
  WHERE id = v_uid
    AND daily_reset_on IS DISTINCT FROM v_today;

  GET DIAGNOSTICS v_reset_rows = ROW_COUNT;

  IF v_reset_rows > 0 THEN
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
