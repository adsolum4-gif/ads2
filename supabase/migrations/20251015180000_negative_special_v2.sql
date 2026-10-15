-- Negative user v2: N separate special tasks, split amounts, balance + slice pricing, schedule when window too small

ALTER TABLE public.negative_users
  ADD COLUMN IF NOT EXISTS amount_splits jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS total_special_amount numeric,
  ADD COLUMN IF NOT EXISTS scheduled_for_next_reset boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS window_start int,
  ADD COLUMN IF NOT EXISTS window_end int;

CREATE OR REPLACE FUNCTION public.negative_user_build_amount_splits(p_total numeric, p_n integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
  v_n int := GREATEST(1, p_n);
  v_total int := GREATEST(1, round(p_total)::int);
  v_rem int;
  v_part int;
  v_i int;
  v_out jsonb := '[]'::jsonb;
BEGIN
  IF v_n = 1 THEN
    RETURN jsonb_build_array(v_total);
  END IF;
  IF v_total < v_n THEN
    RAISE EXCEPTION 'Total amount % is too small to split across % special products', v_total, v_n;
  END IF;
  v_rem := v_total;
  FOR v_i IN 1..(v_n - 1) LOOP
    v_part := 1 + floor(random() * (v_rem - (v_n - v_i)))::int;
    v_out := v_out || to_jsonb(v_part);
    v_rem := v_rem - v_part;
  END LOOP;
  v_out := v_out || to_jsonb(v_rem);
  RETURN v_out;
END;
$function$;

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
  v_start int;
  v_end int;
  v_window int;
  v_n int;
  v_pick numeric;
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

  v_n := GREATEST(1, coalesce(v_row.number_of_negative_products, 1));
  v_start := v_done + 1;
  v_end := LEAST(v_done + GREATEST(1, coalesce(v_row.rank, 1)), v_total);
  v_window := GREATEST(0, v_end - v_start + 1);

  IF v_window < 1 THEN
    RAISE EXCEPTION 'User has no task appearances left in this window';
  END IF;
  IF v_n > v_window THEN
    RAISE EXCEPTION 'Cannot place % special products in a window of only % tasks (%-%).',
      v_n, v_window, v_start, v_end;
  END IF;

  v_pick := v_row.range_min + floor(random() * (v_row.range_max - v_row.range_min + 1));
  v_splits := public.negative_user_build_amount_splits(v_pick, v_n);

  SELECT coalesce(jsonb_agg(n ORDER BY n), '[]'::jsonb) INTO v_slots
  FROM (
    SELECT n FROM generate_series(v_start, v_end) AS g(n) ORDER BY random() LIMIT v_n
  ) picked;

  UPDATE public.negative_users
    SET appearance_slots = v_slots,
        amount_splits = v_splits,
        total_special_amount = round(v_pick, 2),
        product_amount = round(v_pick, 2),
        penalty_amount = round(v_pick, 2),
        scheduled_for_next_reset = false,
        products_hit = 0,
        hold_applied = false,
        held_amount = 0,
        window_start = v_start,
        window_end = v_end
  WHERE user_id = p_user_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$function$;
