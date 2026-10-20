-- Block new tasks while wallet.on_hold is negative; keep pending task frozen across daily reset.

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

  UPDATE public.profiles
    SET current_number_count = 0,
        today_profit = 0,
        daily_reset_on = v_today
  WHERE id = v_uid
    AND daily_reset_on IS DISTINCT FROM v_today;

  GET DIAGNOSTICS v_reset_rows = ROW_COUNT;

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
  v_slice numeric := 0;
  v_pick_target numeric := 0;
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
    SELECT 1 FROM public.products WHERE is_active IS TRUE AND is_special IS TRUE
  ) INTO v_has_special_catalog;

  v_next := GREATEST(coalesce(v_prof.current_number_count, 0), 0) + 1;

  SELECT * INTO v_neg
  FROM public.negative_users
  WHERE user_id = v_uid AND is_active IS TRUE AND coalesce(scheduled_for_next_reset, false) IS NOT TRUE;

  IF FOUND AND NOT v_pending_uncleared_special AND NOT v_on_hold_negative THEN
    v_n_specials := GREATEST(1, coalesce(v_neg.number_of_negative_products, 1));
    IF coalesce(v_neg.products_hit, 0) < v_n_specials THEN
      SELECT EXISTS (
        SELECT 1 FROM jsonb_array_elements(coalesce(v_neg.appearance_slots, '[]'::jsonb)) s(val)
        WHERE COALESCE((s.val #>> '{}')::int, (s.val->>'n')::int) = v_next
      ) INTO v_slot;
      IF v_slot THEN
        v_special := true;
        v_pic := 1;
        SELECT coalesce(
          (
            SELECT (sp.value #>> '{}')::numeric
            FROM jsonb_array_elements(coalesce(v_neg.amount_splits, '[]'::jsonb)) WITH ORDINALITY sp(value, idx)
            JOIN jsonb_array_elements(coalesce(v_neg.appearance_slots, '[]'::jsonb)) WITH ORDINALITY sl(value, idx2)
              ON sp.idx = sl.idx2
            WHERE COALESCE((sl.value #>> '{}')::int, (sl.value->>'n')::int) = v_next
            LIMIT 1
          ),
          0
        ) INTO v_slice;
        v_hold := round(v_slice, 2);
        v_range_min := v_neg.range_min;
        v_range_max := v_neg.range_max;
        IF NOT v_existing_special THEN
          v_pick_target := round(v_balance + v_hold, 2);
        END IF;
      END IF;
    END IF;
  END IF;

  IF v_special AND NOT v_has_special_catalog THEN
    RAISE EXCEPTION 'Special product catalog is not available';
  END IF;

  IF v_has_game THEN
    SELECT count(*) INTO v_count FROM public.game_products WHERE game_id = v_game.id;
    IF v_existing_special THEN
      v_special := true;
      v_pic := 1;
      v_amount := round(coalesce(v_game.amount, 0), 2);
      v_pick_target := v_amount;
      IF v_neg.id IS NULL THEN
        SELECT * INTO v_neg
        FROM public.negative_users
        WHERE user_id = v_uid AND is_active IS TRUE AND coalesce(scheduled_for_next_reset, false) IS NOT TRUE;
      END IF;
      v_hold := round(coalesce(v_game.penalty_hold, 0), 2);
      IF v_neg.id IS NOT NULL THEN
        v_range_min := v_neg.range_min;
        v_range_max := v_neg.range_max;
      END IF;
      IF v_has_special_catalog THEN
        SELECT EXISTS (
          SELECT 1 FROM public.game_products gp
          JOIN public.products pr ON pr.id = gp.product_id
          WHERE gp.game_id = v_game.id AND coalesce(pr.is_special, false) IS NOT TRUE
        ) INTO v_wrong_pool;
      ELSE
        v_wrong_pool := true;
      END IF;
      IF v_count <> 1 THEN
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
    ELSE
      IF coalesce(v_game.special_product, false) IS TRUE AND NOT v_special THEN
        v_wrong_pool := true;
      END IF;
      IF v_special THEN
        IF v_has_special_catalog THEN
          SELECT EXISTS (
            SELECT 1 FROM public.game_products gp
            JOIN public.products pr ON pr.id = gp.product_id
            WHERE gp.game_id = v_game.id AND coalesce(pr.is_special, false) IS NOT TRUE
          ) INTO v_wrong_pool;
        ELSE
          v_wrong_pool := true;
        END IF;
        IF v_count <> 1 THEN v_wrong_pool := true; END IF;
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
      JOIN public.products pr ON pr.id = gp.product_id
      WHERE gp.game_id = v_game.id
        AND coalesce(pr.is_special, false) IS TRUE
        AND gp.product_id IN (SELECT public.special_product_ids_in_use(v_exclude_game))
    ) THEN
      v_wrong_pool := true;
    END IF;
  END IF;

  IF v_pick_target <= 0 AND NOT v_existing_special THEN
    v_pick_target := round(coalesce(v_amount, v_game.amount, 0), 2);
  END IF;
  IF v_special AND NOT v_existing_special AND v_pick_target <= 0 THEN
    v_pick_target := round(v_balance + coalesce(v_hold, 0), 2);
  END IF;

  IF v_existing_special AND v_count > 0 THEN
    SELECT NOT EXISTS (
      SELECT 1 FROM public.game_products gp
      JOIN public.products pr ON pr.id = gp.product_id
      WHERE gp.game_id = v_game.id AND coalesce(pr.is_special, false) IS NOT TRUE
    ) INTO v_freeze_pending_special;
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
      SELECT array_agg(id) INTO v_ids FROM (
        SELECT pr.id
        FROM public.products pr
        WHERE pr.is_active AND pr.is_special IS TRUE
          AND pr.id NOT IN (SELECT public.special_product_ids_in_use(v_exclude_game))
          AND pr.id NOT IN (SELECT public.special_product_ids_issued_to_user(v_uid, v_exclude_game))
        ORDER BY random()
        LIMIT v_pic
      ) s;
      IF v_ids IS NULL THEN
        RAISE EXCEPTION 'No special products available';
      END IF;
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

    IF v_special THEN
      IF EXISTS (
        SELECT 1 FROM public.products pr
        WHERE pr.id = ANY(v_ids) AND coalesce(pr.is_special, false) IS NOT TRUE
      ) THEN
        RAISE EXCEPTION 'Invalid special product assignment';
      END IF;
    ELSE
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
    ELSIF v_existing_special THEN
      v_commission := v_game.commission;
      v_amount := round(coalesce(v_game.amount, 0), 2);
    ELSE
      SELECT round(coalesce(price, 0), 2) INTO v_amount FROM public.products WHERE id = v_ids[1];
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
      SELECT round(coalesce(price, 0), 2) INTO v_amount
      FROM public.products pr
      JOIN public.game_products gp ON gp.product_id = pr.id
      WHERE gp.game_id = v_game.id
      LIMIT 1;
      IF v_amount IS NULL OR v_amount <= 0 THEN
        v_amount := coalesce(v_game.amount, v_pick_target);
      END IF;
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
  ELSIF coalesce(v_game.special_product, false) THEN
    IF EXISTS (
      SELECT 1 FROM public.game_products gp
      JOIN public.products pr ON pr.id = gp.product_id
      WHERE gp.game_id = v_game.id AND coalesce(pr.is_special, false) IS NOT TRUE
    ) THEN
      RAISE EXCEPTION 'Regular products cannot be assigned to special tasks';
    END IF;
  END IF;

  IF v_special
     AND coalesce(v_hold, 0) > 0
     AND v_neg.id IS NOT NULL
     AND coalesce(v_neg.hold_applied, false) IS NOT TRUE
     AND NOT v_existing_special THEN
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

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', pr.id,
        'image', pr.image,
        'name', pr.name,
        'price', pr.price
      )
      ORDER BY random()
    ),
    '[]'::jsonb
  ) INTO v_products
  FROM public.game_products gp
  JOIN public.products pr ON pr.id = gp.product_id
  WHERE gp.game_id = v_game.id;

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
