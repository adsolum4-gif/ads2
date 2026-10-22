-- Rank of appearance = exact daily task number (e.g. 15 → special on 15/60, not done+15).

CREATE OR REPLACE FUNCTION public.negative_user_activate_window(p_user_id uuid)
 RETURNS public.negative_users
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.negative_users%ROWTYPE;
  v_done int;
  v_total int;
  v_task int;
  v_hold numeric;
  v_slots jsonb;
  v_splits jsonb;
BEGIN
  SELECT * INTO v_row FROM public.negative_users WHERE user_id = p_user_id AND is_active IS TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Negative user not found';
  END IF;

  SELECT coalesce(current_number_count, 0), coalesce(total_number_can_play, 0)
    INTO v_done, v_total
  FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;

  v_task := GREATEST(1, coalesce(v_row.rank, 1));

  IF v_total < 1 THEN
    RAISE EXCEPTION 'User has no task appearances left today';
  END IF;
  IF v_task > v_total THEN
    RAISE EXCEPTION 'Rank of appearance % is higher than daily total %', v_task, v_total;
  END IF;
  IF v_done >= v_task THEN
    RAISE EXCEPTION 'Rank of appearance % has already passed (progress %/% today)', v_task, v_done, v_total;
  END IF;

  v_hold := round(
    (v_row.range_min + floor(random() * (v_row.range_max - v_row.range_min + 1)))::numeric,
    2
  );
  v_splits := jsonb_build_array(v_hold);
  v_slots := jsonb_build_array(v_task);

  UPDATE public.negative_users
    SET appearance_slots = v_slots,
        amount_splits = v_splits,
        total_special_amount = v_hold,
        product_amount = v_hold,
        penalty_amount = v_hold,
        scheduled_for_next_reset = false,
        products_hit = 0,
        hold_applied = false,
        held_amount = 0,
        window_start = v_task,
        window_end = v_task
  WHERE user_id = p_user_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$function$;

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

  v_count := LEAST(5, GREATEST(1, FLOOR(COALESCE(p_negative_products, 1))::int));
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

  -- Defer when today is finished, task number already passed, or beyond today's total.
  v_scheduled := v_left < 1 OR v_rank > v_total OR v_rank <= v_done;

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

  IF NOT v_scheduled THEN
    v_row := public.negative_user_activate_window(p_user_id);
  END IF;

  RETURN to_jsonb(v_row) || jsonb_build_object(
    'scheduled_for_next_reset', v_scheduled,
    'message', CASE
      WHEN v_scheduled AND v_left < 1 THEN
        'This user has finished all tasks for today. Scheduled for the next daily reset.'
      WHEN v_scheduled AND v_rank <= v_done THEN
        format(
          'Task %s has already passed (%s/%s done today). Scheduled for the next daily reset.',
          v_rank, v_done, v_total
        )
      WHEN v_scheduled AND v_rank > v_total THEN
        format(
          'Rank of appearance (%s) is higher than today''s total (%s). Scheduled for the next daily reset.',
          v_rank, v_total
        )
      WHEN v_scheduled THEN
        format(
          'Rank of appearance (%s) cannot run today. Scheduled for the next daily reset.',
          v_rank
        )
      ELSE format(
        '%s products on task %s/%s ($%s–$%s).',
        v_count,
        v_row.window_end,
        v_total,
        p_range_min,
        p_range_max
      )
    END
  );
END;
$function$;
