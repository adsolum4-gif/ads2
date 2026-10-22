-- Special tasks: pick N active catalog SKUs whose prices sum to balance + admin range.
-- Modal shows real product prices; on-hold = max(0, sum - balance). No random hold or synthetic line splits.

DROP FUNCTION IF EXISTS public.pick_special_product_bundle(uuid, uuid, numeric, integer);

CREATE OR REPLACE FUNCTION public.special_product_name_allowed(p_balance numeric, p_name text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
AS $$
  SELECT round(coalesce(p_balance, 0), 2) >= 18000
    OR coalesce(p_name, '') !~* '(tesla|mercedes-benz|bmw i7|audi e-tron|porsche taycan|lamborghini|ferrari|bentley continental|rolls-royce|range rover)';
$$;

CREATE OR REPLACE FUNCTION public.pick_special_product_bundle(
  p_user_id uuid,
  p_exclude_game uuid,
  p_balance numeric,
  p_range_min integer,
  p_range_max integer,
  p_n integer
)
 RETURNS uuid[]
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_n int := LEAST(5, GREATEST(1, COALESCE(p_n, 1)));
  v_lo numeric := round(coalesce(p_balance, 0) + coalesce(p_range_min, 0), 2);
  v_hi numeric := round(coalesce(p_balance, 0) + coalesce(p_range_max, 0), 2);
  v_ids uuid[];
  v_sum numeric;
  v_attempt int;
  v_cand uuid[];
BEGIN
  IF v_lo > v_hi THEN
    RAISE EXCEPTION 'Invalid special product range';
  END IF;

  IF v_n = 1 THEN
    SELECT array_agg(id ORDER BY id) INTO v_ids FROM (
      SELECT pr.id
      FROM public.products pr
      WHERE pr.is_active IS TRUE
        AND pr.id NOT IN (SELECT public.special_product_ids_in_use(p_exclude_game))
        AND pr.id NOT IN (SELECT public.special_product_ids_issued_to_user(p_user_id, p_exclude_game))
        AND public.special_product_name_allowed(p_balance, pr.name)
        AND round(coalesce(pr.price, 0), 2) BETWEEN v_lo AND v_hi
      ORDER BY random()
      LIMIT 1
    ) s;
    RETURN v_ids;
  END IF;

  IF v_n = 2 THEN
    SELECT ARRAY[p1.id, p2.id] INTO v_ids
    FROM public.products p1
    JOIN public.products p2 ON p1.id < p2.id
    WHERE p1.is_active AND p2.is_active
      AND p1.id NOT IN (SELECT public.special_product_ids_in_use(p_exclude_game))
      AND p2.id NOT IN (SELECT public.special_product_ids_in_use(p_exclude_game))
      AND p1.id NOT IN (SELECT public.special_product_ids_issued_to_user(p_user_id, p_exclude_game))
      AND p2.id NOT IN (SELECT public.special_product_ids_issued_to_user(p_user_id, p_exclude_game))
      AND public.special_product_name_allowed(p_balance, p1.name)
      AND public.special_product_name_allowed(p_balance, p2.name)
      AND round(coalesce(p1.price, 0) + coalesce(p2.price, 0), 2) BETWEEN v_lo AND v_hi
    ORDER BY random()
    LIMIT 1;
    RETURN v_ids;
  END IF;

  IF v_n = 3 THEN
    SELECT ARRAY[a.id, b.id, c.id] INTO v_ids
    FROM public.products a
    JOIN public.products b ON a.id < b.id
    JOIN public.products c ON b.id < c.id
    WHERE a.is_active AND b.is_active AND c.is_active
      AND a.id NOT IN (SELECT public.special_product_ids_in_use(p_exclude_game))
      AND b.id NOT IN (SELECT public.special_product_ids_in_use(p_exclude_game))
      AND c.id NOT IN (SELECT public.special_product_ids_in_use(p_exclude_game))
      AND a.id NOT IN (SELECT public.special_product_ids_issued_to_user(p_user_id, p_exclude_game))
      AND b.id NOT IN (SELECT public.special_product_ids_issued_to_user(p_user_id, p_exclude_game))
      AND c.id NOT IN (SELECT public.special_product_ids_issued_to_user(p_user_id, p_exclude_game))
      AND public.special_product_name_allowed(p_balance, a.name)
      AND public.special_product_name_allowed(p_balance, b.name)
      AND public.special_product_name_allowed(p_balance, c.name)
      AND round(coalesce(a.price, 0) + coalesce(b.price, 0) + coalesce(c.price, 0), 2) BETWEEN v_lo AND v_hi
    ORDER BY random()
    LIMIT 1;
    RETURN v_ids;
  END IF;

  FOR v_attempt IN 1..800 LOOP
    SELECT array_agg(id) INTO v_cand FROM (
      SELECT pr.id
      FROM public.products pr
      WHERE pr.is_active IS TRUE
        AND pr.id NOT IN (SELECT public.special_product_ids_in_use(p_exclude_game))
        AND pr.id NOT IN (SELECT public.special_product_ids_issued_to_user(p_user_id, p_exclude_game))
        AND public.special_product_name_allowed(p_balance, pr.name)
      ORDER BY random()
      LIMIT v_n
    ) pick;
    IF COALESCE(array_length(v_cand, 1), 0) <> v_n THEN
      CONTINUE;
    END IF;
    SELECT round(coalesce(sum(price), 0), 2) INTO v_sum FROM public.products WHERE id = ANY(v_cand);
    IF v_sum BETWEEN v_lo AND v_hi THEN
      RETURN v_cand;
    END IF;
  END LOOP;

  RETURN NULL;
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
  v_task int;
  v_slots jsonb;
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

  v_slots := jsonb_build_array(v_task);

  UPDATE public.negative_users
    SET appearance_slots = v_slots,
        amount_splits = '[]'::jsonb,
        total_special_amount = NULL,
        product_amount = 0,
        penalty_amount = 0,
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

CREATE OR REPLACE FUNCTION public.ensure_current_game()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_game public.games%ROWTYPE;
  v_prof public.profiles%ROWTYPE;
  v_wallet public.wallets%ROWTYPE;
  v_pack public.packs%ROWTYPE;
  v_settings public.settings%ROWTYPE;
  v_neg public.negative_users%ROWTYPE;
  v_products jsonb;
  v_ids uuid[];
  v_amount numeric;
  v_commission numeric;
  v_special boolean := false;
  v_hold numeric := 0;
  v_count int := 0;
  v_has_game boolean := false;
  v_next int;
  v_slot boolean := false;
  v_pic int := 1;
  v_rate numeric;
  v_range_min int;
  v_range_max int;
  v_wrong_pool boolean := false;
  v_remaining numeric := 0;
  v_existing_special boolean := false;
  v_has_special_catalog boolean := false;
  v_n_specials int := 0;
  v_band_lo numeric := 0;
  v_band_hi numeric := 0;
  v_exclude_game uuid;
  v_balance numeric := 0;
  v_product_total numeric := 0;
  v_pending_uncleared_special boolean := false;
  v_freeze_pending_special boolean := false;
  v_on_hold_negative boolean := false;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM public.ensure_daily_reset();
  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid;
  IF NOT v_prof.is_active THEN RAISE EXCEPTION 'Account is inactive'; END IF;
  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = v_uid;
  v_balance := round(coalesce(v_wallet.balance, 0), 2);
  v_on_hold_negative := coalesce(v_wallet.on_hold, 0) <= -0.01;

  SELECT * INTO v_game FROM public.games WHERE user_id = v_uid AND pending = true ORDER BY created_at DESC LIMIT 1;
  v_has_game := FOUND;
  v_existing_special := v_has_game AND (
    coalesce(v_game.special_product, false) IS TRUE
    OR coalesce(v_game.penalty_hold, 0) > 0
  );
  v_pending_uncleared_special := v_existing_special OR (v_on_hold_negative AND v_has_game);
  PERFORM public.assert_review_sets_not_exhausted(v_uid, v_prof, v_pending_uncleared_special);
  v_exclude_game := CASE WHEN v_has_game THEN v_game.id ELSE NULL END;

  IF v_on_hold_negative AND NOT v_has_game THEN
    RAISE EXCEPTION 'You have a pending transaction, please clear it to proceed.';
  END IF;

  SELECT * INTO v_pack FROM public.resolve_user_pack(v_uid);
  SELECT * INTO v_settings FROM public.settings WHERE id = 1;
  IF v_prof.current_number_count >= v_prof.total_number_can_play
     AND NOT v_pending_uncleared_special THEN
    RAISE EXCEPTION 'You have completed all tasks for today';
  END IF;
  IF coalesce(v_settings.minimum_balance_for_submissions, 0) > 0
     AND NOT v_prof.is_min_balance_for_submission_removed
     AND NOT v_pending_uncleared_special
     AND v_wallet.balance < v_settings.minimum_balance_for_submissions THEN
    RAISE EXCEPTION 'Minimum balance required for submissions';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.products WHERE is_active IS TRUE
  ) INTO v_has_special_catalog;

  v_next := GREATEST(coalesce(v_prof.current_number_count, 0), 0) + 1;

  SELECT * INTO v_neg
  FROM public.negative_users
  WHERE user_id = v_uid AND is_active IS TRUE AND coalesce(scheduled_for_next_reset, false) IS NOT TRUE;

  IF FOUND AND NOT v_pending_uncleared_special AND NOT v_on_hold_negative THEN
    IF coalesce(v_neg.products_hit, 0) < 1 THEN
      SELECT EXISTS (
        SELECT 1 FROM jsonb_array_elements(coalesce(v_neg.appearance_slots, '[]'::jsonb)) s(val)
        WHERE COALESCE((s.val #>> '{}')::int, (s.val->>'n')::int) = v_next
      ) INTO v_slot;
      IF v_slot THEN
        v_special := true;
        v_pic := LEAST(5, GREATEST(1, coalesce(v_neg.number_of_negative_products, 1)));
        v_range_min := v_neg.range_min;
        v_range_max := v_neg.range_max;
        v_band_lo := round(v_balance + coalesce(v_range_min, 0), 2);
        v_band_hi := round(v_balance + coalesce(v_range_max, 0), 2);
      END IF;
    END IF;
  END IF;

  IF v_special AND NOT v_has_special_catalog THEN
    RAISE EXCEPTION 'No active products available for special tasks';
  END IF;

  IF v_has_game THEN
    SELECT count(*) INTO v_count FROM public.game_products WHERE game_id = v_game.id;
    IF v_existing_special THEN
      v_special := true;
      IF v_neg.id IS NULL THEN
        SELECT * INTO v_neg
        FROM public.negative_users
        WHERE user_id = v_uid AND is_active IS TRUE AND coalesce(scheduled_for_next_reset, false) IS NOT TRUE;
      END IF;
      v_pic := LEAST(5, GREATEST(1, coalesce(v_neg.number_of_negative_products, v_count, 1)));
      v_amount := round(coalesce(v_game.amount, 0), 2);
      v_hold := round(coalesce(v_game.penalty_hold, 0), 2);
      IF v_neg.id IS NOT NULL THEN
        v_range_min := v_neg.range_min;
        v_range_max := v_neg.range_max;
        v_band_lo := round(v_balance + coalesce(v_range_min, 0), 2);
        v_band_hi := round(v_balance + coalesce(v_range_max, 0), 2);
      END IF;
      IF NOT v_has_special_catalog THEN
        v_wrong_pool := true;
      END IF;
      IF v_count <> v_pic THEN
        v_wrong_pool := true;
      END IF;
      SELECT round(coalesce(sum(pr.price), 0), 2) INTO v_product_total
      FROM public.game_products gp
      JOIN public.products pr ON pr.id = gp.product_id
      WHERE gp.game_id = v_game.id;
      IF abs(v_product_total - v_amount) > 0.02 THEN
        v_wrong_pool := true;
      END IF;
      IF EXISTS (
        SELECT 1 FROM public.game_products gp
        WHERE gp.game_id = v_game.id
          AND gp.product_id IN (
            SELECT public.special_product_ids_issued_to_user(v_uid, v_game.id)
          )
      ) THEN
        v_wrong_pool := true;
      END IF;
      IF v_range_min IS NOT NULL AND v_range_max IS NOT NULL THEN
        IF v_product_total > v_band_hi + 0.01 OR v_product_total < v_band_lo - 0.01 THEN
          v_wrong_pool := true;
        END IF;
      END IF;
    ELSE
      IF coalesce(v_game.special_product, false) IS TRUE AND NOT v_special THEN
        v_wrong_pool := true;
      END IF;
      IF v_special THEN
        IF NOT v_has_special_catalog THEN
          v_wrong_pool := true;
        END IF;
        IF v_count <> v_pic THEN v_wrong_pool := true; END IF;
        SELECT round(coalesce(sum(pr.price), 0), 2) INTO v_product_total
        FROM public.game_products gp
        JOIN public.products pr ON pr.id = gp.product_id
        WHERE gp.game_id = v_game.id;
        IF v_range_min IS NOT NULL AND v_range_max IS NOT NULL THEN
          v_band_lo := round(v_balance + coalesce(v_range_min, 0), 2);
          v_band_hi := round(v_balance + coalesce(v_range_max, 0), 2);
          IF v_product_total > v_band_hi + 0.01 OR v_product_total < v_band_lo - 0.01 THEN
            v_wrong_pool := true;
          END IF;
        END IF;
      ELSE
        SELECT EXISTS (
          SELECT 1 FROM public.game_products gp
          JOIN public.products pr ON pr.id = gp.product_id
          WHERE gp.game_id = v_game.id AND pr.is_special IS TRUE
        ) INTO v_wrong_pool;
        SELECT round(coalesce(sum(pr.price), 0), 2) INTO v_product_total
        FROM public.game_products gp
        JOIN public.products pr ON pr.id = gp.product_id
        WHERE gp.game_id = v_game.id;
        IF v_product_total > v_balance THEN
          v_wrong_pool := true;
        END IF;
        IF round(coalesce(v_game.amount, 0), 2) > v_balance THEN
          v_wrong_pool := true;
        END IF;
      END IF;
    END IF;
  END IF;

  IF v_special AND v_has_game AND v_count > 0 THEN
    IF EXISTS (
      SELECT 1 FROM public.game_products gp
      WHERE gp.game_id = v_game.id
        AND gp.product_id IN (SELECT public.special_product_ids_in_use(v_exclude_game))
    ) THEN
      v_wrong_pool := true;
    END IF;
  END IF;

  IF v_existing_special AND v_count > 0 AND NOT v_wrong_pool THEN
    v_freeze_pending_special := true;
  END IF;

  IF v_on_hold_negative AND v_has_game AND v_count > 0 THEN
    v_freeze_pending_special := true;
  END IF;

  IF v_on_hold_negative AND NOT v_freeze_pending_special THEN
    RAISE EXCEPTION 'You have a pending transaction, please clear it to proceed.';
  END IF;

  IF NOT v_freeze_pending_special
     AND (NOT v_has_game OR v_count = 0 OR v_count <> v_pic OR v_wrong_pool
     OR (v_special IS TRUE AND coalesce(v_game.special_product, false) IS NOT TRUE
         AND coalesce(v_game.penalty_hold, 0) <= 0)) THEN
    IF v_special THEN
      IF v_range_min IS NULL OR v_range_max IS NULL THEN
        RAISE EXCEPTION 'Special product range not configured';
      END IF;
      v_band_lo := round(v_balance + v_range_min, 2);
      v_band_hi := round(v_balance + v_range_max, 2);
      v_ids := public.pick_special_product_bundle(
        v_uid, v_exclude_game, v_balance, v_range_min, v_range_max, v_pic
      );
      IF v_ids IS NULL OR COALESCE(array_length(v_ids, 1), 0) <> v_pic THEN
        RAISE EXCEPTION 'No product combination found for special task';
      END IF;
      SELECT round(coalesce(sum(price), 0), 2) INTO v_amount FROM public.products WHERE id = ANY(v_ids);
      v_hold := GREATEST(round(v_amount - v_balance, 2), 0);
    ELSE
      SELECT array_agg(id) INTO v_ids FROM (
        SELECT id
        FROM public.products
        WHERE is_active
          AND coalesce(is_special, false) IS NOT TRUE
          AND round(coalesce(price, 0), 2) <= v_balance
        ORDER BY random()
        LIMIT v_pic
      ) s;
    END IF;
    IF v_ids IS NULL THEN
      RAISE EXCEPTION 'No products available within your balance';
    END IF;

    IF NOT v_special THEN
      IF EXISTS (
        SELECT 1 FROM public.products pr
        WHERE pr.id = ANY(v_ids) AND coalesce(pr.is_special, false) IS TRUE
      ) THEN
        RAISE EXCEPTION 'Special products cannot be assigned to regular tasks';
      END IF;
    END IF;

    IF NOT v_special THEN
      SELECT coalesce(sum(price), 0) INTO v_amount FROM public.products WHERE id = ANY(v_ids);
      v_amount := round(v_amount, 2);
      IF v_amount > v_balance THEN
        RAISE EXCEPTION 'Task amount exceeds available balance';
      END IF;
      v_commission := round(v_amount * coalesce(v_pack.profit_percentage, 0.5) / 100.0, 2);
    ELSIF v_existing_special AND NOT v_wrong_pool THEN
      v_commission := v_game.commission;
      v_amount := round(coalesce(v_game.amount, 0), 2);
      v_hold := round(coalesce(v_game.penalty_hold, 0), 2);
    ELSE
      v_rate := GREATEST(coalesce(v_pack.profit_percentage, 0.5) * coalesce(v_pack.grouped_multiplier, 10), 5);
      v_commission := round(v_amount * v_rate / 100.0, 2);
    END IF;

    IF NOT v_has_game THEN
      INSERT INTO public.games (user_id, amount, commission, pending, special_product, rating_no, penalty_hold)
      VALUES (v_uid, v_amount, v_commission, true, v_special, 5, CASE WHEN v_special THEN coalesce(v_hold, 0) ELSE 0 END)
      RETURNING * INTO v_game;
    ELSE
      UPDATE public.games
        SET amount = v_amount,
            commission = v_commission,
            special_product = v_special,
            rating_no = coalesce(v_game.rating_no, 5),
            penalty_hold = CASE WHEN v_special THEN coalesce(v_hold, 0) ELSE 0 END
      WHERE id = v_game.id
      RETURNING * INTO v_game;
      DELETE FROM public.game_products WHERE game_id = v_game.id;
    END IF;

    INSERT INTO public.game_products (game_id, product_id)
    SELECT v_game.id, unnest(v_ids);
  ELSE
    IF v_special AND NOT v_existing_special THEN
      v_rate := GREATEST(coalesce(v_pack.profit_percentage, 0.5) * coalesce(v_pack.grouped_multiplier, 10), 5);
      SELECT round(coalesce(sum(pr.price), 0), 2) INTO v_amount
      FROM public.game_products gp
      JOIN public.products pr ON pr.id = gp.product_id
      WHERE gp.game_id = v_game.id;
      v_hold := GREATEST(round(v_amount - v_balance, 2), coalesce(v_game.penalty_hold, 0));
      v_commission := round(v_amount * v_rate / 100.0, 2);
      UPDATE public.games
        SET special_product = true,
            penalty_hold = coalesce(v_hold, v_game.penalty_hold, 0),
            amount = v_amount,
            commission = v_commission
      WHERE id = v_game.id
      RETURNING * INTO v_game;
    ELSIF NOT v_special THEN
      SELECT round(coalesce(sum(pr.price), 0), 2) INTO v_product_total
      FROM public.game_products gp
      JOIN public.products pr ON pr.id = gp.product_id
      WHERE gp.game_id = v_game.id;
      IF v_product_total > v_balance OR round(coalesce(v_game.amount, 0), 2) > v_balance THEN
        v_wrong_pool := true;
      END IF;
      IF v_wrong_pool THEN
        RETURN public.ensure_current_game();
      END IF;
      v_commission := round(v_game.amount * coalesce(v_pack.profit_percentage, 0.5) / 100.0, 2);
      UPDATE public.games
        SET special_product = false,
            penalty_hold = 0,
            commission = v_commission
      WHERE id = v_game.id
      RETURNING * INTO v_game;
    END IF;
  END IF;

  IF coalesce(v_game.special_product, false) AND NOT v_special AND NOT v_pending_uncleared_special THEN
    UPDATE public.games
      SET special_product = false, penalty_hold = 0
      WHERE id = v_game.id;
    DELETE FROM public.game_products WHERE game_id = v_game.id;
    RETURN public.ensure_current_game();
  END IF;

  IF v_freeze_pending_special THEN
    IF coalesce(v_game.special_product, false) OR coalesce(v_game.penalty_hold, 0) > 0 THEN
      v_special := true;
    END IF;
    UPDATE public.games
      SET special_product = coalesce(v_game.special_product, v_special),
          pending = true
      WHERE id = v_game.id
      RETURNING * INTO v_game;
  END IF;

  IF NOT coalesce(v_game.special_product, false) THEN
    IF NOT v_on_hold_negative THEN
      SELECT round(coalesce(sum(pr.price), 0), 2) INTO v_product_total
      FROM public.game_products gp
      JOIN public.products pr ON pr.id = gp.product_id
      WHERE gp.game_id = v_game.id;
      IF v_product_total > v_balance OR round(coalesce(v_game.amount, 0), 2) > v_balance THEN
        RAISE EXCEPTION 'Task amount exceeds available balance';
      END IF;
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.game_products gp
      JOIN public.products pr ON pr.id = gp.product_id
      WHERE gp.game_id = v_game.id AND coalesce(pr.is_special, false) IS TRUE
    ) THEN
      RAISE EXCEPTION 'Special products cannot be assigned to regular tasks';
    END IF;
  END IF;

  IF v_special
     AND coalesce(v_hold, 0) > 0
     AND v_neg.id IS NOT NULL
     AND NOT v_freeze_pending_special
     AND (
       coalesce(v_neg.hold_applied, false) IS NOT TRUE
       OR abs(coalesce(v_wallet.on_hold, 0) + v_hold) > 0.05
     ) THEN
    UPDATE public.wallets
      SET on_hold = -abs(v_hold), updated_at = now()
      WHERE user_id = v_uid;
    UPDATE public.negative_users
      SET held_amount = abs(v_hold), hold_applied = true
      WHERE id = v_neg.id;
    INSERT INTO public.notifications (user_id, title, message, is_read)
    VALUES (
      v_uid,
      'Special product',
      'You received a special product. Please reach out to customer care for any clarification.',
      false
    );
    SELECT * INTO v_wallet FROM public.wallets WHERE user_id = v_uid;
  END IF;

  IF coalesce(v_game.special_product, false) THEN
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', pr.id,
          'image', pr.image,
          'name', pr.name,
          'price', pr.price
        )
        ORDER BY pr.name
      ),
      '[]'::jsonb
    ) INTO v_products
    FROM public.game_products gp
    JOIN public.products pr ON pr.id = gp.product_id
    WHERE gp.game_id = v_game.id;
  ELSE
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', pr.id,
          'image', pr.image,
          'name', pr.name,
          'price', pr.price
        )
        ORDER BY pr.name
      ),
      '[]'::jsonb
    ) INTO v_products
    FROM public.game_products gp
    JOIN public.products pr ON pr.id = gp.product_id
    WHERE gp.game_id = v_game.id;
  END IF;

  v_remaining := CASE WHEN coalesce(v_wallet.on_hold, 0) < 0 THEN abs(v_wallet.on_hold) ELSE 0 END;

  IF coalesce(v_game.special_product, false) THEN
    v_rate := GREATEST(coalesce(v_pack.profit_percentage, 0.5) * coalesce(v_pack.grouped_multiplier, 10), 5);
  ELSE
    v_rate := coalesce(v_pack.profit_percentage, 0.5);
  END IF;

  RETURN jsonb_build_object(
    'id', v_game.id,
    'products', v_products,
    'amount', v_game.amount,
    'commission', v_game.commission,
    'profit_rate', v_rate,
    'pack_name', v_pack.name,
    'created_at', v_game.created_at,
    'rating_no', v_game.rating_no,
    'pending', v_game.pending,
    'special_product', v_game.special_product,
    'penalty_hold', v_game.penalty_hold,
    'range_min', v_range_min,
    'range_max', v_range_max,
    'top_up_amount', NULLIF(v_remaining, 0),
    'special_clear_amount', CASE WHEN v_game.special_product THEN v_game.penalty_hold ELSE NULL END
  );
END;
$function$;

