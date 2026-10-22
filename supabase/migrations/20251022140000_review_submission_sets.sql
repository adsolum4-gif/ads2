-- Product review circles: completed full daily runs (e.g. 60/60) count toward review_sets_completed / allowed.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS review_sets_completed integer NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS review_sets_allowed integer;

ALTER TABLE public.packs
  ADD COLUMN IF NOT EXISTS number_of_set integer NOT NULL DEFAULT 1;

UPDATE public.packs SET number_of_set = 1 WHERE number_of_set IS NULL OR number_of_set < 1;

CREATE OR REPLACE FUNCTION public.user_review_sets_allowed(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_allowed int;
  v_override int;
  v_pack_set int;
BEGIN
  SELECT p.review_sets_allowed, pk.number_of_set
    INTO v_override, v_pack_set
  FROM public.profiles p
  LEFT JOIN public.wallets w ON w.user_id = p.id
  LEFT JOIN public.packs pk ON pk.id = w.package_id
  WHERE p.id = p_user_id;
  v_allowed := coalesce(v_override, v_pack_set, 1);
  RETURN GREATEST(v_allowed, 1);
END;
$function$;

CREATE OR REPLACE FUNCTION public.assert_review_sets_not_exhausted(
  p_uid uuid,
  p_prof public.profiles,
  p_pending_special boolean
)
 RETURNS void
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_allowed int;
BEGIN
  IF coalesce(p_pending_special, false) THEN
    RETURN;
  END IF;
  v_allowed := public.user_review_sets_allowed(p_uid);
  IF v_allowed > 0
     AND coalesce(p_prof.review_sets_completed, 0) >= v_allowed
     AND coalesce(p_prof.total_number_can_play, 0) > 0
     AND coalesce(p_prof.current_number_count, 0) >= p_prof.total_number_can_play THEN
    RAISE EXCEPTION 'You have completed all product review sets';
  END IF;
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
    SELECT 1 FROM public.products WHERE is_active IS TRUE AND is_special IS TRUE
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
          -- Review total = wallet balance + on-hold (on-hold stays inside the selected range).
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
      IF v_neg.id IS NULL THEN
        SELECT * INTO v_neg
        FROM public.negative_users
        WHERE user_id = v_uid AND is_active IS TRUE AND coalesce(scheduled_for_next_reset, false) IS NOT TRUE;
      END IF;
      v_pic := LEAST(5, GREATEST(1, coalesce(v_neg.number_of_negative_products, v_count, 1)));
      v_amount := round(coalesce(v_game.amount, 0), 2);
      v_pick_target := v_amount;
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
      IF v_count <> v_pic THEN
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
      -- Stored review total must be balance + a top-up inside the selected range.
      IF v_range_min IS NOT NULL AND v_range_max IS NOT NULL THEN
        IF v_amount > round(v_balance + v_range_max, 2) + 0.01
           OR v_amount < round(v_balance + v_range_min, 2) - 0.01 THEN
          v_wrong_pool := true;
          v_hold := round(
            (v_range_min + floor(random() * (v_range_max - v_range_min + 1)))::numeric,
            2
          );
          v_pick_target := round(v_balance + v_hold, 2);
        END IF;
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
        IF v_count <> v_pic THEN v_wrong_pool := true; END IF;
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

  IF v_existing_special AND v_count > 0 AND NOT v_wrong_pool THEN
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
      IF v_pick_target <= 0 THEN
        v_pick_target := round(v_balance + coalesce(v_hold, 0), 2);
      END IF;
      v_ids := public.pick_special_product_bundle(v_uid, v_exclude_game, v_pick_target, v_pic);
      IF v_ids IS NULL OR COALESCE(array_length(v_ids, 1), 0) <> v_pic THEN
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
    ELSIF v_existing_special AND NOT v_wrong_pool THEN
      v_commission := v_game.commission;
      v_amount := round(coalesce(v_game.amount, 0), 2);
    ELSE
      v_amount := round(v_pick_target, 2);
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
      v_amount := round(coalesce(v_game.amount, v_pick_target, v_balance + coalesce(v_hold, 0)), 2);
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
          'price', round(lines.line_amt, 2)
        )
        ORDER BY g.gp_ord
      ),
      '[]'::jsonb
    ) INTO v_products
    FROM (
      SELECT gp.product_id, row_number() OVER (ORDER BY gp.product_id) AS gp_ord
      FROM public.game_products gp
      WHERE gp.game_id = v_game.id
    ) g
    JOIN public.products pr ON pr.id = g.product_id
    JOIN LATERAL unnest(
      public.special_bundle_amount_lines(
        round(coalesce(v_game.amount, 0), 2),
        (SELECT count(*)::int FROM public.game_products WHERE game_id = v_game.id)
      )
    ) WITH ORDINALITY AS lines(line_amt, line_idx) ON lines.line_idx = g.gp_ord;
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
  v_done int;
  v_total int;
  v_sets_allowed int;
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
      SET products_hit = 1,
          hold_applied = false,
          held_amount = 0
      WHERE user_id = v_uid AND is_active IS TRUE;
  END IF;

  UPDATE public.profiles
    SET current_number_count = current_number_count + 1,
        total_games_played = total_games_played + 1,
        today_profit = today_profit + v_game.commission
    WHERE id = v_uid;

  SELECT current_number_count, total_number_can_play
    INTO v_done, v_total
  FROM public.profiles
  WHERE id = v_uid;
  IF coalesce(v_total, 0) > 0 AND coalesce(v_done, 0) >= v_total THEN
    v_sets_allowed := public.user_review_sets_allowed(v_uid);
    UPDATE public.profiles
      SET review_sets_completed = LEAST(coalesce(review_sets_completed, 0) + 1, GREATEST(v_sets_allowed, 1))
      WHERE id = v_uid
        AND coalesce(review_sets_completed, 0) < GREATEST(v_sets_allowed, 1);
  END IF;

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
    'review_sets_completed', coalesce(p.review_sets_completed, 0),
    'review_sets_allowed', public.user_review_sets_allowed(p.id),
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
        'description', pk.description,
        'number_of_set', coalesce(pk.number_of_set, 1)
      ) END
    ),
    'settings', (SELECT to_jsonb(s) FROM public.settings s WHERE s.id = 1)
  ) INTO result
  FROM public.profiles p
  LEFT JOIN public.wallets w ON w.user_id = p.id
  LEFT JOIN public.packs pk ON pk.id = w.package_id
  WHERE p.id = p_user_id;
  RETURN result;
END;
$function$;

